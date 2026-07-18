/**
 * Vercel Serverless — envia e-mail HTML via Resend.
 * Env: RESEND_API_KEY, REPORT_EMAIL (opcional), RESEND_FROM (opcional)
 */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

module.exports = async function handler(req, res) {
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

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: 'RESEND_API_KEY não configurada no servidor' }))
    return
  }

  try {
    const body = typeof req.body === 'object' && req.body
      ? req.body
      : await readBody(req)

    const { to, subject, html, replyTo } = body || {}
    const dest = to || process.env.REPORT_EMAIL || process.env.VITE_REPORT_EMAIL || 'belchiorjuniorrr@gmail.com'
    const from = process.env.RESEND_FROM || 'SafeMine <onboarding@resend.dev>'

    if (!subject || !html) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ ok: false, error: 'subject e html são obrigatórios' }))
      return
    }

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [dest],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      res.statusCode = r.status
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        ok: false,
        error: data?.message || data?.error?.message || `Resend ${r.status}`,
      }))
      return
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: true, provider: 'resend', id: data.id, to: dest }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: err?.message || 'Erro interno' }))
  }
}
