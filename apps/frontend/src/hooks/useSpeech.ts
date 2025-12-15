import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeech() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<any | null>(null)

  useEffect(() => {
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: any) => {
      let text = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      setTranscript(text.trim())
    }

    rec.onend = () => {
      setListening(false)
    }

    recRef.current = rec
  }, [SpeechRecognition])

  const start = useCallback(() => {
    if (recRef.current && !listening) {
      setTranscript('')
      setListening(true)
      recRef.current.start()
    }
  }, [listening])

  const stop = useCallback(() => {
    if (recRef.current && listening) {
      recRef.current.stop()
    }
  }, [listening])

  const speak = useCallback((text: string) => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    window.speechSynthesis.speak(utter)
  }, [])

  return { listening, transcript, start, stop, speak, supported: Boolean(SpeechRecognition) }
}
