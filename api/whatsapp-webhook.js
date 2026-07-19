/**
 * SafeMine · WhatsApp MVP (Z-API)
 *
 * Fluxo:
 *  1) need_matricula  → pede matrícula
 *  2) confirm_matricula → mostra nome e pede SIM/NÃO
 *  3) ready → aceita áudio → transcreve → grava → devolve nº do relato
 *
 * Env:
 *  ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN (opcional)
 *  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *  OPENROUTER_API_KEY (ou VITE_OPENROUTER_API_KEY)
 *  RESEND_API_KEY, REPORT_EMAIL (opcional — e-mail SSMA)
 *  WHATSAPP_WEBHOOK_SECRET (opcional — ?secret=)
 *  WHATSAPP_ALLOW_FROM_ME=true (default) — aceita msgs do número da instância
 *  WHATSAPP_ALLOW_EXTERNAL=false (default) — bloqueia números externos
 *  ZAPI_SELF_PHONE (opcional) — se connectedPhone não vier no webhook
 */

import { buildReportEmailHtml, tipoLabel as emailTipoLabel } from './emailTemplate.js'

const ZAPI_BASE = 'https://api.z-api.io'
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const SESSION_DAYS = 7

const STATES = {
  NEED_MATRICULA: 'need_matricula',
  CONFIRM: 'confirm_matricula',
  READY: 'ready',
}

/** Fallback em memória se o Supabase/tabelas ainda não estiverem prontos (dev / 1ª subida). */
const memorySessions = new Map()
/** Anti-loop: messageIds já processados + janela após envio do bot. */
const seenMessageIds = new Map() // id -> ts
const lastBotSendAt = new Map() // phone -> ts
const lastUserReplyAt = new Map() // phone+action -> ts
const SEEN_TTL_MS = 10 * 60 * 1000
const BOT_COOLDOWN_MS = 4000
const REPLY_DEBOUNCE_MS = 2500

// ─── helpers ───────────────────────────────────────────────

function env(name, fallback = '') {
  return process.env[name] || process.env[`VITE_${name}`] || fallback
}

function zapiConfig() {
  const instanceId = env('ZAPI_INSTANCE_ID')
  const token = env('ZAPI_TOKEN')
  const clientToken = env('ZAPI_CLIENT_TOKEN')
  return { instanceId, token, clientToken }
}

function supabaseConfig() {
  return {
    url: env('SUPABASE_URL') || env('VITE_SUPABASE_URL'),
    key: env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY'),
  }
}

function openrouterKey() {
  return env('OPENROUTER_API_KEY') || env('VITE_OPENROUTER_API_KEY')
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '')
}

/** Data/hora no fuso do Brasil (Vercel roda em UTC). */
const TZ_BR = 'America/Sao_Paulo'

function nowInBrazil() {
  const now = new Date()
  const data = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_BR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now)
  const hora = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ_BR,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  return { data, hora, iso: now.toISOString() }
}

function formatBrazilDateTime(isoOrDate) {
  const d = isoOrDate ? new Date(isoOrDate) : new Date()
  if (Number.isNaN(d.getTime())) return nowInBrazil()
  return {
    data: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ_BR,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d),
    hora: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ_BR,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d),
    when: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ_BR,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d),
  }
}

function normalizeMatricula(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

function isYes(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  // sem "ok" — conflita com eco do bot ("Ok. Digite sua matrícula")
  return ['sim', 's', 'yes', 'y', 'confirmo', 'pode', 'isso', 'certo', 'confirmar'].includes(t)
}

function isNo(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return ['nao', 'n', 'no', 'cancelar', 'cancela', 'sair'].includes(t)
}

function isLogout(text) {
  const t = String(text || '')
    .trim()
    .toLowerCase()
  return ['sair', 'logout', 'trocar matricula', 'trocar matrícula', 'reset'].includes(t)
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    return req.body
  }
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

// ─── Supabase REST (service role) ──────────────────────────

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const { url, key } = supabaseConfig()
  if (!url || !key) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY não configurados')
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' || method === 'PATCH' ? 'return=representation' : 'return=minimal',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!r.ok) {
    const msg = typeof data === 'object' ? data?.message || data?.error || JSON.stringify(data) : text
    throw new Error(`Supabase ${r.status}: ${msg}`)
  }
  return data
}

