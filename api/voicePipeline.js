/**
 * Pipeline compartilhado: áudio → STT → classificar → gravar → e-mail.
 * Usado por WhatsApp (parcial) e Rádio digital.
 */

import { buildReportEmailHtml, tipoLabel as emailTipoLabel } from './emailTemplate.js'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const TZ_BR = 'America/Sao_Paulo'

export function env(name, fallback = '') {
  return process.env[name] || process.env[`VITE_${name}`] || fallback
}

export function openrouterKey() {
  return env('OPENROUTER_API_KEY') || env('VITE_OPENROUTER_API_KEY')
}

export function supabaseConfig() {
  return {
    url: env('SUPABASE_URL') || env('VITE_SUPABASE_URL'),
    key:
      env('SUPABASE_SERVICE_ROLE_KEY') ||
      env('SUPABASE_ANON_KEY') ||
      env('VITE_SUPABASE_ANON_KEY'),
  }
}

export function nowInBrazil() {
  const now = new Date()
  return {
    data: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ_BR,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now),
    hora: new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ_BR,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now),
    iso: now.toISOString(),
  }
}

export async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const { url, key } = supabaseConfig()
  if (!url || !key) throw new Error('SUPABASE_URL / key não configurados')
  const r = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer:
        method === 'POST' || method === 'PATCH'
          ? 'return=representation'
          : 'return=minimal',
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
    const msg =
      (typeof data === 'object' && (data?.message || data?.error || JSON.stringify(data))) ||
      text
    throw new Error(`Supabase ${r.status}: ${msg}`)
  }
  return data
}

