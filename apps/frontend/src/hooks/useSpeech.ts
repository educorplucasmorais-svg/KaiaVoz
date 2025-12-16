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
    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('MediaDevices API not available')
      return 'unavailable'
    }

    try {
      // Try to get microphone access directly - this will prompt for permission
      // Note: enumerateDevices() may return empty list before permission is granted (browser privacy)
      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted!')
      stream.getTracks().forEach(track => track.stop())
      return 'granted'
    } catch (err) {
      const error = err as Error
      console.warn('Microphone permission error:', error.name, error.message)
      
      const errorName = error.name
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        return 'denied'
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError' || errorName === 'OverconstrainedError') {
        return 'unavailable'
      }
      // For other errors, treat as denied but allow retry
      return 'denied'
    }
  }, [])

  // On mount, set to 'prompt' state (don't auto-check, wait for user to click)
  // This is better UX because browsers may block auto-permission requests
  useEffect(() => {
    // Check if Speech Recognition is supported
    if (!SpeechRecognition) {
      setPermissionStatus('unavailable')
      return
    }
    // Start in 'prompt' state - user needs to click to enable microphone
    setPermissionStatus('prompt')
  }, [SpeechRecognition])

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
