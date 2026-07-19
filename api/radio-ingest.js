/**
 * SafeMine · Ingestão de áudio de rádio digital (conector genérico)
 *
 * O servidor do rádio (ou um middleware) chama este endpoint quando há gravação.
 *
 * POST /api/radio-ingest
 * Headers:
 *   Authorization: Bearer <RADIO_INGEST_SECRET>
 *   Content-Type: application/json
 *
 * Body (JSON) — uma das opções de áudio:
 * {
 *   "audioUrl": "https://servidor-radio/gravacoes/abc.wav",
 *   "audioBase64": "<base64 opcional se não tiver URL>",
 *   "mimeType": "audio/wav",
 *   "radioId": "RADIO-12",          // ID do aparelho / unidade
 *   "talkgroup": "SSMA",            // opcional
 *   "channel": "CH-3",              // opcional
 *   "speakerName": "João",          // opcional
 *   "matricula": "50349",          // opcional se radioId estiver mapeado
 *   "externalId": "uuid-do-radio",  // idempotência
 *   "recordedAt": "2026-07-19T12:00:00Z"
 * }
 *
 * GET /api/radio-ingest → health
 */

import {
  env,
  processVoiceRelato,
  sb,
  sbRpc,
  openrouterKey,
  supabaseConfig,
} from './voicePipeline.js'

function json(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Radio-Secret',
  )
  res.end(JSON.stringify(data))
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

function authorize(req) {
  const secret = env('RADIO_INGEST_SECRET')
  if (!secret) {
    // se não configurou secret, ainda permite em dev mas avisa
    return { ok: true, warn: 'RADIO_INGEST_SECRET não configurado' }
  }
  const auth = req.headers.authorization || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  const header = req.headers['x-radio-secret'] || ''
  const url = new URL(req.url, 'http://localhost')
  const q = url.searchParams.get('secret') || ''
  if (bearer === secret || header === secret || q === secret) {
    return { ok: true }
  }
  return { ok: false }
}

function normalizeMatricula(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

async function findByRadioId(radioId) {
  if (!radioId) return null
  // RPC se existir
  try {
    const rows = await sbRpc('radio_find_unidade', { p_radio_id: String(radioId) })
    const c = Array.isArray(rows) ? rows[0] : rows
    if (c && (c.matricula || c.nome)) {
      return {
        matricula: c.matricula || '',
        nome: c.nome || 'Operador (rádio)',
        funcao: c.funcao || 'Campo / Rádio',
        user_id: c.user_id || null,
      }
    }
  } catch {
    /* */
  }
  // tabela radio_unidades
  try {
    const rows = await sb(
      `radio_unidades?radio_id=eq.${encodeURIComponent(String(radioId))}&ativo=eq.true&select=*&limit=1`,
    )
    const u = Array.isArray(rows) ? rows[0] : null
    if (u) {
      return {
        matricula: u.matricula || '',
        nome: u.nome || 'Operador (rádio)',
        funcao: u.funcao || 'Campo / Rádio',
        user_id: u.user_id || null,
      }
    }
  } catch (e) {
    console.warn('[radio_unidades]', e.message)
  }
  // env map: RADIO-12:50349:Nome:Funcao;...
  const map = env('RADIO_UNIT_MAP')
  if (map) {
    for (const part of map.split(';')) {
      const [rid, mat, nome, funcao] = part.split(':').map((s) => s?.trim())
      if (rid && String(rid) === String(radioId)) {
        return {
          matricula: normalizeMatricula(mat),
          nome: nome || 'Operador (rádio)',
          funcao: funcao || 'Campo / Rádio',
          user_id: null,
        }
      }
    }
  }
  return null
}

async function findByMatricula(matricula) {
  const mat = normalizeMatricula(matricula)
  if (!mat) return null
  try {
    const rows = await sbRpc('wa_find_colaborador', { p_matricula: mat })
    const c = Array.isArray(rows) ? rows[0] : rows
    if (c?.nome) {
      return {
        matricula: c.matricula || mat,
        nome: c.nome,
        funcao: c.funcao || '',
        user_id: c.user_id || null,
      }
    }
  } catch {
    /* */
  }
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
  } catch {
    /* */
  }
  return null
}

async function alreadyProcessed(externalId) {
  if (!externalId) return false
  try {
    const rows = await sb(
      `radio_ingest_log?external_id=eq.${encodeURIComponent(String(externalId))}&select=numero&limit=1`,
    )
    return Array.isArray(rows) && rows[0] ? rows[0] : false
  } catch {
    return false
  }
}

