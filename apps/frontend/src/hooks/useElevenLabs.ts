import { useCallback, useRef, useState } from 'react'

interface ElevenLabsOptions {
  apiUrl?: string
  voiceId?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

export function useElevenLabs(options: ElevenLabsOptions = {}) {
  const { 
    apiUrl = '/api/tts/speak',
    voiceId,
    onStart,
    onEnd,
    onError
  } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return

    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsLoading(true)
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // Get audio blob from response
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // Create audio element and play
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onplay = () => {
        setIsSpeaking(true)
        setIsLoading(false)
        onStart?.()
      }

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        onEnd?.()
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        setIsLoading(false)
        URL.revokeObjectURL(audioUrl)
        onError?.('Failed to play audio')
      }

      await audio.play()

    } catch (error: any) {
      setIsLoading(false)
      setIsSpeaking(false)
      
      if (error.name !== 'AbortError') {
        console.error('[ElevenLabs Error]', error)
        onError?.(error.message || 'Failed to generate speech')
      }
    }
  }, [apiUrl, voiceId, onStart, onEnd, onError])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsSpeaking(false)
    setIsLoading(false)
  }, [])

  return {
    speak,
    stop,
    isSpeaking,
    isLoading
  }
}