async function sbRpc(fn, args = {}, { throwOnError = false } = {}) {
  const { url, key } = supabaseConfig()
  if (!url || !key) {
    if (throwOnError) throw new Error('Supabase não configurado')
    return null
  }
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  })
  const text = await r.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!r.ok) {
    const msg =
      (typeof data === 'object' && (data?.message || data?.error || data?.hint)) ||
      text ||
      `RPC ${fn} ${r.status}`
    console.warn(`[rpc ${fn}]`, r.status, msg)
    if (throwOnError) throw new Error(String(msg))
    return null
  }
  return data
}

/** Detecta eco das próprias respostas do bot (Z-API às vezes manda fromMe sem fromApi). */
function looksLikeBotMessage(text) {
  const t = String(text || '').trim()
  if (!t) return false
  const markers = [
    'Sou o *SafeMine*',
    'Sou o SafeMine',
    'SafeMine',
    'Confirme seus dados',
    'Matrícula confirmada',
    'Matricula confirmada',
    'Recebi o áudio',
    'Recebi o audio',
    'registrado no SafeMine',
    'Não encontrei a matrícula',
    'Nao encontrei a matricula',
    'Não consegui entender o áudio',
    'Ocorreu um erro ao processar',
    'Sessão encerrada',
    'Sessao encerrada',
    'áudio do relato',
    'audio do relato',
    'Digite sua *matrícula*',
    'Digite sua matrícula',
    'Digite sua matricula',
    'Ainda preciso da confirmação',
    'A SSMA foi notificada',
    'trocar de matrícula',
    'trocar de matricula',
    'Responda *SIM*',
    'Responda SIM',
  ]
  const lower = t.toLowerCase()
  if (markers.some((s) => t.includes(s) || lower.includes(s.toLowerCase()))) return true
  // mensagens longas com formatação de bot (várias linhas + emojis de UI)
  if (t.length > 60 && (t.includes('👤') || t.includes('🔢') || t.includes('📋') || t.includes('🧰'))) {
    return true
  }
  return false
}

/** No modo fromMe, só aceita comandos curtos do usuário ou áudio — evita reprocessar eco. */
function isLikelyUserInput(text, hasAudio) {
  if (hasAudio) return true
  const t = String(text || '').trim()
  if (!t) return false
  if (looksLikeBotMessage(t)) return false
  if (t.length > 48) return false
  if (isYes(t) || isNo(t) || isLogout(t)) return true
  const mat = normalizeMatricula(t)
  if (/^[A-Z0-9\-]{2,20}$/.test(mat) && !isYes(t) && !isNo(t)) return true
  if (/^(oi|olá|ola|hey|menu|inicio|início|help|ajuda|bom dia|boa tarde|boa noite)$/i.test(t)) {
    return true
  }
  return false
}

function pruneSeen() {
  const now = Date.now()
  for (const [id, ts] of seenMessageIds) {
    if (now - ts > SEEN_TTL_MS) seenMessageIds.delete(id)
  }
}

function markSeen(messageId) {
  if (!messageId) return false
  pruneSeen()
  if (seenMessageIds.has(messageId)) return true
  seenMessageIds.set(messageId, Date.now())
  return false
}

function inBotCooldown(phone) {
  const ts = lastBotSendAt.get(phone) || 0
  return Date.now() - ts < BOT_COOLDOWN_MS
}

function debounceAction(key) {
  const now = Date.now()
  const prev = lastUserReplyAt.get(key) || 0
  if (now - prev < REPLY_DEBOUNCE_MS) return true
  lastUserReplyAt.set(key, now)
  return false
}

// ─── Z-API ─────────────────────────────────────────────────

async function zapiSendText(phone, message) {
  const { instanceId, token, clientToken } = zapiConfig()
  if (!instanceId || !token) throw new Error('ZAPI_INSTANCE_ID / ZAPI_TOKEN não configurados')

  const p = normalizePhone(phone) || phone
  // marca cooldown ANTES do envio para cobrir eco quase imediato
  lastBotSendAt.set(p, Date.now())
  if (phone !== p) lastBotSendAt.set(phone, Date.now())

  const headers = { 'Content-Type': 'application/json' }
  if (clientToken) headers['Client-Token'] = clientToken

  const r = await fetch(
    `${ZAPI_BASE}/instances/${instanceId}/token/${token}/send-text`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: p,
        message,
      }),
    },
  )
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    console.error('[zapi send-text]', r.status, data)
    throw new Error(data?.message || data?.error || `Z-API ${r.status}`)
  }
  // marca messageId de saída se a Z-API devolver
  if (data?.messageId || data?.zaapId || data?.id) {
    markSeen(String(data.messageId || data.zaapId || data.id))
  }
  lastBotSendAt.set(p, Date.now())
  return data
}

