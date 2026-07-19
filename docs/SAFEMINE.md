# SafeMine — Documentação completa do produto

**SafeMine** é um sistema de relatos de segurança para **mineração a céu aberto**.  
O colaborador **fala** o relato; a **IA** transcreve e preenche o formulário; a **SSMA** recebe o registro estruturado e um **e-mail HTML**.

- **App em produção:** https://safe-mine-rosy.vercel.app  
- **Landing:** https://minevoice-landingpage.vercel.app  
- **Stack:** React + Vite · Supabase · OpenRouter (STT + chat) · Resend · Z-API (WhatsApp) · Vercel  

---

## 1. Problema que resolve

Na mina, o relato em papel ou planilha:

- atrasa a operação (parar para escrever);
- perde contexto (quase-acidente não chega à SSMA);
- gera retrabalho (redigitar, decifrar letra);
- não unifica canais (app, rádio, WhatsApp).

O SafeMine unifica a entrada por **voz** e entrega dado **estruturado** para a segurança.

---

## 2. Visão geral da arquitetura

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│  App mobile │   │  WhatsApp    │   │  Rádio (*)  │
│  (web PWA)  │   │  (Z-API)     │   │  roadmap    │
└──────┬──────┘   └──────┬───────┘   └──────┬──────┘
       │                 │                   │
       │    áudio / formulário               │
       └────────────┬────┴───────────────────┘
                    ▼
         ┌──────────────────────┐
         │  IA OpenRouter       │
         │  · Transcrição (STT) │
         │  · Extração de campos│
         │  · Classificação     │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  Supabase            │
         │  · Auth + perfil     │
         │  · Tabela registros  │
         │  · Storage anexos    │
         │  · RPCs WhatsApp     │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  Resend (e-mail HTML)│
         │  → SSMA / destinatário│
         └──────────────────────┘
```

(\*) Rádio: posicionamento de produto na landing; o MVP implementado hoje é **app + WhatsApp**.

---

## 3. Canais de entrada

### 3.1 App web (principal)

- Login com Supabase Auth (e-mail/senha).
- Dashboard com **6 módulos** de relato.
- Gravação por **toque** (não precisa segurar o botão).
- Transcrição + preenchimento automático.
- **Identidade** (nome, matrícula, função) sempre do **perfil** — nunca inventada pela IA.
- Revisão de áudio, texto e campos antes de enviar.
- Anexos (foto/PDF) quando o formulário permitir.
- Consulta de registros enviados.
- E-mail HTML automático via Resend.

### 3.2 WhatsApp (MVP em produção)

Integração via **Z-API** + webhook Vercel (`/api/whatsapp-webhook`).

**Fluxo do colaborador:**

1. Abre conversa com o número conectado à Z-API.  
2. Bot pede a **matrícula**.  
3. Sistema busca em `colaboradores` (ou fallback de env).  
4. Mostra nome/função e pede confirmação **SIM** / **NÃO**.  
5. Só após **SIM** aceita **áudio** de relato.  
6. IA transcreve e classifica o tipo (segurança, ambiental, etc.).  
7. Grava em `registros` com `canal = whatsapp` e número `SM-AAAA-#####`.  
8. Responde no WhatsApp com o número do relato.  
9. Envia e-mail HTML (mesmo template visual do app) para a SSMA.

**Comandos:**

| Mensagem | Efeito |
|----------|--------|
| `oi` / qualquer início | Pede matrícula |
| `50349` (exemplo) | Busca colaborador e pede SIM |
| `SIM` | Libera envio de áudio |
| `NÃO` | Volta a pedir matrícula |
| `sair` | Encerra sessão |
| Áudio (após SIM) | Transcreve e registra |

**Segurança do bot (anti-loop):**

- Pode operar em modo `fromMe` (só mensagens do número da instância) para testes.
- Ignora ecos da API, mensagens longas do bot, grupos e reenvios duplicados.
- Cooldown após cada resposta do bot.

**Arquivos relevantes:**

- `api/whatsapp-webhook.js` — estado da conversa, STT, insert, e-mail  
- `api/emailTemplate.js` — HTML Resend (WhatsApp)  
- `sql/whatsapp_mvp.sql` · `sql/whatsapp_rls_fix.sql` · `sql/whatsapp_userid_fix.sql`  
- `docs/WHATSAPP_MVP.md` — setup operacional Z-API / Supabase  

### 3.3 Rádio (produto / roadmap)

Posicionamento: canal de campo onde o celular é restrito.  
Na landing, aparece como terceiro canal que **converge** no mesmo sistema.  
Implementação de captura de rádio digital ainda não é o núcleo do MVP atual.

---

## 4. Módulos de relato (app)

