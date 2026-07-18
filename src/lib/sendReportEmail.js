import { buildReportEmailHtml } from './emailTemplate'
import { TIPO_LABELS } from './miningContext'

/**
 * Destinatário (teste). Configure VITE_REPORT_EMAIL no .env para trocar depois.
 */
export function getReportEmailTo() {
  return import.meta.env.VITE_REPORT_EMAIL || 'belchiorjuniorrr@gmail.com'
}

/**
 * Envia e-mail HTML do relato via Resend (backend /api/send-report-email).
 * A chave fica só no servidor: RESEND_API_KEY no .env
 */
export async function sendReportEmail({ tipo, dados, userEmail, createdAt }) {
  const to = getReportEmailTo()
  const tipoLabel = TIPO_LABELS[tipo] || tipo
  const subject = `SafeMine · ${tipoLabel} · ${dados?.nome || userEmail || 'Novo registro'}`
  const html = buildReportEmailHtml({ tipo, dados, userEmail, createdAt })

  try {
    const res = await fetch('/api/send-report-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        html,
        replyTo: userEmail || undefined,
      }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok || body.ok === false) {
      return {
        ok: false,
        error: body.error || `Falha ao enviar e-mail (${res.status})`,
      }
    }

    return {
      ok: true,
      provider: 'resend',
      to: body.to || to,
      id: body.id,
    }
  } catch (err) {
    return { ok: false, error: err?.message || 'Erro de rede ao enviar e-mail' }
  }
}
