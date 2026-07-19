-- SafeMine · persistência de rascunho WhatsApp entre instâncias serverless
-- Rode no SQL Editor do Supabase.

alter table public.whatsapp_sessions
  add column if not exists draft_id uuid,
  add column if not exists draft_numero text,
  add column if not exists draft_tipo text,
  add column if not exists draft_summary text;

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
