# SafeMine · WhatsApp MVP (Z-API)

## Fluxo

1. Usuário manda qualquer mensagem → bot pede **matrícula**
2. Digita matrícula → bot mostra nome/função e pede **SIM**
3. **SIM** → bot libera o relato
4. Envia **áudio** → IA transcreve → grava em `registros` → responde com **SM-YYYY-#####**
5. Comando **sair** encerra a sessão

## O que você precisa fazer

### 1. SQL no Supabase

No SQL Editor do projeto Supabase, rode o arquivo:

`sql/whatsapp_mvp.sql`

Depois cadastre ao menos um colaborador:

```sql
insert into public.colaboradores (matricula, nome, funcao)
values ('50349', 'José Belchior P. Junior', 'Técnico de Segurança')
on conflict (matricula) do update
  set nome = excluded.nome, funcao = excluded.funcao, ativo = true;
```

### 2. Service Role no servidor

No Supabase → **Settings → API** → copie **service_role** (secret).

Configure no Vercel (e no `.env` local):

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
```

> Sem service role, o RLS bloqueia leitura/escrita das tabelas do bot.

### 3. Variáveis Z-API

```
ZAPI_INSTANCE_ID=...
ZAPI_TOKEN=...
ZAPI_CLIENT_TOKEN=   # se o painel Z-API mostrar "Account security token"
OPENROUTER_API_KEY=  # mesma do app
WHATSAPP_WEBHOOK_SECRET=safemine_wa_mvp
WHATSAPP_DEMO_COLABORADORES=50349:Nome:Função   # fallback sem SQL
```

### 4. Webhook na Z-API

Após o deploy em produção, configure o webhook **Ao receber**:

```
https://safe-mine-rosy.vercel.app/api/whatsapp-webhook?secret=safemine_wa_mvp
```

Painel Z-API → sua instância → Webhooks → **Upon receipt** / **Ao receber** → cole a URL.

Também via API:

```bash
curl -X PUT "https://api.z-api.io/instances/INSTANCE/token/TOKEN/update-webhook-received" \
  -H "Content-Type: application/json" \
  -H "Client-Token: SEU_CLIENT_TOKEN" \
  -d '{"value":"https://safe-mine-rosy.vercel.app/api/whatsapp-webhook?secret=safemine_wa_mvp"}'
```

### 5. Teste

1. Envie "oi" no WhatsApp do número conectado à Z-API  
2. Digite a matrícula  
3. Responda **SIM**  
4. Envie um áudio de relato  
5. Receba o número `SM-2026-xxxxx`

## Segurança

- **Não** compartilhe `ZAPI_TOKEN` / `SERVICE_ROLE` em chats públicos.
- Se o token vazou, **regenere** no painel Z-API.
- O `?secret=` evita POST aleatórios no webhook.
