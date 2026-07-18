import { supabase } from './supabase'
import { sendReportEmail, getReportEmailTo } from './sendReportEmail'

/**
 * Upload anexos e grava um registro no Supabase.
 * Em seguida envia e-mail com template HTML para o destinatário de notificações.
 * Retorna { ok: true, dados, emailSent, emailError? } ou { ok: false, error }.
 */
export async function submitRegistro({ tipo, dados, files = [], user }) {
  if (!user?.id) {
    return { ok: false, error: 'Sessão expirada. Faça login novamente.' }
  }

  const anexos = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const safeName = String(file.name || 'arquivo').replace(/[^\w.\-]+/g, '_')
    const path = `${user.id}/${Date.now()}_${i}_${safeName}`
    const { error: uploadError } = await supabase.storage
      .from('relatos-anexos')
      .upload(path, file)

    if (uploadError) {
      return {
        ok: false,
        error: `Falha ao enviar anexo "${file.name}": ${uploadError.message}`,
      }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('relatos-anexos')
      .getPublicUrl(path)

    anexos.push({ url: publicUrl, name: file.name, type: file.type })
  }

  const payload = {
    ...dados,
    ...(anexos.length ? { anexos } : {}),
  }

  const { error: insertError } = await supabase.from('registros').insert({
    tipo,
    dados: payload,
    user_id: user.id,
    user_email: user.email,
  })

  if (insertError) {
    return {
      ok: false,
      error: `Falha ao salvar o registro: ${insertError.message}`,
    }
  }

  // E-mail de notificação (não bloqueia o sucesso do registro se falhar)
  const createdAt = new Date().toISOString()
  const emailResult = await sendReportEmail({
    tipo,
    dados: payload,
    userEmail: user.email,
    createdAt,
  })

  if (!emailResult.ok) {
    console.warn('[SafeMine] e-mail não enviado:', emailResult.error)
  }

  return {
    ok: true,
    dados: payload,
    emailSent: !!emailResult.ok,
    emailTo: getReportEmailTo(),
    emailError: emailResult.ok ? undefined : emailResult.error,
  }
}
