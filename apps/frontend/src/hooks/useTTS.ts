import { useCallback, useEffect, useState } from 'react'

export type VoiceSettings = {
  voice: string
  rate: string // e.g., '+0%'
  pitch: string // e.g., '+0Hz'
}

const DEFAULTS: VoiceSettings = {
  voice: 'pt-BR-AntonioNeural',
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

  useEffect(() => {
    localStorage.setItem('kaia.voice', JSON.stringify(settings))
  }, [settings])

  const speak = useCallback(async (text: string) => {
    const synth = window.speechSynthesis
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    // apply rate/pitch
    const rateMatch = /^([+-]?\d+)%$/.exec(settings.rate.replace('%',''))
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

  return { settings, setSettings, speak }
}
