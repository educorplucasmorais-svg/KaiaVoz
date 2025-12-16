import { useCallback, useEffect, useState, useRef } from 'react'

export type VoiceSettings = {
  voice: string
  rate: string // e.g., '+0%'
  pitch: string // e.g., '+0Hz'
}

const DEFAULTS: VoiceSettings = {
  voice: 'pt-BR-FranciscaNeural',
  rate: '+0%',
  pitch: '+0Hz'
}

export function useTTS() {
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('kaia.voice')
      return saved ? JSON.parse(saved) as VoiceSettings : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const voicesLoaded = useRef(false)

  // Load voices - they may not be available immediately
  useEffect(() => {
    const synth = window.speechSynthesis
    
    const loadVoices = () => {
      const availableVoices = synth.getVoices()
      if (availableVoices.length > 0) {
        setVoices(availableVoices)
        voicesLoaded.current = true
        console.log('[Kaia TTS] Vozes carregadas:', availableVoices.length)
        // Log pt-BR voices for debugging
        const ptVoices = availableVoices.filter(v => v.lang.startsWith('pt'))
        console.log('[Kaia TTS] Vozes pt-BR disponíveis:', ptVoices.map(v => v.name))
      }
    }

    // Try to load immediately
    loadVoices()

    // Also listen for voiceschanged event (Chrome loads voices async)
    synth.addEventListener('voiceschanged', loadVoices)

    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('kaia.voice', JSON.stringify(settings))
  }, [settings])

  const speak = useCallback((text: string) => {
    const synth = window.speechSynthesis
    
    // Cancel any ongoing speech
    synth.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    
    // Apply rate (convert percentage to 0.5-2 range)
    const ratePct = parseFloat(settings.rate.replace(/[+%]/g, '')) || 0
    utter.rate = Math.max(0.5, Math.min(2, 1 + ratePct / 100))
    
    // Apply pitch (convert Hz offset to 0-2 range)
    const pitchHz = parseFloat(settings.pitch.replace(/[+Hz]/g, '')) || 0
    utter.pitch = Math.max(0, Math.min(2, 1 + pitchHz / 50))

    // Find voice - prefer exact match, then any pt-BR voice
    const availableVoices = synth.getVoices()
    const selectedVoice = availableVoices.find(v => v.name === settings.voice) 
      || availableVoices.find(v => v.lang === 'pt-BR')
      || availableVoices.find(v => v.lang.startsWith('pt'))
    
    if (selectedVoice) {
      utter.voice = selectedVoice
      console.log('[Kaia TTS] Usando voz:', selectedVoice.name)
    } else {
      console.warn('[Kaia TTS] Nenhuma voz pt-BR encontrada, usando padrão do sistema')
    }

    // Error handling
    utter.onerror = (e) => {
      console.error('[Kaia TTS] Erro ao falar:', e.error)
    }

    utter.onstart = () => {
      console.log('[Kaia TTS] Iniciando fala:', text.substring(0, 50) + '...')
    }

    synth.speak(utter)
  }, [settings])

  return { settings, setSettings, speak, voices }
}
