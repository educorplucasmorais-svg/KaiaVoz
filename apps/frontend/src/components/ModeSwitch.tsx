import type { KaiaMode } from '@kaia/shared'

interface Props {
  mode: KaiaMode
  onChange: (m: KaiaMode) => void
}

export default function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium ${mode === 'assistente' ? 'bg-white/80 text-blue-900' : 'bg-white/20 text-white'}`}
        onClick={() => onChange('assistente')}
      >
        Kaia – Assistente
      </button>
      <button
        className={`px-4 py-2 rounded-full text-sm font-medium ${mode === 'codigo' ? 'bg-white/80 text-blue-900' : 'bg-white/20 text-white'}`}
        onClick={() => onChange('codigo')}
      >
        Kaia – Código
      </button>
    </div>
  )
}
