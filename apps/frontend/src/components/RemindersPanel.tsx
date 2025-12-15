import { useEffect, useState } from 'react'
import { listReminders, createReminder } from '../lib/api'

type Reminder = {
  id: number
  title: string
  notes?: string
  whenAt: string
  created: string
}

export default function RemindersPanel() {
  const [items, setItems] = useState<Reminder[]>([])
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listReminders()
      if (res.success) setItems(res.data)
      else setError(res.error || 'Erro ao buscar lembretes')
    } catch (e) {
      setError('Erro de rede ao buscar lembretes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async () => {
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await createReminder({ title: title.trim(), when: when.trim() || undefined })
      if (!res.success) {
        setError(res.error || 'Erro ao criar lembrete')
      } else {
        setTitle('')
        setWhen('')
        await load()
      }
    } catch (e) {
      setError('Erro de rede ao criar lembrete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Lembretes</h2>
      <div className="flex flex-col md:flex-row gap-2 mb-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do lembrete"
          className="flex-1 px-3 py-2 rounded bg-white/80 text-blue-900 placeholder-blue-900/60"
        />
        <input
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          placeholder="Quando (ex.: amanhã às 9)"
          className="flex-1 px-3 py-2 rounded bg-white/80 text-blue-900 placeholder-blue-900/60"
        />
        <button
          onClick={onCreate}
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      {error && <div className="text-yellow-200 mb-2">{error}</div>}
      <div className="divide-y divide-white/10">
        {loading && items.length === 0 && (
          <div className="py-4 text-white/80">Carregando…</div>
        )}
        {items.map(r => (
          <div key={r.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.title}</div>
              <div className="text-white/70 text-sm">Para: {new Date(r.whenAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="py-4 text-white/80">Nenhum lembrete ainda.</div>
        )}
      </div>
    </div>
  )
}