// ─── sessão ────────────────────────────────────────────────

async function getSession(phone) {
  // 1) RPC security definer (funciona com anon)
  try {
    const rows = await sbRpc('wa_get_session', { p_phone: phone })
    const s = Array.isArray(rows) ? rows[0] : rows
    if (s && s.phone) return s
  } catch (e) {
    console.warn('[getSession rpc]', e.message)
  }
  // 2) REST direto
  try {
    const rows = await sb(
      `whatsapp_sessions?phone=eq.${encodeURIComponent(phone)}&select=*&limit=1`,
    )
    const s = Array.isArray(rows) ? rows[0] : null
    if (s) {
      if (s.expires_at && new Date(s.expires_at) < new Date()) {
        await clearSession(phone)
        return null
      }
      return s
    }
  } catch (e) {
    console.warn('[getSession rest]', e.message)
  }
  // 3) memória
  const mem = memorySessions.get(phone)
  if (!mem) return null
  if (mem.expires_at && new Date(mem.expires_at) < new Date()) {
    memorySessions.delete(phone)
    return null
  }
  return mem
}

async function upsertSession(phone, patch) {
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString()
  const row = {
    phone,
    state: patch.state || STATES.NEED_MATRICULA,
    pending_matricula: patch.pending_matricula ?? null,
    user_id: patch.user_id ?? null,
    nome: patch.nome ?? null,
    matricula: patch.matricula ?? null,
    funcao: patch.funcao ?? null,
    updated_at: new Date().toISOString(),
    expires_at: expires,
    ...patch,
  }
  memorySessions.set(phone, row)
  // RPC security definer
  const ok = await sbRpc('wa_upsert_session', {
    p: {
      phone: row.phone,
      state: row.state,
      pending_matricula: row.pending_matricula,
      user_id: row.user_id || null,
      nome: row.nome,
      matricula: row.matricula,
      funcao: row.funcao,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    },
  })
  if (ok === null) {
    // fallback REST (pode falhar por RLS)
    try {
      await sb('whatsapp_sessions', {
        method: 'POST',
        body: row,
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      })
    } catch (e) {
      console.warn('[upsertSession] memory only:', e.message)
    }
  }
  return row
}

async function clearSession(phone) {
  memorySessions.delete(phone)
  await sbRpc('wa_clear_session', { p_phone: phone })
  try {
    await sb(`whatsapp_sessions?phone=eq.${encodeURIComponent(phone)}`, {
      method: 'DELETE',
    })
  } catch (e) {
    /* ok */
  }
}

// ─── matrícula ─────────────────────────────────────────────

async function findColaboradorByMatricula(matricula) {
  const mat = normalizeMatricula(matricula)
  if (!mat) return null

  // 1) RPC security definer
  try {
    const rows = await sbRpc('wa_find_colaborador', { p_matricula: mat })
    const c = Array.isArray(rows) ? rows[0] : rows
    if (c && (c.matricula || c.nome)) {
      return {
        matricula: c.matricula || mat,
        nome: c.nome,
        funcao: c.funcao || '',
        user_id: c.user_id || null,
      }
    }
  } catch (e) {
    console.warn('[colaboradores rpc]', e.message)
  }

  // 2) tabela colaboradores (REST)
  try {
    const rows = await sb(
      `colaboradores?matricula=eq.${encodeURIComponent(mat)}&ativo=eq.true&select=*&limit=1`,
    )
    const c = Array.isArray(rows) ? rows[0] : null
    if (c) {
      return {
        matricula: c.matricula,
        nome: c.nome,
        funcao: c.funcao || '',
        user_id: c.user_id || null,
      }
    }
  } catch (e) {
    console.warn('[colaboradores lookup]', e.message)
  }

  // 2) Auth Admin list users (service role) — metadata.matricula
  try {
    const { url, key } = supabaseConfig()
    if (url && key) {
      for (let page = 1; page <= 5; page++) {
        const r = await fetch(
          `${url}/auth/v1/admin/users?page=${page}&per_page=200`,
          {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
            },
          },
        )
        if (!r.ok) break
        const body = await r.json()
        const users = body?.users || body || []
        if (!Array.isArray(users) || users.length === 0) break
        for (const u of users) {
          const meta = u.user_metadata || {}
          const m = normalizeMatricula(meta.matricula)
          if (m && m === mat) {
            return {
              matricula: m,
              nome: meta.nome || u.email || 'Colaborador',
              funcao: meta.funcao || '',
              user_id: u.id,
            }
          }
        }
        if (users.length < 200) break
      }
    }
  } catch (e) {
    console.warn('[auth users lookup]', e.message)
  }

  // 3) fallback demo env: 10482:Nome:Funcao
  const demo = env('WHATSAPP_DEMO_COLABORADORES')
  if (demo) {
    for (const part of demo.split(';')) {
      const [m, nome, funcao, userId] = part.split(':').map((s) => s?.trim())
      if (normalizeMatricula(m) === mat) {
        return {
          matricula: mat,
          nome: nome || 'Colaborador',
          funcao: funcao || '',
          user_id: userId || null,
        }
      }
    }
  }

  return null
}

