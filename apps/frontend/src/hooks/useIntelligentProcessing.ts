import { useCallback, useState } from 'react'

export type CommandResponse = {
  shouldRespond: boolean
  response?: string
  action?: 'speak' | 'execute' | 'reminder' | 'none'
}

/**
 * Hook para processar comandos de forma inteligente
 * Mantém histórico e contexto para respostas melhores
 */
export function useIntelligentProcessing() {
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [lastResponse, setLastResponse] = useState<string>('')

  const processCommand = useCallback(async (transcript: string): Promise<CommandResponse> => {
    const text = transcript.toLowerCase().trim()

    // Não processar se muito curto
    if (text.length < 2) {
      return { shouldRespond: false }
    }

    // Atualizar histórico
    setCommandHistory(prev => [...prev, text].slice(-20)) // Manter últimos 20

    try {
      // Tentar processar no servidor se disponível
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, history: commandHistory })
      }).catch(() => null)

      if (response?.ok) {
        const data = await response.json()
        if (data.success) {
          setLastResponse(data.data.response)
          return {
            shouldRespond: true,
            response: data.data.response,
            action: data.data.action
          }
        }
      }
    } catch (err) {
      console.error('Erro ao processar comando:', err)
    }

    // Fallback: resposta genérica
    return { shouldRespond: false }
  }, [commandHistory])

  return { processCommand, commandHistory, lastResponse }
}