| Módulo | Rota | Conteúdo principal |
|--------|------|--------------------|
| Segurança | `/seguranca` | Local, ocorrência, gravidade, causa raiz, ação imediata |
| Ambiental | `/ambiental` | Impacto, área, criticidade, medida tomada |
| Ergonomia | `/ergonomia` | Posto, risco, sintoma, prioridade, recomendação |
| Veículo | `/veiculo` | Placa, KM, checklist (pneus, freios, luzes, etc.) |
| Passagem de Turno | `/turno` | Frente, supervisores, equipamentos, pendências |
| Inspeção | `/inspecao` | Área, tipo, conformidades, NCs, prazo, responsável |

Ícones: tiles Lucide coloridos (`src/lib/reportTypes.js` + `TypeIcon`), sem fotos recortadas.

**Gravação rápida (Dashboard):** botão flutuante grava áudio → IA **classifica** o tipo → abre o formulário já pré-preenchido.

---

## 5. Identidade do relator

Regra de produto (e de segurança de dados):

> **Nome, matrícula e função vêm sempre do perfil do colaborador** (Supabase Auth `user_metadata` ou tabela `colaboradores` no WhatsApp).  
> A IA **não** preenche nem sobrescreve esses campos.

No app: tela **Perfil** (`/perfil`).  
No WhatsApp: confirmação explícita da matrícula antes do áudio.

---

## 6. Inteligência artificial

**Provedor:** OpenRouter  

| Função | Modelo (config atual) | Uso |
|--------|----------------------|-----|
| STT | `openai/whisper-1` (+ fallback mini-transcribe) | Áudio → texto em português |
| Extração / classificação | `openai/gpt-4o-mini` | Campos do formulário + tipo |

**Contexto de domínio** (`miningContext.js`):

- Vocabulário de mina a céu aberto (frente de lavra, banco, berma, desmonte, britagem, EPI, SSMA…).  
- Evita termos incorretos (ex.: não assume “caminhão fora de estrada” se a operação não usa).  

Arquivos: `src/lib/openrouter.js`, `src/lib/voiceAI.js`, `src/lib/miningContext.js`, `src/lib/identity.js`.

---

## 7. Backend e dados

### 7.1 Supabase

| Recurso | Uso |
|---------|-----|
| Auth | Login do app |
| `registros` | Persistência dos relatos (`tipo`, `dados` JSON, `user_id`, `user_email`, `numero`, `canal`) |
| Storage `relatos-anexos` | Fotos/PDFs do app |
| `colaboradores` | Lookup de matrícula (WhatsApp) |
| `whatsapp_sessions` | Estado do bot por telefone |
| RPCs `wa_*` | Insert/sessão com `security definer` (bypass RLS no MVP WhatsApp) |

Data/hora de carimbo no WhatsApp: fuso **`America/Sao_Paulo`**.

### 7.2 E-mail (Resend)

- Endpoint: `api/send-report-email.js` (app) e envio direto no webhook WhatsApp.  
- Template HTML: layout SafeMine (laranja, campos em tabela, canal, nº do relato, transcrição no WA).  
- Destinatário: `REPORT_EMAIL` / `VITE_REPORT_EMAIL` (ex.: e-mail da SSMA).  

### 7.3 Deploy

- **App:** Vite static + serverless `api/*` no Vercel.  
- **Landing:** Next.js no Vercel.  
- Variáveis sensíveis **somente** no servidor (sem prefixo `VITE_` para tokens Z-API / Resend / service role).

---

## 8. Telas do app (UX)

| Tela | Função |
|------|--------|
| Login | Autenticação |
| Dashboard | 6 cards de módulo + gravação rápida + consultar registros |
| Formulários | Campos do módulo + gravação por voz + identidade do perfil |
| Sucesso | Confirma envio e status do e-mail |
| Consultar Registros | Busca, filtros com contagem, cards, expand, canal (App/WhatsApp), exclusão com justificativa |
| Perfil | Nome, matrícula, função, setor, turno |

UI: fundo claro (branco / cinza claro / laranja suave), **sem preto sólido**; CTAs laranja mais escuro.

---

## 9. Landing page (site)

**URL:** https://minevoice-landingpage.vercel.app  

Seções principais:

1. **Hero** — proposta de valor + CTA demo + link WhatsApp  
2. **Problema** — dor do papel / atraso  
3. **Case / benefícios** — valor para SSMA  
4. **Como funciona** — 4 passos (voz → IA → revisão → e-mail)  
5. **Módulos** — 6 tipos com ícones Lucide em tiles  
6. **Canais** — App · **WhatsApp** · Rádio → convergência no SafeMine  
7. **App** — prints reais em mockup de celular  
8. **Demo** — formulário de lead  

Nav: Problema · Como funciona · Módulos · Canais · **WhatsApp** · App · Solicitar demo.

---

## 10. Variáveis de ambiente (resumo)

### App (Vercel / `.env`)