// ─── IA ────────────────────────────────────────────────────

async function transcribeFromUrl(audioUrl, mimeType = 'audio/ogg') {
  const key = openrouterKey()
  if (!key) return { error: 'OPENROUTER_API_KEY não configurada' }

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) return { error: `Falha ao baixar áudio (${audioRes.status})` }
  const buf = Buffer.from(await audioRes.arrayBuffer())
  if (buf.length < 200) return { error: 'Áudio muito curto' }

  const mime = mimeType || audioRes.headers.get('content-type') || 'audio/ogg'
  const ext = mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : mime.includes('wav') ? 'wav' : 'ogg'

  const form = new FormData()
  form.append(
    'file',
    new Blob([buf], { type: mime }),
    `whatsapp.${ext}`,
  )
  form.append('model', 'openai/whisper-1')
  form.append('language', 'pt')
  form.append('response_format', 'json')
  form.append(
    'prompt',
    'Relato de segurança em mineração a céu aberto no Brasil. Termos: frente de lavra, banco, berma, desmonte, britagem, conveyor, EPI, SSMA.',
  )

  const r = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://safemine.app',
      'X-Title': 'SafeMine WhatsApp',
    },
    body: form,
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    return { error: body?.error?.message || body?.message || `STT ${r.status}` }
  }
  const text = (body.text || body.transcript || '').trim()
  if (!text) return { error: 'Transcrição vazia' }
  return { text }
}

async function classifyAndParse(transcript) {
  const key = openrouterKey()
  if (!key) return { tipo: 'seguranca', campos: { descricao_ocorrencia: transcript } }

  const prompt = `Você é o SafeMine, sistema de relatos de mina a céu aberto (Brasil).
Analise o relato e retorne JSON com:
- "tipo": um de seguranca|ambiental|ergonomia|veiculo|turno|inspecao
- "campos": objeto com campos relevantes (local, data, hora, descricao_ocorrencia, gravidade Leve/Moderado/Grave, etc.)
NÃO inclua nome, matricula nem funcao.
Não invente dados. Omita o que não foi dito.
Não use "caminhão fora de estrada".

Relato: """${transcript}"""

Retorne APENAS JSON.`

  const r = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://safemine.app',
      'X-Title': 'SafeMine WhatsApp',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  })
  const body = await r.json().catch(() => ({}))
  const content = body?.choices?.[0]?.message?.content || ''
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) {
    return { tipo: 'seguranca', campos: { descricao_ocorrencia: transcript } }
  }
  try {
    const parsed = JSON.parse(match[0])
    const tipo = parsed.tipo || 'seguranca'
    const campos = { ...(parsed.campos || {}) }
    delete campos.nome
    delete campos.matricula
    delete campos.funcao
    return { tipo, campos }
  } catch {
    return { tipo: 'seguranca', campos: { descricao_ocorrencia: transcript } }
  }
}

// ─── registro ──────────────────────────────────────────────

async function nextNumero() {
  try {
    const n = await sbRpc('next_relato_numero')
    if (typeof n === 'string' && n) return n
    if (Array.isArray(n) && n[0]) return n[0]
  } catch {
    /* fallback */
  }
  const y = new Date().getFullYear()
  const rand = String(Math.floor(Math.random() * 90000) + 10000)
  return `SM-${y}-${rand}`
}

