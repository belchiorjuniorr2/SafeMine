-- SafeMine · Rádio digital (ingest genérico)
-- Rode no SQL Editor do Supabase.

-- 1) Mapa rádio → colaborador
create table if not exists public.radio_unidades (
  radio_id text primary key,
  matricula text,
  nome text,
  funcao text,
  user_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) Log de ingestão (idempotência + auditoria)
create table if not exists public.radio_ingest_log (
  id bigserial primary key,
  external_id text,
  numero text,
  radio_id text,
  ok boolean,
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists radio_ingest_log_external_uidx
  on public.radio_ingest_log (external_id)
  where external_id is not null;

-- 3) Garante colunas em registros
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
  begin
    alter table public.registros alter column user_id drop not null;
  exception when others then null;
  end;
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

-- 4) Insert genérico com canal (app | whatsapp | radio)
create or replace function public.ingest_registro(
  p_tipo text,
  p_dados jsonb,
  p_numero text,
  p_canal text default 'app',
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
  v_canal text := coalesce(nullif(p_canal, ''), 'app');
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
  values (p_tipo, p_dados, v_user, p_user_email, v_numero, v_canal)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero, 'canal', v_canal, 'user_id', v_user);
exception
  when undefined_column then
    insert into public.registros (tipo, dados, user_id, user_email)
    values (
      p_tipo,
      p_dados || jsonb_build_object('_numero', v_numero, '_canal', v_canal),
      v_user,
      p_user_email
    )
    returning id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'numero', v_numero, 'canal', v_canal, 'user_id', v_user);
end;
$$;

grant execute on function public.ingest_registro(text, jsonb, text, text, uuid, text)
  to anon, authenticated, service_role;

-- 5) Lookup unidade de rádio
create or replace function public.radio_find_unidade(p_radio_id text)
returns table (radio_id text, matricula text, nome text, funcao text, user_id uuid)
language sql
security definer
set search_path = public
as $$
  select r.radio_id, r.matricula, r.nome, r.funcao, r.user_id
  from public.radio_unidades r
  where r.radio_id = p_radio_id
    and r.ativo = true
  limit 1;
$$;

grant execute on function public.radio_find_unidade(text)
  to anon, authenticated, service_role;

-- 6) Exemplo de mapeamento (ajuste)
-- insert into public.radio_unidades (radio_id, matricula, nome, funcao)
-- values ('RADIO-12', '50349', 'José Belchior P. Junior', 'Assistente de TI')
-- on conflict (radio_id) do update
--   set matricula = excluded.matricula, nome = excluded.nome, funcao = excluded.funcao, ativo = true;

alter table public.radio_unidades enable row level security;
alter table public.radio_ingest_log enable row level security;
