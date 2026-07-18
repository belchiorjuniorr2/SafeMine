import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Middleware local que espelha /api/send-report-email (Resend)
 * para testes em npm run dev sem precisar do Vercel.
 */
function resendApiPlugin(env) {
  return {
    name: 'resend-api-local',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/send-report-email')) return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }))
          return
        }

        const apiKey = env.RESEND_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'RESEND_API_KEY não configurada no .env' }))
          return
        }

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(chunk)
          const raw = Buffer.concat(chunks).toString('utf8')
          const body = raw ? JSON.parse(raw) : {}
          const { to, subject, html, replyTo } = body
          const dest = to || env.REPORT_EMAIL || env.VITE_REPORT_EMAIL || 'belchiorjuniorrr@gmail.com'
          const from = env.RESEND_FROM || 'SafeMine <onboarding@resend.dev>'

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
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), resendApiPlugin(env)],
    server: { port: 3000 },
  }
})
