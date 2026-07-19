# SafeMine · Rádio digital → relato

## Ideia

```
Rádio digital (PTT)
    → servidor do rádio grava o áudio
    → POST para SafeMine /api/radio-ingest
    → IA transcreve + classifica
    → grava em registros (canal = radio)
    → e-mail HTML para a SSMA
    → devolve número SM-AAAA-#####
```

O conector é **genérico**: qualquer sistema que consiga fazer HTTP POST (middleware, script, gateway do fabricante) encaixa.

---

## 1. SQL no Supabase

Rode no SQL Editor:

`sql/radio_ingest.sql`

Cadastre rádios (opcional, mas recomendado):

```sql
insert into public.radio_unidades (radio_id, matricula, nome, funcao)
values ('RADIO-12', '50349', 'José Belchior P. Junior', 'Assistente de TI')
on conflict (radio_id) do update
  set matricula = excluded.matricula,
      nome = excluded.nome,
      funcao = excluded.funcao,
      ativo = true;
```

---

## 2. Variáveis no Vercel

```text
RADIO_INGEST_SECRET=um-segredo-forte-aqui
OPENROUTER_API_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...   # ou SERVICE_ROLE
RESEND_API_KEY=...
REPORT_EMAIL=...

# opcional, sem tabela:
# RADIO_UNIT_MAP=RADIO-12:50349:Nome:Função;RADIO-07:10482:Outro:Operador
```

---

## 3. Endpoint

```text
POST https://safe-mine-rosy.vercel.app/api/radio-ingest
Authorization: Bearer SEU_RADIO_INGEST_SECRET
Content-Type: application/json
```

### Health

```bash
curl https://safe-mine-rosy.vercel.app/api/radio-ingest
```

### Exemplo com URL de áudio

```bash
curl -X POST "https://safe-mine-rosy.vercel.app/api/radio-ingest" \
  -H "Authorization: Bearer SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://servidor-do-radio.local/gravacoes/abc123.wav",
    "mimeType": "audio/wav",
    "radioId": "RADIO-12",
    "talkgroup": "SSMA",
    "channel": "CH-3",
    "externalId": "gravacao-abc123",
    "recordedAt": "2026-07-19T15:30:00-03:00"
  }'
```

### Exemplo com base64

```bash
curl -X POST "https://safe-mine-rosy.vercel.app/api/radio-ingest" \
  -H "Authorization: Bearer SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "audioBase64": "'$(base64 -i amostra.wav | tr -d '\n')'",
    "mimeType": "audio/wav",
    "radioId": "RADIO-12",
    "matricula": "50349",
    "externalId": "teste-local-1"
  }'
```

### Resposta de sucesso

```json
{
  "ok": true,
  "numero": "SM-2026-00042",
  "tipo": "seguranca",
  "transcript": "Desvio de material na berma do banco 3...",
  "emailSent": true,
  "identity": {
    "nome": "José Belchior P. Junior",
    "matricula": "50349",
    "funcao": "Assistente de TI"
  }
}
```

---

## 4. Campos aceitos

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| `audioUrl` **ou** `audioBase64` | sim | Áudio da gravação |
| `mimeType` | não | Default `audio/wav` |
| `radioId` | não | ID do aparelho (mapeia para colaborador) |
| `matricula` | não | Se souber a matrícula |
| `talkgroup` / `channel` | não | Metadados do rádio |
| `speakerName` | não | Nome se o servidor enviar |
| `externalId` | recomendado | Evita processar 2x a mesma gravação |
| `recordedAt` | não | Timestamp da gravação no rádio |

---

## 5. Como encaixar o servidor do rádio

### Opção A — Webhook do fabricante

Se o sistema de rádio digital tiver “callback / webhook on recording”:

1. URL = `https://safe-mine-rosy.vercel.app/api/radio-ingest`
2. Header `Authorization: Bearer …`
3. Mapear o JSON deles para o nosso (audio URL + radio ID)

### Opção B — Middleware (Node/Python)

Script no servidor da mina:

1. Detecta novo arquivo em pasta / API interna  
2. Sobe o áudio para um storage com URL pública **ou** envia base64  
3. `POST` no SafeMine  

### Opção C — Polling

Cron a cada N segundos consulta a API do rádio, baixa áudios novos e chama o ingest.

---

## 6. Identidade do operador

Ordem de resolução:

1. `radioId` → tabela `radio_unidades`  
2. `matricula` no body → `colaboradores`  
3. Fallback: “Operador (rádio)” + matrícula vazia  

No app **Consultar Registros**, o canal aparece como **Rádio**.

---

## 7. Arquivos no código

| Arquivo | Função |
|---------|--------|
| `api/radio-ingest.js` | Endpoint HTTP |
| `api/voicePipeline.js` | STT + IA + insert + e-mail |
| `sql/radio_ingest.sql` | Tabelas e RPC |
| `docs/RADIO_INGEST.md` | Este guia |

---

## 8. Teste rápido (sem rádio real)

1. Rode o SQL.  
2. Configure `RADIO_INGEST_SECRET` no Vercel.  
3. Use um `.wav`/`.ogg` público ou base64 local com o `curl` acima.  
4. Confira o nº no retorno, o e-mail da SSMA e a lista de registros no app.
