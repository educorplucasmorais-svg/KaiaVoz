import { useState, useCallback, useRef, useEffect } from 'react'

interface NeuralCoreResponse {
  thought: string
  speak: string
  toolCall?: any
}

interface ProcessingMetrics {
  /** Time to process the command (TTFT - Time To First Token approximation) */
  processingTimeMs: number
  /** Timestamp when processing started */
  startedAt: number
  /** Timestamp when response was received */
  completedAt: number
}

interface UseNeuralCoreOptions {
  apiUrl?: string
  /** Timeout for API requests in milliseconds (default: 10000) */
  timeout?: number
  /** Enable latency logging (default: true) */
  logLatency?: boolean
}

export function useNeuralCore(options: UseNeuralCoreOptions = {}) {
  const { 
    apiUrl = '', 
    timeout = 10000,
    logLatency = true 
  } = options
  
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState<NeuralCoreResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMetrics, setLastMetrics] = useState<ProcessingMetrics | null>(null)

  const recognitionRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Inicializar reconhecimento de voz
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'pt-BR'

    recognition.onstart = () => setIsListening(true)
    
    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      
      const currentText = (finalTranscript + interimTranscript).trim()
      setTranscript(currentText)
      
      if (finalTranscript) {
        processCommand(finalTranscript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      console.error('[NeuralCore] Erro:', event.error)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const processCommand = useCallback(async (text: string) => {
    if (!text) return

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const startTime = Date.now()
    setLoading(true)
    setError(null)

    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Create timeout promise with cleanup
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout ao processar comando')), timeout)
      })

      // Fetch with timeout
      const fetchPromise = fetch(`${apiUrl}/api/ai/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal
      })

      const res = await Promise.race([fetchPromise, timeoutPromise])

      // Clear timeout after request completes to prevent memory leak
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `Erro HTTP ${res.status}`)
      }

      const data = await res.json()
      const completedAt = Date.now()
      const processingTimeMs = completedAt - startTime

      // Log latency metrics
      if (logLatency) {
        console.log(`[NeuralCore] Latência: ${processingTimeMs}ms`)
        if (processingTimeMs > 300) {
          console.warn(`[NeuralCore] ⚠️ Latência acima do ideal (> 300ms): ${processingTimeMs}ms`)
        }
      }

      // Update metrics
      setLastMetrics({
        processingTimeMs,
        startedAt: startTime,
        completedAt
      })

      if (data.success && data.data) {
        setResponse(data.data)
        speak(data.data.speak)
      } else {
        throw new Error(data.error || 'Resposta inválida do servidor')
      }
    } catch (err) {
      // Clear timeout on error to prevent memory leak
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      
      // Don't log aborted requests as errors
      if (errorMessage.includes('aborted') || (err as any)?.name === 'AbortError') {
        console.log('[NeuralCore] Requisição cancelada')
        return
      }

      console.error('[NeuralCore] Erro:', errorMessage)
      setError(errorMessage)
      
      // Provide specific error feedback to user
      if (errorMessage.includes('Timeout')) {
        speak('Desculpe, o servidor demorou muito para responder. Tente novamente.')
      } else if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        speak('Desculpe, não consegui me conectar ao servidor. Verifique sua conexão.')
      } else {
        speak('Desculpe, ocorreu um erro ao processar sua fala. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }, [apiUrl, timeout, logLatency])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.0

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      recognitionRef.current.start()
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isListening,
    isSpeaking,
    transcript,
    response,
    loading,
    error,
    lastMetrics,
    // Actions
    startListening,
    stopListening,
    stopSpeaking,
    speak,
    processCommand,
    clearError
  }
}