async function logIngest({ externalId, numero, radioId, ok, error, payload }) {
  try {
    await sb('radio_ingest_log', {
      method: 'POST',
      body: {
        external_id: externalId || null,
        numero: numero || null,
        radio_id: radioId || null,
        ok: !!ok,
        error: error || null,
        payload: payload || null,
      },
      headers: { Prefer: 'return=minimal' },
    })
  } catch (e) {
    console.warn('[radio_ingest_log]', e.message)
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {})
    return
  }

  if (req.method === 'GET') {
    const { url, key } = supabaseConfig()
    json(res, 200, {
      ok: true,
      service: 'safemine-radio-ingest',
      hasOpenRouter: !!openrouterKey(),
      hasSupabase: !!(url && key),
      hasSecret: !!env('RADIO_INGEST_SECRET'),
      endpoints: {
        post: '/api/radio-ingest',
        auth: 'Authorization: Bearer RADIO_INGEST_SECRET',
      },
    })
    return
  }

  if (req.method !== 'POST') {
    json(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  const auth = authorize(req)
  if (!auth.ok) {
    json(res, 401, { ok: false, error: 'unauthorized' })
    return
  }

  try {
    const body = await readBody(req)
    const audioUrl = body.audioUrl || body.audio_url || body.url || body.mediaUrl
    const audioBase64 = body.audioBase64 || body.audio_base64 || body.base64
    const mimeType =
      body.mimeType || body.mime_type || body.contentType || 'audio/wav'
    const radioId = body.radioId || body.radio_id || body.unitId || body.unit_id
    const matricula = body.matricula || body.employeeId
    const externalId =
      body.externalId || body.external_id || body.messageId || body.id
    const talkgroup = body.talkgroup || body.grupo
    const channel = body.channel || body.canal_radio
    const speakerName = body.speakerName || body.speaker_name || body.operator

    if (externalId) {
      const prev = await alreadyProcessed(externalId)
      if (prev) {
        json(res, 200, {
          ok: true,
          duplicate: true,
          numero: prev.numero,
          message: 'Áudio já processado (externalId)',
        })
        return
      }
    }

    if (!audioUrl && !audioBase64) {
      json(res, 400, {
        ok: false,
        error: 'Informe audioUrl ou audioBase64',
        example: {
          audioUrl: 'https://seu-servidor/gravacao.wav',
          radioId: 'RADIO-12',
          matricula: '50349',
        },
      })
      return
    }

    let audioBuffer = null
    if (audioBase64) {
      const raw = String(audioBase64).includes(',')
        ? String(audioBase64).split(',')[1]
        : String(audioBase64)
      audioBuffer = Buffer.from(raw, 'base64')
    }

    // Identidade: radioId mapeado → matrícula explícita → genérico rádio
    let identity = null
    if (radioId) identity = await findByRadioId(radioId)
    if (!identity && matricula) identity = await findByMatricula(matricula)
    if (!identity) {
      identity = {
        nome: speakerName || 'Operador (rádio)',
        matricula: normalizeMatricula(matricula) || '',
        funcao: 'Campo / Rádio digital',
        user_id: null,
      }
    } else if (speakerName && !identity.nome) {
      identity.nome = speakerName
    }

    const forceDraft = body.forceDraft === true || body.force_draft === true
    const forceFinal = body.forceFinal === true || body.force_final === true
    const confidence =
      typeof body.confidence === 'number' ? body.confidence : undefined

    const result = await processVoiceRelato({
      audioUrl: audioBuffer ? undefined : audioUrl,
      audioBuffer,
      mimeType,
      canal: 'radio',
      identity,
      meta: {
        radio_id: radioId || '',
        radio_unit: radioId || '',
        talkgroup: talkgroup || '',
        radio_channel: channel || '',
        external_id: externalId || '',
        recorded_at: body.recordedAt || body.recorded_at || '',
        source: 'radio_digital',
        forceDraft,
        forceFinal,
        confidence,
      },
      draftGate: forceDraft
        ? { draft: true, reason: 'force_draft' }
        : forceFinal
          ? { draft: false, reason: 'force_final' }
          : null, // auto gate on transcript inside pipeline
    })

    if (!result.ok) {
      await logIngest({
        externalId,
        radioId,
        ok: false,
        error: result.error,
        payload: { radioId, hasUrl: !!audioUrl },
      })
      json(res, 422, {
        ok: false,
        error: result.error,
        stage: result.stage || 'process',
      })
      return
    }

    await logIngest({
      externalId,
      radioId,
      numero: result.numero,
      ok: true,
      payload: {
        tipo: result.tipo,
        radioId,
        draft: !!result.draft,
        draftReason: result.draftReason || null,
      },
    })

    json(res, 200, {
      ok: true,
      numero: result.numero,
      tipo: result.tipo,
      transcript: result.transcript,
      draft: !!result.draft,
      draftReason: result.draftReason || null,
      status: result.draft ? 'rascunho' : 'novo',
      emailSent: result.emailSent,
      emailError: result.emailError,
      identity: {
        nome: identity.nome,
        matricula: identity.matricula,
        funcao: identity.funcao,
      },
      warn: auth.warn,
      message: result.draft
        ? 'Áudio curto/duvidoso gravado como RASCUNHO (não notifica SSMA até revisão).'
        : 'Relato final registrado e SSMA notificada.',
    })
  } catch (err) {
    console.error('[radio-ingest]', err)
    json(res, 500, {
      ok: false,
      error: err?.message || 'internal error',
    })
  }
}
