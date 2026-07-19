import { describe, it, expect, vi } from 'vitest'
import { createOfflineQueue, createMemoryStorage } from './offlineQueue.js'

describe('offlineQueue', () => {
  it('enqueues when offline and does not call submit', async () => {
    const submitFn = vi.fn(async () => ({ ok: true }))
    const q = createOfflineQueue({
      storage: createMemoryStorage(),
      isOnline: () => false,
      submitFn,
    })
    const r = await q.submitOrQueue({
      tipo: 'seguranca',
      dados: { local: 'Banco 3', descricao_ocorrencia: 'teste' },
      user: { id: 'u1', email: 'a@b.com' },
      files: [],
    })
    expect(r.ok).toBe(true)
    expect(r.queued).toBe(true)
    expect(submitFn).not.toHaveBeenCalled()
    const list = await q.list()
    expect(list).toHaveLength(1)
    expect(list[0].tipo).toBe('seguranca')
  })

  it('drains queue once online calling submit once per item', async () => {
    const submitFn = vi.fn(async () => ({ ok: true }))
    const storage = createMemoryStorage()
    const q = createOfflineQueue({
      storage,
      isOnline: () => false,
      submitFn,
    })
    await q.submitOrQueue({
      tipo: 'seguranca',
      dados: { local: 'A' },
      user: { id: 'u1', email: 'a@b.com' },
    })
    await q.submitOrQueue({
      tipo: 'ambiental',
      dados: { local: 'B' },
      user: { id: 'u1', email: 'a@b.com' },
    })
    expect(submitFn).not.toHaveBeenCalled()

    const onlineQ = createOfflineQueue({
      storage,
      isOnline: () => true,
      submitFn,
    })
    const drain = await onlineQ.drain()
    expect(drain.drained).toBe(2)
    expect(submitFn).toHaveBeenCalledTimes(2)
    expect(submitFn.mock.calls[0][0].tipo).toBe('seguranca')
    expect(submitFn.mock.calls[1][0].tipo).toBe('ambiental')
    const left = await onlineQ.list()
    expect(left).toHaveLength(0)
  })

  it('online path calls submit immediately', async () => {
    const submitFn = vi.fn(async () => ({ ok: true, dados: {} }))
    const q = createOfflineQueue({
      storage: createMemoryStorage(),
      isOnline: () => true,
      submitFn,
    })
    const r = await q.submitOrQueue({
      tipo: 'veiculo',
      dados: { placa: 'ABC' },
      user: { id: 'u1' },
    })
    expect(r.queued).toBe(false)
    expect(submitFn).toHaveBeenCalledTimes(1)
  })
})
