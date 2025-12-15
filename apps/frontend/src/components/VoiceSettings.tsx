import { useEffect, useState } from 'react'
import type { VoiceSettings } from '../hooks/useTTS'

export default function VoiceSettingsPanel({ settings, onChange }: { settings: VoiceSettings; onChange: (v: VoiceSettings) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices().filter(v => v.lang?.startsWith('pt')))
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.onvoiceschanged = null as any }
  }, [])

  return (
    <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">Voz da Kaia</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Voz</label>
          <select
            className="px-3 py-2 rounded bg-white/80 text-blue-900"
            value={settings.voice}
            onChange={(e) => onChange({ ...settings, voice: e.target.value })}
          >
            {[settings.voice]
              .concat(voices.map(v => v.name).filter(Boolean))
              .filter((v, i, a) => a.indexOf(v) === i)
              .map(v => (<option key={v} value={v}>{v}</option>))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Velocidade (rate)</label>
          <input className="px-3 py-2 rounded bg-white/80 text-blue-900" value={settings.rate}
           onChange={(e) => onChange({ ...settings, rate: e.target.value })} placeholder="ex.: +0% ou -10%" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Tom (pitch)</label>
          <input className="px-3 py-2 rounded bg-white/80 text-blue-900" value={settings.pitch}
           onChange={(e) => onChange({ ...settings, pitch: e.target.value })} placeholder="ex.: +0Hz ou -2Hz" />
        </div>
      </div>
      <div className="mt-3">
        <button
          onClick={() => {
            const utter = new SpeechSynthesisUtterance('Olá, eu sou a Kaia.')
            utter.lang = 'pt-BR'
            const v = window.speechSynthesis.getVoices().find(x => x.name === settings.voice)
            if (v) utter.voice = v
            window.speechSynthesis.speak(utter)
          }}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Testar Voz
        </button>
      </div>
    </div>
  )
}
