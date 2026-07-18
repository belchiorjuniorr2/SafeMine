/**
 * Vercel Serverless Function — e-mail HTML via Resend.
 * package.json tem "type": "module", então usamos export default (ESM).
 *
 * Env: RESEND_API_KEY, REPORT_EMAIL / VITE_REPORT_EMAIL, RESEND_FROM
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
    return
  }

  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, error: 'RESEND_API_KEY não configurada no servidor' }))
      return
    }

    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}')
      } catch {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }))
        return
      }
    }
    // Se body vazio, tenta ler stream (fallback)
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw) {
        try {
          body = JSON.parse(raw)
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }))
          return
        }
      }
    }
    body = body || {}

    const { to, subject, html, replyTo } = body
    const dest =
      to ||
      process.env.REPORT_EMAIL ||
      process.env.VITE_REPORT_EMAIL ||
      'belchiorjuniorrr@gmail.com'
    const from = process.env.RESEND_FROM || 'SafeMine <onboarding@resend.dev>'

    if (!subject || !html) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, error: 'subject e html são obrigatórios' }))
      return
    }

    const payload = {
      from,
      to: [dest],
      subject,
      html,
    }
    if (replyTo) payload.reply_to = replyTo

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const msg =
        (typeof data?.message === 'string' && data.message) ||
        (typeof data?.error === 'string' && data.error) ||
        data?.error?.message ||
        `Resend ${r.status}`
      res.statusCode = r.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, error: msg }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, provider: 'resend', id: data.id, to: dest }))
  } catch (err) {
    console.error('[send-report-email]', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      ok: false,
      error: err?.message || 'Erro interno no envio de e-mail',
    }))
  }
}
