/**
 * Fila offline de relatos do app.
 * Storage injetável para testes; no browser usa IndexedDB com fallback localStorage.
 */

const DB_NAME = 'safemine-offline'
const STORE = 'pending_reports'
const LS_KEY = 'safemine_offline_queue_v1'

function id() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Memory storage for tests */
export function createMemoryStorage(seed = []) {
  let items = seed.map((x) => ({ ...x }))
  return {
    async getAll() {
      return items.map((x) => ({ ...x }))
    },
    async put(item) {
      const i = items.findIndex((x) => x.id === item.id)
      if (i >= 0) items[i] = { ...item }
      else items.push({ ...item })
    },
    async remove(itemId) {
      items = items.filter((x) => x.id !== itemId)
    },
    async clear() {
      items = []
    },
  }
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no_idb'))
      return
    }
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => reject(req.error || new Error('idb_open'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export function createIdbStorage() {
  return {
    async getAll() {
      try {
        const db = await openIdb()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readonly')
          const req = tx.objectStore(STORE).getAll()
          req.onsuccess = () => resolve(req.result || [])
          req.onerror = () => reject(req.error)
        })
      } catch {
        return lsGetAll()
      }
    },
    async put(item) {
      try {
        const db = await openIdb()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).put(item)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch {
        lsPut(item)
      }
    },
    async remove(itemId) {
      try {
        const db = await openIdb()
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, 'readwrite')
          tx.objectStore(STORE).delete(itemId)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch {
        lsRemove(itemId)
      }
    },
  }
}

function lsGetAll() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsPut(item) {
  const all = lsGetAll().filter((x) => x.id !== item.id)
  // strip large binary from localStorage fallback
  const safe = {
    ...item,
    audioBase64: item.audioBase64 && item.audioBase64.length > 200000 ? null : item.audioBase64,
  }
  all.push(safe)
  localStorage.setItem(LS_KEY, JSON.stringify(all))
}

function lsRemove(itemId) {
  const all = lsGetAll().filter((x) => x.id !== itemId)
  localStorage.setItem(LS_KEY, JSON.stringify(all))
}

/**
 * @param {{ storage?: { getAll, put, remove }, isOnline?: () => boolean, submitFn: Function }} opts
 */
export function createOfflineQueue(opts) {
  const storage = opts.storage || createMemoryStorage()
  const isOnline = opts.isOnline || (() => typeof navigator !== 'undefined' && navigator.onLine !== false)
  const submitFn = opts.submitFn
  let draining = false

  async function enqueue(payload) {
    const item = {
      id: id(),
      createdAt: new Date().toISOString(),
      ...payload,
    }
    await storage.put(item)
    return item
  }

  async function list() {
    return storage.getAll()
  }

  async function dequeue(itemId) {
    await storage.remove(itemId)
  }

  /**
   * Tenta enviar. Se offline, enfileira e retorna queued.
   */
  async function submitOrQueue(args) {
    if (!isOnline()) {
      const item = await enqueue({
        tipo: args.tipo,
        dados: args.dados,
        // files as serializable meta only — blobs handled by caller if needed
        filesMeta: (args.files || []).map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
        })),
        userId: args.user?.id,
        userEmail: args.user?.email,
      })
      return {
        ok: true,
        queued: true,
        queueId: item.id,
        message: 'Sem conexão. Relato salvo na fila e será enviado quando a rede voltar.',
      }
    }
    const result = await submitFn(args)
    return { ...result, queued: false }
  }

  /**
   * Drena a fila chamando submitFn uma vez por item (sucesso remove).
   */
  async function drain() {
    if (draining) return { drained: 0, skipped: true }
    if (!isOnline()) return { drained: 0, offline: true }
    draining = true
    let drained = 0
    const errors = []
    try {
      const items = await storage.getAll()
      // oldest first
      items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      for (const item of items) {
        try {
          const result = await submitFn({
            tipo: item.tipo,
            dados: {
              ...(item.dados || {}),
              _offline_queued_at: item.createdAt,
              _offline_queue_id: item.id,
            },
            files: [],
            user: item.userId
              ? { id: item.userId, email: item.userEmail }
              : argsUserFromItem(item),
          })
          if (result?.ok) {
            await storage.remove(item.id)
            drained += 1
          } else {
            errors.push({ id: item.id, error: result?.error || 'submit_failed' })
          }
        } catch (e) {
          errors.push({ id: item.id, error: e?.message || 'exception' })
        }
      }
    } finally {
      draining = false
    }
    return { drained, errors }
  }

  return { enqueue, list, dequeue, submitOrQueue, drain, isOnline }
}

function argsUserFromItem(item) {
  if (!item.userId) return null
  return { id: item.userId, email: item.userEmail }
}

/** Singleton browser helper */
let browserQueue = null

export function getBrowserOfflineQueue(submitFn) {
  if (!browserQueue) {
    browserQueue = createOfflineQueue({
      storage: typeof indexedDB !== 'undefined' ? createIdbStorage() : createMemoryStorage(),
      isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
      submitFn,
    })
  } else if (submitFn) {
    // refresh submit binding
    browserQueue = createOfflineQueue({
      storage: typeof indexedDB !== 'undefined' ? createIdbStorage() : createMemoryStorage(),
      isOnline: () => typeof navigator === 'undefined' || navigator.onLine !== false,
      submitFn,
    })
  }
  return browserQueue
}
