import { useCallback, useEffect, useState } from 'react'

export type TTSProvider = 'browser' | 'edge-tts' | 'elevenlabs'

export type VoiceSettings = {
  voice: string
  rate: string // e.g., '+0%'
  pitch: string // e.g., '+0Hz'
  provider?: TTSProvider
}

const DEFAULTS: VoiceSettings = {
  voice: 'pt-BR-AntonioNeural',
  rate: '+0%',
  pitch: '+0Hz',
  provider: 'browser'
}

const base = import.meta.env.VITE_API_URL || ''

export function useTTS() {
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('kaia.voice')
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } as VoiceSettings : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })
  const [serverProvider, setServerProvider] = useState<TTSProvider | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch server TTS provider info on mount
  useEffect(() => {
    fetch(`${base}/api/tts/provider`)
      .then(r => r.json())
      .then((json: { success: boolean; data?: { provider: string } }) => {
        if (json.success && json.data?.provider) {
          setServerProvider(json.data.provider as TTSProvider)
        }
      })
      .catch(() => {
        // Server TTS not available, use browser fallback
        setServerProvider(null)
      })
  }, [])

  useEffect(() => {
    localStorage.setItem('kaia.voice', JSON.stringify(settings))
  }, [settings])

  // Speak using server-side TTS (ElevenLabs or Edge TTS)
  const speakWithServer = useCallback(async (text: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await fetch(`${base}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: settings.voice,
          rate: settings.rate,
          pitch: settings.pitch,
        }),
      })

      if (!response.ok) {
        console.error('Server TTS error:', response.status)
        return false
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          setLoading(false)
          resolve(true)
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          setLoading(false)
          resolve(false)
        }
        audio.play().catch(() => {
          setLoading(false)
          resolve(false)
        })
      })
    } catch (err) {
      console.error('Server TTS error:', err)
      setLoading(false)
      return false
    }
  }, [settings])

  // Speak using browser's Web Speech API (fallback)
  const speakWithBrowser = useCallback((text: string) => {
    const synth = window.speechSynthesis
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    // apply rate/pitch
    // speechSynthesis rate is 0.1 to 10, default 1; we'll map +/-% roughly
    const baseRate = 1
    const ratePct = parseFloat(settings.rate.replace('%','')) || 0
    utter.rate = Math.max(0.5, Math.min(2, baseRate * (1 + ratePct/100)))
    const pitchHz = parseFloat(settings.pitch.replace('Hz',''))
    if (!isNaN(pitchHz)) {
      // voice pitch range 0-2; map +/-Hz loosely
      const basePitch = 1
      utter.pitch = Math.max(0, Math.min(2, basePitch + (pitchHz/10)))
    }
    const voices = synth.getVoices()
    const v = voices.find(v => v.name === settings.voice || v.lang === 'pt-BR')
    if (v) utter.voice = v
    synth.speak(utter)
  }, [settings])

  const speak = useCallback(async (text: string) => {
    // Use server-side TTS if available (ElevenLabs or Edge TTS)
    if (serverProvider && serverProvider !== 'browser') {
      const success = await speakWithServer(text)
      if (success) return
    }
    // Fallback to browser's Web Speech API
    speakWithBrowser(text)
  }, [serverProvider, speakWithServer, speakWithBrowser])

  return { 
    settings, 
    setSettings, 
    speak, 
    serverProvider, 
    loading,
    isElevenLabs: serverProvider === 'elevenlabs'
  }
}