async function saveRegistro({ tipo, dados, userId, userEmail, numero }) {
  // Prefer RPC security definer (funciona com anon + RLS)
  const rpc = await sbRpc(
    'wa_insert_registro',
    {
      p_tipo: tipo,
      p_dados: dados,
      p_numero: numero,
      p_user_id: userId || null,
      p_user_email: userEmail || null,
    },
    { throwOnError: false },
  )
  if (rpc && (rpc.ok || rpc.numero || rpc.id)) {
    return {
      ok: true,
      row: rpc,
      numero: rpc.numero || numero,
    }
  }

  // Fallback REST (precisa service_role ou policy)
  const row = {
    tipo,
    dados,
    user_id: userId || null,
    user_email: userEmail || null,
    numero,
    canal: 'whatsapp',
  }
  try {
    const inserted = await sb('registros', {
      method: 'POST',
      body: row,
      headers: { Prefer: 'return=representation' },
    })
    return { ok: true, row: Array.isArray(inserted) ? inserted[0] : inserted, numero }
  } catch (e) {
    if (String(e.message).includes('numero') || String(e.message).includes('canal')) {
      const fallback = {
        tipo,
        dados: { ...dados, _numero: numero, _canal: 'whatsapp' },
        user_id: userId || null,
        user_email: userEmail || null,
      }
      const inserted = await sb('registros', {
        method: 'POST',
        body: fallback,
        headers: { Prefer: 'return=representation' },
      })
      return { ok: true, row: Array.isArray(inserted) ? inserted[0] : inserted, numero }
    }
    throw new Error(
      e.message +
        ' — rode sql/whatsapp_rls_fix.sql no Supabase (RPC wa_insert_registro).',
    )
  }
}

async function maybeSendEmail({ tipo, dados, numero }) {
  const apiKey = env('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[email whatsapp] RESEND_API_KEY ausente')
    return { ok: false, error: 'no_key' }
  }
  const to = env('REPORT_EMAIL') || env('VITE_REPORT_EMAIL') || 'belchiorjuniorrr@gmail.com'
  const from = env('RESEND_FROM') || 'SafeMine <onboarding@resend.dev>'
  const createdAt = dados?._registered_at || new Date().toISOString()
  const tipoLbl = emailTipoLabel(tipo)
  const subject = `SafeMine · ${tipoLbl} · ${numero || dados?.nome || 'WhatsApp'}`
  const html = buildReportEmailHtml({
    tipo,
    dados,
    userEmail: dados?._wa_phone ? `WhatsApp ${dados._wa_phone}` : undefined,
    createdAt,
    numero,
    canal: 'whatsapp',
  })
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.warn('[email whatsapp] resend', r.status, body)
      return { ok: false, error: body?.message || `Resend ${r.status}` }
    }
    return { ok: true, id: body.id, to }
  } catch (e) {
    console.warn('[email whatsapp]', e.message)
    return { ok: false, error: e.message }
  }
}

// ─── mensagens ─────────────────────────────────────────────

const MSG = {
  welcome:
    'Olá! Sou o *SafeMine* 🦺\n\nPara registrar um relato por WhatsApp, digite sua *matrícula* (ex.: 10482).',
  notFound: (m) =>
    `Não encontrei a matrícula *${m}* no cadastro.\n\nConfira o número ou cadastre o colaborador no SafeMine.\nDigite outra matrícula:`,
  confirm: (c) =>
    `Confirme seus dados:\n\n👤 *${c.nome}*\n🔢 Mat. *${c.matricula}*\n🧰 ${c.funcao || '—'}\n\nResponda *SIM* para continuar ou *NÃO* para digitar outra matrícula.`,
  ready: (c) =>
    `✅ Matrícula confirmada: *${c.nome}* (Mat. ${c.matricula}).\n\nEnvie o *áudio do relato* (mensagem de voz).\n\nComandos: *sair* para trocar de matrícula.`,
  needAudio:
    'Agora envie o *áudio do relato* (mensagem de voz no WhatsApp).\n\nOu digite *sair* para trocar de matrícula.',
  needMatFirst:
    'Antes de enviar o áudio, preciso confirmar sua matrícula.\n\nDigite sua *matrícula*:',
  processing: '⏳ Recebi o áudio. Transcrevendo e registrando…',
  done: (numero, tipo, local) =>
    `✅ Relato *${numero}* registrado no SafeMine.\n\n📋 Tipo: ${tipo}${local ? `\n📍 Local: ${local}` : ''}\n\nA SSMA foi notificada.\nEnvie outro áudio para novo relato, ou *sair* para trocar de matrícula.`,
  sttFail: (err) =>
    `Não consegui entender o áudio (${err}).\nEnvie novamente, falando um pouco mais perto e com menos ruído.`,
  error: 'Ocorreu um erro ao processar. Tente de novo em instantes ou use o app SafeMine.',
  bye: 'Sessão encerrada. Quando quiser registrar de novo, digite sua *matrícula*.',
}

