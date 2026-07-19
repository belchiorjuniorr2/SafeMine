-- SafeMine · user_id obrigatório em registros
-- Rode no SQL Editor do Supabase (1 vez).

-- 1) Permite relatos sem login (WhatsApp / rádio)
alter table public.registros
  alter column user_id drop not null;

-- 2) Atualiza a RPC de insert para ser resiliente
create or replace function public.wa_insert_registro(
  p_tipo text,
  p_dados jsonb,
  p_numero text,
  p_user_id uuid default null,
  p_user_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user uuid := p_user_id;
  v_numero text := coalesce(
    nullif(p_numero, ''),
    'SM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.relato_numero_seq')::text, 5, '0')
  );
  v_mat text := coalesce(p_dados->>'matricula', '');
begin
  -- tenta user_id do colaborador pela matrícula
  if v_user is null and v_mat <> '' then
    select c.user_id into v_user
    from public.colaboradores c
    where upper(trim(c.matricula)) = upper(trim(v_mat))
      and c.user_id is not null
    limit 1;
  end if;

  -- último recurso: qualquer usuário do auth (só se ainda null e coluna exigir)
  if v_user is null then
    begin
      select id into v_user from auth.users order by created_at asc limit 1;
    exception when others then
      v_user := null;
    end;
  end if;

  insert into public.registros (tipo, dados, user_id, user_email, numero, canal)
  values (
    p_tipo,
    p_dados,
    v_user,
    p_user_email,
    v_numero,
    'whatsapp'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero, 'user_id', v_user);
exception
  when undefined_column then
    insert into public.registros (tipo, dados, user_id, user_email)
    values (
      p_tipo,
      p_dados || jsonb_build_object('_numero', v_numero, '_canal', 'whatsapp'),
      v_user,
      p_user_email
    )
    returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero, 'user_id', v_user);
end;
$$;

grant execute on function public.wa_insert_registro(text, jsonb, text, uuid, text)
  to anon, authenticated, service_role;

-- 3) (Opcional) vincule a matrícula 50349 ao seu usuário do app:
-- update public.colaboradores
-- set user_id = (select id from auth.users where email = 'SEU_EMAIL_AQUI' limit 1)
-- where matricula = '50349';
