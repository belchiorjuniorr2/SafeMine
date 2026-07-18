/**
 * Vercel Serverless Function — e-mail HTML via Resend.
 * Env: RESEND_API_KEY, REPORT_EMAIL / VITE_REPORT_EMAIL, RESEND_FROM
 */

module.exports = async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'RESEND_API_KEY não configurada no servidor' })
    }

    // Vercel já faz parse de JSON em req.body
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}')
      } catch {
        return res.status(400).json({ ok: false, error: 'JSON inválido' })
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
      return res.status(400).json({ ok: false, error: 'subject e html são obrigatórios' })
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
      return res.status(r.status).json({ ok: false, error: msg })
    }

    return res.status(200).json({
      ok: true,
      provider: 'resend',
      id: data.id,
      to: dest,
    })
  } catch (err) {
    console.error('[send-report-email]', err)
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Erro interno no envio de e-mail',
    })
  }
}