const TIPO_LABEL = {
  seguranca: 'Segurança',
  ambiental: 'Ambiental',
  ergonomia: 'Ergonomia',
  veiculo: 'Veículo',
  turno: 'Passagem de Turno',
  inspecao: 'Inspeção',
}

// ─── core flow ─────────────────────────────────────────────

async function handleIncoming(payload) {
  // MVP: por enquanto só aceita mensagens fromMe (número da própria instância).
  // Assim você testa mandando áudio/texto do chip conectado na Z-API.
  // Quando liberar para operadores, setar WHATSAPP_ALLOW_FROM_ME=false e
  // WHATSAPP_ALLOW_EXTERNAL=true (ou remover o gate).
  const allowFromMe = env('WHATSAPP_ALLOW_FROM_ME', 'true') !== 'false'
  const allowExternal = env('WHATSAPP_ALLOW_EXTERNAL', 'false') === 'true'

  if (payload.isGroup) return { ignored: true, reason: 'group' }
  if (payload.waitingMessage) return { ignored: true, reason: 'waiting' }
  if (payload.notification) return { ignored: true, reason: 'notification' }
  if (payload.type && payload.type !== 'ReceivedCallback') {
    return { ignored: true, reason: 'type' }
  }

  // Mensagens enviadas pela API (send-text) — não reprocessar
  if (payload.fromApi) return { ignored: true, reason: 'fromApi' }

  // dedup por messageId (Z-API às vezes reenvia)
  if (payload.messageId && markSeen(payload.messageId)) {
    return { ignored: true, reason: 'dup_messageId' }
  }

  const isFromMe = !!payload.fromMe
  if (isFromMe && !allowFromMe) {
    return { ignored: true, reason: 'fromMe_disabled' }
  }
  if (!isFromMe && !allowExternal) {
    return { ignored: true, reason: 'external_disabled' }
  }

  const text =
    payload.text?.message ||
    payload.buttonsResponseMessage?.message ||
    payload.listResponseMessage?.message ||
    ''

  // Eco do próprio bot (fromMe sem fromApi)
  if (text && looksLikeBotMessage(text)) {
    return { ignored: true, reason: 'bot_echo' }
  }

  // fromMe: sempre sessão no número da instância (connectedPhone).
  // payload.phone em fromMe pode ser LID (@lid) ou o contato do chat.
  let phone = normalizePhone(payload.connectedPhone) || normalizePhone(env('ZAPI_SELF_PHONE'))
  if (!phone) {
    // só usa phone do payload se parecer E.164 BR (10–13 dígitos)
    const raw = normalizePhone(payload.phone)
    if (raw && raw.length >= 10 && raw.length <= 13) phone = raw
  }
  if (!phone) phone = 'self'

  // cooldown logo após o bot falar — engole eco
  if (inBotCooldown(phone)) {
    return { ignored: true, reason: 'bot_cooldown' }
  }

  const hasAudio = !!(payload.audio?.audioUrl)
  const audioUrl = payload.audio?.audioUrl
  const audioMime = payload.audio?.mimeType

  // sem texto e sem áudio = status/reação/etc.
  if (!hasAudio && !String(text || '').trim()) {
    return { ignored: true, reason: 'empty' }
  }

  // modo fromMe: só comandos curtos do usuário ou áudio
  if (isFromMe && !isLikelyUserInput(text, hasAudio)) {
    return { ignored: true, reason: 'not_user_input' }
  }

  let session = await getSession(phone)

  // logout
  if (text && isLogout(text)) {
    if (debounceAction(`${phone}:logout`)) return { ignored: true, reason: 'debounce' }
    await clearSession(phone)
    await zapiSendText(phone, MSG.bye)
    return { ok: true, action: 'logout' }
  }

  // sem sessão
  if (!session) {
    if (hasAudio) {
      if (debounceAction(`${phone}:need_mat_audio`)) return { ignored: true, reason: 'debounce' }
      await upsertSession(phone, { state: STATES.NEED_MATRICULA })
      await zapiSendText(phone, MSG.needMatFirst)
      return { ok: true, action: 'need_mat_before_audio' }
    }
    // se parece matrícula
    const maybeMat = normalizeMatricula(text)
    if (maybeMat && /^[A-Z0-9\-]{2,20}$/.test(maybeMat) && !isYes(text) && !isNo(text)) {
      return handleMatriculaInput(phone, maybeMat)
    }
    if (debounceAction(`${phone}:welcome`)) return { ignored: true, reason: 'debounce' }
    await upsertSession(phone, { state: STATES.NEED_MATRICULA })
    await zapiSendText(phone, MSG.welcome)
    return { ok: true, action: 'welcome' }
  }

  // ── estados ──
  if (session.state === STATES.NEED_MATRICULA) {
    if (hasAudio) {
      if (debounceAction(`${phone}:need_mat`)) return { ignored: true, reason: 'debounce' }
      await zapiSendText(phone, MSG.needMatFirst)
      return { ok: true, action: 'need_mat' }
    }
    const mat = normalizeMatricula(text)
    if (!mat || isYes(text) || isNo(text)) {
      if (debounceAction(`${phone}:ask_mat`)) return { ignored: true, reason: 'debounce' }
      await zapiSendText(phone, MSG.welcome)
      return { ok: true, action: 'ask_mat' }
    }
    return handleMatriculaInput(phone, mat)
  }

  if (session.state === STATES.CONFIRM) {
    if (hasAudio) {
      if (debounceAction(`${phone}:confirm_audio`)) return { ignored: true, reason: 'debounce' }
      await zapiSendText(
        phone,
        `Ainda preciso da confirmação.\n\n${MSG.confirm({
          nome: session.nome,
          matricula: session.pending_matricula || session.matricula,
          funcao: session.funcao,
        })}`,
      )
      return { ok: true, action: 'confirm_pending' }
    }
    if (isYes(text)) {
      if (debounceAction(`${phone}:confirm_yes`)) return { ignored: true, reason: 'debounce' }
      await upsertSession(phone, {
        state: STATES.READY,
        matricula: session.pending_matricula || session.matricula,
        nome: session.nome,
        funcao: session.funcao,
        user_id: session.user_id,
        pending_matricula: null,
      })
      await zapiSendText(
        phone,
        MSG.ready({
          nome: session.nome,
          matricula: session.pending_matricula || session.matricula,
          funcao: session.funcao,
        }),
      )
      return { ok: true, action: 'confirmed' }
    }
    if (isNo(text)) {
      if (debounceAction(`${phone}:confirm_no`)) return { ignored: true, reason: 'debounce' }
      await upsertSession(phone, {
        state: STATES.NEED_MATRICULA,
        pending_matricula: null,
        nome: null,
        matricula: null,
        funcao: null,
        user_id: null,
      })
      await zapiSendText(phone, 'Digite sua *matrícula*:')
      return { ok: true, action: 'confirm_no' }
    }
    // não reenviar confirmação em loop para lixo/eco
    return { ignored: true, reason: 'confirm_wait_yes_no' }
  }

  // READY
  if (session.state === STATES.READY) {
    if (hasAudio) {
      return handleAudio(phone, session, audioUrl, audioMime)
    }
    if (text) {
      // se mandar nova matrícula numérica, reinicia
      const mat = normalizeMatricula(text)
      if (/^\d{3,10}$/.test(mat)) {
        return handleMatriculaInput(phone, mat)
      }
      // não spammar "envie o áudio" a cada mensagem
      if (debounceAction(`${phone}:need_audio`)) return { ignored: true, reason: 'debounce' }
      await zapiSendText(phone, MSG.needAudio)
      return { ok: true, action: 'need_audio' }
    }
    return { ignored: true, reason: 'ready_empty' }
  }

  // estado desconhecido — não loop de welcome
  return { ignored: true, reason: 'unknown_state' }
}