export async function sbRpc(fn, args = {}, { throwOnError = false } = {}) {
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

export async function transcribeBuffer(buf, mimeType = 'audio/ogg', label = 'audio') {
  const key = openrouterKey()
  if (!key) return { error: 'OPENROUTER_API_KEY não configurada' }
  if (!buf || buf.length < 200) return { error: 'Áudio muito curto ou vazio' }

  const mime = mimeType || 'audio/ogg'
  const ext = mime.includes('mpeg') || mime.includes('mp3')
    ? 'mp3'
    : mime.includes('wav')
      ? 'wav'
      : mime.includes('webm')
        ? 'webm'
        : mime.includes('m4a') || mime.includes('mp4')
          ? 'm4a'
          : 'ogg'

  const form = new FormData()
  form.append('file', new Blob([buf], { type: mime }), `${label}.${ext}`)
  form.append('model', 'openai/whisper-1')
  form.append('language', 'pt')
  form.append('response_format', 'json')
  form.append(
    'prompt',
    'Relato de segurança em mineração a céu aberto no Brasil. Termos: frente de lavra, banco, berma, desmonte, britagem, conveyor, EPI, SSMA, rádio, PTT.',
  )

  const r = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://safemine.app',
      'X-Title': 'SafeMine Radio',
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

export async function transcribeFromUrl(audioUrl, mimeType) {
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) return { error: `Falha ao baixar áudio (${audioRes.status})` }
  const buf = Buffer.from(await audioRes.arrayBuffer())
  const mime = mimeType || audioRes.headers.get('content-type') || 'audio/ogg'
  return transcribeBuffer(buf, mime, 'radio')
}

export async function classifyAndParse(transcript) {
  const key = openrouterKey()
  if (!key) return { tipo: 'seguranca', campos: { descricao_ocorrencia: transcript } }

  const prompt = `Você é o SafeMine, sistema de relatos de mina a céu aberto (Brasil).
Analise o relato (pode vir de rádio digital PTT ou app) e retorne JSON com:
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
      'X-Title': 'SafeMine Radio',
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

export async function nextNumero() {
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

export async function saveRegistro({ tipo, dados, userId, userEmail, numero, canal = 'app' }) {
  // 1) RPC genérica com canal
  const rpc = await sbRpc('ingest_registro', {
    p_tipo: tipo,
    p_dados: dados,
    p_numero: numero,
    p_canal: canal,
    p_user_id: userId || null,
    p_user_email: userEmail || null,
  })
  if (rpc && (rpc.ok || rpc.numero || rpc.id)) {
    return { ok: true, row: rpc, numero: rpc.numero || numero }
  }

  // 2) RPC WhatsApp legada (força canal no dados)
  const rpcWa = await sbRpc('wa_insert_registro', {
    p_tipo: tipo,
    p_dados: { ...dados, _canal: canal },
    p_numero: numero,
    p_user_id: userId || null,
    p_user_email: userEmail || null,
  })
  if (rpcWa && (rpcWa.ok || rpcWa.numero || rpcWa.id)) {
    return { ok: true, row: rpcWa, numero: rpcWa.numero || numero }
  }

  // 3) REST
  try {
    const inserted = await sb('registros', {
      method: 'POST',
      body: {
        tipo,
        dados: { ...dados, _canal: canal, _numero: numero },
        user_id: userId || null,
        user_email: userEmail || null,
        numero,
        canal,
      },
      headers: { Prefer: 'return=representation' },
    })
    return {
      ok: true,
      row: Array.isArray(inserted) ? inserted[0] : inserted,
      numero,
    }
  } catch (e) {
    if (String(e.message).includes('numero') || String(e.message).includes('canal')) {
      const inserted = await sb('registros', {
        method: 'POST',
        body: {
          tipo,
          dados: { ...dados, _canal: canal, _numero: numero },
          user_id: userId || null,
          user_email: userEmail || null,
        },
        headers: { Prefer: 'return=representation' },
      })
      return {
        ok: true,
        row: Array.isArray(inserted) ? inserted[0] : inserted,
        numero,
      }
    }
    throw e
  }
}

export async function sendReportEmail({ tipo, dados, numero, canal }) {
  const apiKey = env('RESEND_API_KEY')
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY ausente')
    return { ok: false, error: 'no_key' }
  }
  const to = env('REPORT_EMAIL') || env('VITE_REPORT_EMAIL') || 'belchiorjuniorrr@gmail.com'
  const from = env('RESEND_FROM') || 'SafeMine <onboarding@resend.dev>'
  const createdAt = dados?._registered_at || new Date().toISOString()
  const tipoLbl = emailTipoLabel(tipo)
  const subject = `SafeMine · ${tipoLbl} · ${numero || dados?.nome || canal || 'Relato'}`
  const html = buildReportEmailHtml({
    tipo,
    dados,
    userEmail:
      canal === 'radio'
        ? `Rádio ${dados._radio_id || dados._radio_unit || ''}`.trim()
        : canal === 'whatsapp'
          ? `WhatsApp ${dados._wa_phone || ''}`
          : undefined,
    createdAt,
    numero,
    canal,
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
      console.warn('[email] resend', r.status, body)
      return { ok: false, error: body?.message || `Resend ${r.status}` }
    }
    return { ok: true, id: body.id, to }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

/**
 * Pipeline completo a partir de buffer ou URL.
 */
export async function processVoiceRelato({
  audioUrl,
  audioBuffer,
  mimeType,
  canal = 'radio',
  identity = {},
  meta = {},
}) {
  let tr
  if (audioBuffer) {
    tr = await transcribeBuffer(audioBuffer, mimeType, canal)
  } else if (audioUrl) {
    tr = await transcribeFromUrl(audioUrl, mimeType)
  } else {
    return { ok: false, error: 'audioUrl ou audioBase64 é obrigatório' }
  }
  if (tr.error) return { ok: false, error: tr.error, stage: 'stt' }

  const { tipo, campos } = await classifyAndParse(tr.text)
  const numero = await nextNumero()
  const br = nowInBrazil()

  const dados = {
    ...campos,
    nome: identity.nome || campos.nome || meta.speaker_name || 'Operador (rádio)',
    matricula: identity.matricula || meta.matricula || '',
    funcao: identity.funcao || meta.funcao || 'Campo / Rádio',
    data: br.data,
    hora: br.hora,
    _registered_at: br.iso,
    _registered_data: br.data,
    _registered_hora: br.hora,
    _transcript: tr.text,
    _canal: canal,
    _numero: numero,
    ...Object.fromEntries(
      Object.entries(meta).map(([k, v]) => [`_${k}`.replace(/^__/, '_'), v]),
    ),
  }
  if (!dados.descricao_ocorrencia && !dados.descricao && tr.text) {
    dados.descricao_ocorrencia = tr.text
  }

  const saved = await saveRegistro({
    tipo,
    dados,
    userId: identity.user_id || null,
    userEmail: identity.email || null,
    numero,
    canal,
  })

  const email = await sendReportEmail({ tipo, dados, numero: saved.numero, canal })

  return {
    ok: true,
    numero: saved.numero,
    tipo,
    transcript: tr.text,
    emailSent: !!email.ok,
    emailError: email.ok ? undefined : email.error,
    dados,
  }
}
