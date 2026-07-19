-- SafeMine · corrige gravação do WhatsApp sem service_role
-- Rode no SQL Editor do Supabase (uma vez).

-- 1) Garante tabelas do MVP
create table if not exists public.whatsapp_sessions (
  phone text primary key,
  state text not null default 'need_matricula',
  pending_matricula text,
  user_id uuid,
  nome text,
  matricula text,
  funcao text,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.colaboradores (
  matricula text primary key,
  nome text not null,
  funcao text,
  user_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Colunas extras em registros (se ainda não existirem)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'registros' and column_name = 'numero'
  ) then
    alter table public.registros add column numero text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'registros' and column_name = 'canal'
  ) then
    alter table public.registros add column canal text default 'app';
  end if;
end $$;

create sequence if not exists public.relato_numero_seq;

create or replace function public.next_relato_numero()
returns text
language sql
security definer
set search_path = public
as $$
  select 'SM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.relato_numero_seq')::text, 5, '0');
$$;

grant execute on function public.next_relato_numero() to anon, authenticated, service_role;

-- 3) colunas de rascunho WhatsApp (cross-instance)
alter table public.whatsapp_sessions
  add column if not exists draft_id uuid,
  add column if not exists draft_numero text,
  add column if not exists draft_tipo text,
  add column if not exists draft_summary text;

-- 3b) RPC: upsert sessão (bypassa RLS) + rascunho
create or replace function public.wa_upsert_session(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.whatsapp_sessions as s (
    phone, state, pending_matricula, user_id, nome, matricula, funcao,
    draft_id, draft_numero, draft_tipo, draft_summary,
    updated_at, expires_at
  ) values (
    p->>'phone',
    coalesce(p->>'state', 'need_matricula'),
    p->>'pending_matricula',
    nullif(p->>'user_id', '')::uuid,
    p->>'nome',
    p->>'matricula',
    p->>'funcao',
    nullif(p->>'draft_id', '')::uuid,
    p->>'draft_numero',
    p->>'draft_tipo',
    p->>'draft_summary',
    coalesce((p->>'updated_at')::timestamptz, now()),
    coalesce((p->>'expires_at')::timestamptz, now() + interval '7 days')
  )
  on conflict (phone) do update set
    state = excluded.state,
    pending_matricula = excluded.pending_matricula,
    user_id = excluded.user_id,
    nome = excluded.nome,
    matricula = excluded.matricula,
    funcao = excluded.funcao,
    draft_id = excluded.draft_id,
    draft_numero = excluded.draft_numero,
    draft_tipo = excluded.draft_tipo,
    draft_summary = excluded.draft_summary,
    updated_at = excluded.updated_at,
    expires_at = excluded.expires_at;
end;
$$;

grant execute on function public.wa_upsert_session(jsonb) to anon, authenticated, service_role;

-- 4) RPC: get sessão
create or replace function public.wa_get_session(p_phone text)
returns setof public.whatsapp_sessions
language sql
security definer
set search_path = public
as $$
  select * from public.whatsapp_sessions
  where phone = p_phone
    and expires_at > now()
  limit 1;
$$;

grant execute on function public.wa_get_session(text) to anon, authenticated, service_role;

-- 5) RPC: clear sessão
create or replace function public.wa_clear_session(p_phone text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.whatsapp_sessions where phone = p_phone;
$$;

grant execute on function public.wa_clear_session(text) to anon, authenticated, service_role;

-- 6) RPC: buscar colaborador
create or replace function public.wa_find_colaborador(p_matricula text)
returns table (matricula text, nome text, funcao text, user_id uuid)
language sql
security definer
set search_path = public
as $$
  select c.matricula, c.nome, c.funcao, c.user_id
  from public.colaboradores c
  where upper(trim(c.matricula)) = upper(trim(p_matricula))
    and c.ativo = true
  limit 1;
$$;

grant execute on function public.wa_find_colaborador(text) to anon, authenticated, service_role;

-- 6b) user_id pode ser null (canal WhatsApp)
alter table public.registros alter column user_id drop not null;

-- 7) RPC: inserir relato WhatsApp (bypassa RLS de registros)
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
  if v_user is null and v_mat <> '' then
    select c.user_id into v_user
    from public.colaboradores c
    where upper(trim(c.matricula)) = upper(trim(v_mat))
      and c.user_id is not null
    limit 1;
  end if;

  if v_user is null then
    begin
      select id into v_user from auth.users order by created_at asc limit 1;
    exception when others then
      v_user := null;
    end;
  end if;

  insert into public.registros (tipo, dados, user_id, user_email, numero, canal)
  values (p_tipo, p_dados, v_user, p_user_email, v_numero, 'whatsapp')
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

grant execute on function public.wa_insert_registro(text, jsonb, text, uuid, text) to anon, authenticated, service_role;

-- 8) Matrícula cadastrada (não sobrescreve nome/função se já existir)
insert into public.colaboradores (matricula, nome, funcao)
values ('50349', 'José Belchior P. Junior', 'Assistente de Tecnologia da Informação')
on conflict (matricula) do update
  set ativo = true;
