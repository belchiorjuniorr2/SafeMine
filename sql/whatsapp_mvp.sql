-- SafeMine · WhatsApp MVP (Z-API)
-- Rode no SQL Editor do Supabase (projeto do app).

-- Sessões do bot (estado por número de WhatsApp)
create table if not exists public.whatsapp_sessions (
  phone text primary key,
  state text not null default 'need_matricula',
  -- need_matricula | confirm_matricula | ready
  pending_matricula text,
  user_id uuid,
  nome text,
  matricula text,
  funcao text,
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists whatsapp_sessions_expires_idx
  on public.whatsapp_sessions (expires_at);

-- Cadastro de colaboradores para lookup por matrícula
-- (MVP: preencha manualmente ou via sync do perfil do app)
create table if not exists public.colaboradores (
  matricula text primary key,
  nome text not null,
  funcao text,
  user_id uuid,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Exemplo (ajuste e rode):
-- insert into public.colaboradores (matricula, nome, funcao)
-- values ('50349', 'José Belchior P. Junior', 'Técnico de Segurança')
-- on conflict (matricula) do update
--   set nome = excluded.nome, funcao = excluded.funcao, ativo = true;

-- RLS: o backend usa service role (bypass). Se usar anon, permita só service.
alter table public.whatsapp_sessions enable row level security;
alter table public.colaboradores enable row level security;

-- Políticas mínimas: apenas service role acessa (sem policy = sem acesso com anon)
-- Service role ignora RLS.

-- Número legível do relato (opcional — se a coluna já existir, ignore o erro)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'registros' and column_name = 'numero'
  ) then
    alter table public.registros add column numero text unique;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'registros' and column_name = 'canal'
  ) then
    alter table public.registros add column canal text default 'app';
  end if;
end $$;

-- Gera SM-YYYY-##### sequencial simples
create sequence if not exists public.relato_numero_seq;

create or replace function public.next_relato_numero()
returns text
language sql
as $$
  select 'SM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.relato_numero_seq')::text, 5, '0');
$$;
