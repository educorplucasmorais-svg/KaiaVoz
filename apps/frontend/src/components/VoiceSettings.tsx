import { useEffect, useState } from 'react'
import type { VoiceSettings, TTSProvider } from '../hooks/useTTS'

interface VoiceSettingsPanelProps {
  settings: VoiceSettings
  onChange: (v: VoiceSettings) => void
  serverProvider?: TTSProvider | null
  onTestVoice?: () => void
}

export default function VoiceSettingsPanel({ settings, onChange, serverProvider, onTestVoice }: VoiceSettingsPanelProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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

  const getProviderLabel = (provider: TTSProvider | null | undefined) => {
    switch (provider) {
      case 'elevenlabs':
        return 'ElevenLabs'
      case 'edge-tts':
        return 'Edge TTS'
      case 'browser':
      default:
        return 'Navegador (Web Speech API)'
    }
  }

  const handleTestVoice = () => {
    if (onTestVoice) {
      onTestVoice()
    } else {
      // Fallback to browser TTS
      const utter = new SpeechSynthesisUtterance('Olá, eu sou a Kaia.')
      utter.lang = 'pt-BR'
      const v = window.speechSynthesis.getVoices().find(x => x.name === settings.voice)
      if (v) utter.voice = v
      window.speechSynthesis.speak(utter)
    }
  }

  return (
    <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Voz da Kaia</h2>
        {serverProvider && (
          <span className={`text-xs px-3 py-1 rounded-full border ${
            serverProvider === 'elevenlabs' 
              ? 'bg-purple-500/20 text-purple-200 border-purple-400/40' 
              : 'bg-blue-500/20 text-blue-200 border-blue-400/40'
          }`}>
            {getProviderLabel(serverProvider)}
          </span>
        )}
      </div>
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
          onClick={handleTestVoice}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          ▶️ Testar Voz
        </button>
        {voices.length === 0 && (
          <span className="text-yellow-300 text-sm">Carregando vozes...</span>
        )}
      </div>
    </div>
  )
}
