import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeech() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking' | 'unavailable'>('checking')
  const recRef = useRef<any | null>(null)
  const hasAutoStarted = useRef(false)

  // Helper function to request microphone permission
  const requestMicPermission = useCallback(async (): Promise<'granted' | 'denied' | 'unavailable'> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return 'granted'
    } catch (err) {
      const errorName = (err as any).name
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return 'denied'
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        return 'unavailable'
      }
      return 'denied'
    }
  }, [])

  // Request microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await requestMicPermission()
      setPermissionStatus(status)
    }
    checkPermission()
  }, [requestMicPermission])

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

  // Auto-start listening when permission is granted (only once)
  useEffect(() => {
    if (permissionStatus === 'granted' && recRef.current && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      setTranscript('')
      setListening(true)
      recRef.current.start()
    }
  }, [permissionStatus])

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

  const requestPermission = useCallback(async () => {
    const status = await requestMicPermission()
    setPermissionStatus(status)
  }, [requestMicPermission])

  return { listening, transcript, start, stop, speak, supported: Boolean(SpeechRecognition), permissionStatus, requestPermission }
}
