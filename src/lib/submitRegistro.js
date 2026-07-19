import { supabase } from './supabase'
import { sendReportEmail, getReportEmailTo } from './sendReportEmail'
import { createOfflineQueue, createIdbStorage, createMemoryStorage } from './offlineQueue'

/**
 * Upload anexos e grava um registro no Supabase (caminho online).
 */
export async function submitRegistroOnline({ tipo, dados, files = [], user }) {
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

    const {
      data: { publicUrl },
    } = supabase.storage.from('relatos-anexos').getPublicUrl(path)

    anexos.push({ url: publicUrl, name: file.name, type: file.type })
  }

  const payload = {
    ...dados,
    ...(anexos.length ? { anexos } : {}),
    _status: dados._status || 'novo',
  }

  const insertBody = {
    tipo,
    dados: payload,
    user_id: user.id,
    user_email: user.email,
    canal: dados._canal || 'app',
  }
  if (dados._numero) insertBody.numero = dados._numero

  let { error: insertError } = await supabase.from('registros').insert(insertBody)

  // fallback se colunas canal/numero não existirem
  if (insertError && /canal|numero/i.test(insertError.message || '')) {
    const retry = await supabase.from('registros').insert({
      tipo,
      dados: payload,
      user_id: user.id,
      user_email: user.email,
    })
    insertError = retry.error
  }

  if (insertError) {
    return {
      ok: false,
      error: `Falha ao salvar o registro: ${insertError.message}`,
    }
  }

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
    queued: false,
  }
}

let queue = null

function getQueue() {
  if (!queue) {
    const storage =
      typeof indexedDB !== 'undefined' ? createIdbStorage() : createMemoryStorage()
    queue = createOfflineQueue({
      storage,
      isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
      submitFn: submitRegistroOnline,
    })
  }
  return queue
}

/**
 * Envia online ou enfileira offline. Drena fila ao voltar a rede.
 */
export async function submitRegistro(args) {
  const q = getQueue()
  const result = await q.submitOrQueue(args)
  if (result.queued) {
    return {
      ok: true,
      queued: true,
      queueId: result.queueId,
      dados: args.dados,
      message: result.message,
      emailSent: false,
    }
  }
  return result
}

/** Drain pending offline reports (call on online / app mount). */
export async function drainOfflineQueue() {
  return getQueue().drain()
}

export async function listOfflineQueue() {
  return getQueue().list()
}

/** Hook browser online listener once */
let onlineHooked = false
export function hookOfflineQueueDrain() {
  if (typeof window === 'undefined' || onlineHooked) return
  onlineHooked = true
  window.addEventListener('online', () => {
    drainOfflineQueue().then((r) => {
      if (r?.drained > 0) {
        console.info('[SafeMine] fila offline enviada:', r.drained)
      }
    })
  })
  // try drain on load if online
  if (navigator.onLine) {
    drainOfflineQueue().catch(() => {})
  }
}
