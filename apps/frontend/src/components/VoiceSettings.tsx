import { useEffect, useState } from 'react'
import type { VoiceSettings } from '../hooks/useTTS'

export default function VoiceSettingsPanel({ settings, onChange }: { settings: VoiceSettings; onChange: (v: VoiceSettings) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    const synth = window.speechSynthesis
    const load = () => {
      const allVoices = synth.getVoices()
      // Prioritize pt-BR, then pt, then all voices as fallback
      const ptVoices = allVoices.filter(v => v.lang?.startsWith('pt'))
      setVoices(ptVoices.length > 0 ? ptVoices : allVoices)
      console.log('[VoiceSettings] Vozes disponíveis:', ptVoices.map(v => v.name))
    }
    load()
    synth.addEventListener('voiceschanged', load)
    return () => { synth.removeEventListener('voiceschanged', load) }
  }, [])

  const testVoice = () => {
    const synth = window.speechSynthesis
    synth.cancel() // Cancel any ongoing speech
    
    setIsSpeaking(true)
    const utter = new SpeechSynthesisUtterance('Olá! Eu sou a Kaia, sua assistente de voz.')
    utter.lang = 'pt-BR'
    
    // Apply settings
    const ratePct = parseFloat(settings.rate.replace(/[+%]/g, '')) || 0
    utter.rate = Math.max(0.5, Math.min(2, 1 + ratePct / 100))
    
    const pitchHz = parseFloat(settings.pitch.replace(/[+Hz]/g, '')) || 0
    utter.pitch = Math.max(0, Math.min(2, 1 + pitchHz / 50))
    
    const selectedVoice = synth.getVoices().find(x => x.name === settings.voice) 
      || synth.getVoices().find(x => x.lang === 'pt-BR')
    if (selectedVoice) utter.voice = selectedVoice
    
    utter.onend = () => setIsSpeaking(false)
    utter.onerror = () => setIsSpeaking(false)
    
    synth.speak(utter)
  }

  return (
    <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">🔊 Voz da Kaia</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Voz</label>
          <select
            className="px-3 py-2 rounded bg-white/80 text-blue-900"
            value={settings.voice}
            onChange={(e) => onChange({ ...settings, voice: e.target.value })}
          >
            {voices.length === 0 ? (
              <option value={settings.voice}>{settings.voice} (carregando...)</option>
            ) : (
              voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} {v.localService ? '(local)' : '(online)'}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Velocidade</label>
          <input 
            className="px-3 py-2 rounded bg-white/80 text-blue-900" 
            value={settings.rate}
            onChange={(e) => onChange({ ...settings, rate: e.target.value })} 
            placeholder="ex.: +0% ou -10%" 
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-white/80">Tom</label>
          <input 
            className="px-3 py-2 rounded bg-white/80 text-blue-900" 
            value={settings.pitch}
            onChange={(e) => onChange({ ...settings, pitch: e.target.value })} 
            placeholder="ex.: +0Hz ou -2Hz" 
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <button
          onClick={testVoice}
          disabled={isSpeaking}
          className={`px-4 py-2 rounded text-white transition-colors ${
            isSpeaking ? 'bg-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSpeaking ? '🔊 Falando...' : '▶️ Testar Voz'}
        </button>
        {voices.length === 0 && (
          <span className="text-yellow-300 text-sm">Carregando vozes...</span>
        )}
      </div>
    </div>
  )
}