| Variável | Onde | Função |
|----------|------|--------|
| `VITE_SUPABASE_URL` | Cliente | Supabase |
| `VITE_SUPABASE_ANON_KEY` | Cliente | Supabase |
| `VITE_OPENROUTER_API_KEY` | Cliente (STT no browser) | IA no app |
| `OPENROUTER_API_KEY` | Servidor | STT/LLM no WhatsApp |
| `RESEND_API_KEY` | Servidor | E-mail |
| `RESEND_FROM` | Servidor | Remetente |
| `VITE_REPORT_EMAIL` / `REPORT_EMAIL` | Ambos | Destino SSMA |
| `ZAPI_INSTANCE_ID` | Servidor | WhatsApp |
| `ZAPI_TOKEN` | Servidor | WhatsApp |
| `ZAPI_CLIENT_TOKEN` | Servidor (opc.) | Segurança Z-API |
| `WHATSAPP_WEBHOOK_SECRET` | Servidor | Query `?secret=` |
| `WHATSAPP_DEMO_COLABORADORES` | Servidor | Fallback `mat:Nome:Função` |
| `WHATSAPP_ALLOW_FROM_ME` | Servidor | `true` = só msgs da instância (teste) |
| `WHATSAPP_ALLOW_EXTERNAL` | Servidor | `true` = aceita números externos |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (recomendado) | Admin / RLS |

Webhook Z-API (Ao receber):

```text
https://safe-mine-rosy.vercel.app/api/whatsapp-webhook?secret=SEU_SECRET
```

---

## 11. Fluxo de dados de um relato (app)

1. Usuário autenticado abre módulo (ou gravação rápida).  
2. (Opcional) grava áudio → OpenRouter STT → texto.  
3. Chat extrai campos (sem identidade).  
4. Perfil preenche nome/matrícula/função.  
5. Usuário revisa e envia.  
6. `submitRegistro`: upload anexos → insert `registros` → `sendReportEmail`.  
7. Tela de sucesso.

## 12. Fluxo de dados (WhatsApp)

1. Webhook recebe payload Z-API.  
2. Máquina de estados: `need_matricula` → `confirm_matricula` → `ready`.  
3. Áudio baixado da URL Z-API → STT → classificar/parse.  
4. RPC `wa_insert_registro` → número `SM-…`.  
5. Resposta no WhatsApp + e-mail HTML Resend.

---

## 13. Segurança e boas práticas

- Não commitar tokens (`.env` no `.gitignore`).  
- Regenerar `ZAPI_TOKEN` se vazou em chat.  
- Preferir `SUPABASE_SERVICE_ROLE_KEY` só no servidor.  
- WhatsApp: validar matrícula + SIM antes de gravar relato.  
- Exclusão de registro no app pede **justificativa** (auditoria mínima em `dados._exclusao`).  
- LGPD: áudio e identidade são dados sensíveis de operação — alinhar com SSMA/TI.

---

## 14. Estrutura de pastas (app)

```text
mining-safety-app/
├── api/
│   ├── send-report-email.js    # Resend (app)
│   ├── whatsapp-webhook.js     # Bot WhatsApp
│   └── emailTemplate.js        # HTML e-mail (servidor)
├── docs/
│   ├── SAFEMINE.md             # Este documento
│   └── WHATSAPP_MVP.md         # Setup WhatsApp
├── sql/                        # Scripts Supabase WhatsApp
├── src/
│   ├── components/             # Header, TypeIcon, AudioRecorder, …
│   ├── context/                # Auth, Profile
│   ├── lib/                    # voiceAI, openrouter, submitRegistro, …
│   └── screens/                # Dashboard, módulos, Records, …
└── public/icons/               # Logo (ícones de tipo = Lucide no código)
```

---

## 15. Roadmap sugerido

| Prioridade | Item |
|------------|------|
| Alta | Liberar WhatsApp para números externos (`WHATSAPP_ALLOW_EXTERNAL=true`) com cadastro de matrículas |
| Alta | Vincular `colaboradores.user_id` aos usuários do Auth |
| Média | Painel SSMA (filtros por canal, SLA, status de tratativa) |
| Média | Templates WhatsApp / número oficial de produção |
| Baixa | Integração real de rádio digital |
| Baixa | Offline-first no app (PWA cache + fila de envio) |

---

## 16. Contatos e links rápidos

| Recurso | URL / arquivo |
|---------|----------------|
| App | https://safe-mine-rosy.vercel.app |
| Landing | https://minevoice-landingpage.vercel.app |
| Health WhatsApp | `GET /api/whatsapp-webhook` |
| Doc WhatsApp setup | `docs/WHATSAPP_MVP.md` |
| SQL WhatsApp | `sql/whatsapp_*.sql` |

---

*Documento gerado para o produto SafeMine — relatos por voz em mina a céu aberto (app + WhatsApp + e-mail SSMA).*
