import { useCallback, useEffect, useRef, useState } from 'react'

// Configuration for Voice Activity Detection (VAD)
export interface VADConfig {
  /** Silence threshold in milliseconds before finalizing speech (default: 1500ms) */
  silenceTimeout: number
  /** Maximum recording duration in milliseconds (default: 30000ms) */
  maxDuration: number
  /** Auto-restart recognition after silence/end (default: true) */
  autoRestart: boolean
  /** Retry attempts on error before giving up (default: 3) */
  maxRetries: number
}

const DEFAULT_VAD_CONFIG: VADConfig = {
  silenceTimeout: 1500,
  maxDuration: 30000,
  autoRestart: true,
  maxRetries: 3
}

export type SpeechErrorCode = 
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'network'
  | 'aborted'
  | 'language-not-supported'
  | 'service-not-allowed'
  | 'unknown'

export interface SpeechError {
  code: SpeechErrorCode
  message: string
  recoverable: boolean
}

export function useSpeech(vadConfig: Partial<VADConfig> = {}) {
  const config = { ...DEFAULT_VAD_CONFIG, ...vadConfig }
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'checking' | 'unavailable'>('checking')
  const [lastError, setLastError] = useState<SpeechError | null>(null)
  const [confidence, setConfidence] = useState<number>(0)
  const recRef = useRef<any | null>(null)
  const hasAutoStarted = useRef(false)
  const retryCountRef = useRef(0)
  const restartCountRef = useRef(0) // Separate counter for auto-restarts
  const restartBackoffMs = useRef(100) // Backoff delay for auto-restarts
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSpeechTimeRef = useRef<number>(Date.now())

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

  // On mount, automatically request microphone permission
  useEffect(() => {
    // Check if Speech Recognition is supported
    if (!SpeechRecognition) {
      setPermissionStatus('unavailable')
      return
    }
    
    // Automatically request microphone permission on page load
    const autoRequestPermission = async () => {
      setPermissionStatus('checking')
      const status = await requestMicPermission()
      setPermissionStatus(status)
    }
    
    autoRequestPermission()
  }, [SpeechRecognition, requestMicPermission])

  // Clear all timeouts helper
  const clearAllTimeouts = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current)
      maxDurationTimeoutRef.current = null
    }
  }, [])

  // Parse error code from SpeechRecognition error event
  const parseErrorCode = useCallback((errorEvent: any): SpeechError => {
    const errorCode = errorEvent?.error || 'unknown'
    const errorMap: Record<string, SpeechError> = {
      'no-speech': {
        code: 'no-speech',
        message: 'Nenhuma fala detectada. Tente falar mais alto ou próximo ao microfone.',
        recoverable: true
      },
      'audio-capture': {
        code: 'audio-capture',
        message: 'Não foi possível capturar áudio. Verifique se o microfone está conectado.',
        recoverable: true
      },
      'not-allowed': {
        code: 'not-allowed',
        message: 'Permissão para usar o microfone foi negada.',
        recoverable: false
      },
      'network': {
        code: 'network',
        message: 'Erro de rede ao processar a fala. Verifique sua conexão.',
        recoverable: true
      },
      'aborted': {
        code: 'aborted',
        message: 'Reconhecimento de fala foi cancelado.',
        recoverable: true
      },
      'language-not-supported': {
        code: 'language-not-supported',
        message: 'Idioma português brasileiro não suportado neste navegador.',
        recoverable: false
      },
      'service-not-allowed': {
        code: 'service-not-allowed',
        message: 'Serviço de reconhecimento de fala não disponível.',
        recoverable: false
      }
    }
    return errorMap[errorCode] || {
      code: 'unknown',
      message: `Erro desconhecido no reconhecimento de fala: ${errorCode}`,
      recoverable: true
    }
  }, [])

  useEffect(() => {
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (e: any) => {
      lastSpeechTimeRef.current = Date.now()
      let interimText = ''
      let finalText = ''
      let bestConfidence = 0
      
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0].transcript
        const resultConfidence = result[0].confidence || 0
        
        if (result.isFinal) {
          finalText += text + ' '
          if (resultConfidence > bestConfidence) {
            bestConfidence = resultConfidence
          }
        } else {
          interimText += text
        }
      }
      
      // Update confidence score
      if (bestConfidence > 0) {
        setConfidence(bestConfidence)
      }

      // Update interim transcript separately for UI feedback
      setInterimTranscript(interimText)
      
      // Prioritize final results, fall back to interim
      const currentText = (finalText + interimText).trim()
      setTranscript(currentText)

      // Reset silence timeout when any speech is detected (interim or final)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current)
      }
      
      // Set up silence detection (VAD) - triggers when user stops speaking
      // Trigger on any speech activity (currentText), not just final results
      if (config.silenceTimeout > 0 && currentText) {
        silenceTimeoutRef.current = setTimeout(() => {
          console.log('[VAD] Silence detected, finalizing speech')
          // Emit the final transcript when silence is detected
          if (currentText && listening) {
            setTranscript(currentText)
          }
        }, config.silenceTimeout)
      }
    }

    rec.onerror = (event: any) => {
      const error = parseErrorCode(event)
      console.error('[Speech Recognition Error]', error.code, error.message)
      setLastError(error)
      
      // Handle recoverable errors with retry logic
      if (error.recoverable && retryCountRef.current < config.maxRetries) {
        retryCountRef.current++
        console.log(`[Speech] Retry attempt ${retryCountRef.current}/${config.maxRetries}`)
        setTimeout(() => {
          if (listening && recRef.current) {
            try {
              recRef.current.start()
            } catch {
              // Recognition might already be started
            }
          }
        }, 500)
      } else if (!error.recoverable) {
        setListening(false)
        clearAllTimeouts()
      }
    }

    rec.onend = () => {
      clearAllTimeouts()
      
      // Auto-restart if configured and not manually stopped
      // Use separate restart counter with exponential backoff to prevent infinite loops
      const maxRestarts = 10 // Max auto-restarts before giving up
      if (config.autoRestart && listening && restartCountRef.current < maxRestarts) {
        restartCountRef.current++
        
        // Calculate backoff delay: 100ms, 200ms, 400ms, 800ms, etc. (max 5000ms)
        const backoffDelay = Math.min(restartBackoffMs.current * Math.pow(1.5, restartCountRef.current - 1), 5000)
        
        console.log(`[Speech] Auto-restarting recognition (attempt ${restartCountRef.current}/${maxRestarts}, delay: ${Math.round(backoffDelay)}ms)`)
        setTimeout(() => {
          if (recRef.current && listening) {
            try {
              recRef.current.start()
            } catch {
              // Recognition might already be started
            }
          }
        }, backoffDelay)
      } else {
        if (restartCountRef.current >= 10) {
          console.warn('[Speech] Max auto-restarts reached, stopping')
        }
        setListening(false)
        restartCountRef.current = 0 // Reset for next session
      }
    }

    rec.onspeechstart = () => {
      console.log('[Speech] User started speaking')
      lastSpeechTimeRef.current = Date.now()
      retryCountRef.current = 0 // Reset retry count when speech is detected
      restartCountRef.current = 0 // Reset restart count when speech is detected
      restartBackoffMs.current = 100 // Reset backoff
      setLastError(null)
    }

    rec.onspeechend = () => {
      console.log('[Speech] User stopped speaking')
    }

    recRef.current = rec

    // Cleanup on unmount
    return () => {
      clearAllTimeouts()
      if (recRef.current) {
        try {
          recRef.current.stop()
        } catch {
          // Ignore errors on cleanup
        }
      }
    }
  }, [SpeechRecognition, config.silenceTimeout, config.autoRestart, config.maxRetries, listening, parseErrorCode, clearAllTimeouts])

  // Auto-start listening when permission is granted (only once)
  useEffect(() => {
    if (permissionStatus === 'granted' && recRef.current && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      setTranscript('')
      setInterimTranscript('')
      setListening(true)
      retryCountRef.current = 0
      
      // Set up max duration timeout
      if (config.maxDuration > 0) {
        maxDurationTimeoutRef.current = setTimeout(() => {
          console.log('[VAD] Max duration reached, stopping recognition')
          if (recRef.current) {
            recRef.current.stop()
          }
        }, config.maxDuration)
      }
      
      recRef.current.start()
    }
  }, [permissionStatus, config.maxDuration])

  const start = useCallback(() => {
    if (recRef.current && !listening) {
      setTranscript('')
      setInterimTranscript('')
      setLastError(null)
      retryCountRef.current = 0
      setListening(true)
      
      // Set up max duration timeout
      if (config.maxDuration > 0) {
        maxDurationTimeoutRef.current = setTimeout(() => {
          console.log('[VAD] Max duration reached, stopping recognition')
          if (recRef.current) {
            recRef.current.stop()
          }
        }, config.maxDuration)
      }
      
      try {
        recRef.current.start()
      } catch (err) {
        console.error('[Speech] Failed to start recognition:', err)
        setListening(false)
      }
    }
  }, [listening, config.maxDuration])

  const stop = useCallback(() => {
    clearAllTimeouts()
    if (recRef.current && listening) {
      setListening(false) // Set immediately to prevent auto-restart
      recRef.current.stop()
    }
  }, [listening, clearAllTimeouts])

  const clearError = useCallback(() => {
    setLastError(null)
    retryCountRef.current = 0
  }, [])

  const speak = useCallback((text: string) => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    window.speechSynthesis.speak(utter)
  }, [])

  const requestPermission = useCallback(async () => {
    const status = await requestMicPermission()
    setPermissionStatus(status)
  }, [requestMicPermission])

  return { 
    // State
    listening, 
    transcript, 
    interimTranscript,
    confidence,
    lastError,
    permissionStatus, 
    supported: Boolean(SpeechRecognition),
    // Actions
    start, 
    stop, 
    speak, 
    requestPermission,
    clearError
  }
}