async function handleMatriculaInput(phone, mat) {
  const colab = await findColaboradorByMatricula(mat)
  if (!colab) {
    await upsertSession(phone, { state: STATES.NEED_MATRICULA, pending_matricula: null })
    await zapiSendText(phone, MSG.notFound(mat))
    return { ok: true, action: 'mat_not_found', matricula: mat }
  }
  await upsertSession(phone, {
    state: STATES.CONFIRM,
    pending_matricula: colab.matricula,
    nome: colab.nome,
    funcao: colab.funcao,
    user_id: colab.user_id,
    matricula: null,
  })
  await zapiSendText(phone, MSG.confirm(colab))
  return { ok: true, action: 'mat_confirm', matricula: colab.matricula }
}

async function handleAudio(phone, session, audioUrl, audioMime) {
  await zapiSendText(phone, MSG.processing)

  const tr = await transcribeFromUrl(audioUrl, audioMime)
  if (tr.error) {
    await zapiSendText(phone, MSG.sttFail(tr.error))
    return { ok: false, action: 'stt_fail', error: tr.error }
  }

  const { tipo, campos } = await classifyAndParse(tr.text)
  const numero = await nextNumero()
  const br = nowInBrazil()
  // Carimbo oficial do registro no fuso de Brasília (servidor Vercel = UTC).
  // Hora dita no áudio fica na descrição/transcrição; data/hora do formulário = agora BR.
  const dados = {
    ...campos,
    nome: session.nome,
    matricula: session.matricula,
    funcao: session.funcao,
    data: br.data,
    hora: br.hora,
    _registered_at: br.iso,
    _registered_data: br.data,
    _registered_hora: br.hora,
    _transcript: tr.text,
    _canal: 'whatsapp',
    _wa_phone: phone,
    _numero: numero,
  }
  if (!dados.descricao_ocorrencia && !dados.descricao && tr.text) {
    dados.descricao_ocorrencia = tr.text
  }

  try {
    await saveRegistro({
      tipo,
      dados,
      userId: session.user_id,
      userEmail: null,
      numero,
    })
  } catch (e) {
    console.error('[saveRegistro]', e)
    const hint = String(e.message || '').slice(0, 180)
    await zapiSendText(
      phone,
      `${MSG.error}\n\n_Detalhe: ${hint}_`,
    )
    return { ok: false, action: 'save_fail', error: e.message }
  }

  await maybeSendEmail({ tipo, dados, numero })

  const local = dados.local || dados.area_inspecionada || dados.frente_trabalho || ''
  await zapiSendText(
    phone,
    MSG.done(numero, TIPO_LABEL[tipo] || tipo, local),
  )
  // renova sessão ready
  await upsertSession(phone, {
    state: STATES.READY,
    nome: session.nome,
    matricula: session.matricula,
    funcao: session.funcao,
    user_id: session.user_id,
  })

  return { ok: true, action: 'registered', numero, tipo }
}

