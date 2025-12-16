import { useState, useCallback, useRef, useEffect } from 'react'

interface NeuralCoreResponse {
  thought: string
  speak: string
  toolCall?: any
}

interface UseNeuralCoreOptions {
  apiUrl?: string
}

export function useNeuralCore(options: UseNeuralCoreOptions = {}) {
  const apiUrl = options.apiUrl || ''
  
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState<NeuralCoreResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const recognitionRef = useRef<any>(null)

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

    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}/api/ai/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!res.ok) throw new Error('Erro ao processar comando')

      const data = await res.json()
      if (data.success && data.data) {
        setResponse(data.data)
        speak(data.data.speak)
      }
    } catch (error) {
      console.error('[NeuralCore] Erro:', error)
      speak('Desculpe, ocorreu um erro ao processar sua fala.')
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

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

  return {
    isListening,
    isSpeaking,
    transcript,
    response,
    loading,
    startListening,
    stopListening,
    stopSpeaking,
    speak,
    processCommand
  }
}