// ─── HTTP handler ──────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  // health / verify
  if (req.method === 'GET') {
    json(res, 200, {
      ok: true,
      service: 'safemine-whatsapp-zapi',
      hasZapi: !!(env('ZAPI_INSTANCE_ID') && env('ZAPI_TOKEN')),
      hasSupabase: !!(supabaseConfig().url && supabaseConfig().key),
      hasOpenRouter: !!openrouterKey(),
    })
    return
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  try {
    // secret opcional: /api/whatsapp-webhook?secret=xxx
    const secret = env('WHATSAPP_WEBHOOK_SECRET')
    if (secret) {
      const url = new URL(req.url, 'http://localhost')
      if (url.searchParams.get('secret') !== secret) {
        json(res, 401, { ok: false, error: 'unauthorized' })
        return
      }
    }

    const payload = await readBody(req)
    console.log('[whatsapp-webhook]', {
      phone: payload.phone,
      fromMe: payload.fromMe,
      hasText: !!payload.text,
      hasAudio: !!payload.audio,
      type: payload.type,
    })

    const result = await handleIncoming(payload)
    json(res, 200, { ok: true, ...result })
  } catch (err) {
    console.error('[whatsapp-webhook]', err)
    json(res, 200, {
      // 200 para Z-API não reintentar em loop agressivo; logamos o erro
      ok: false,
      error: err?.message || 'internal error',
    })
  }
}
