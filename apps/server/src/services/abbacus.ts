/**
 * Abbacus LLM Service
 * Integração com o LLM da Abbacus para processamento de linguagem natural
 */

interface AbbacusMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AbbacusRequest {
  model?: string
  messages: AbbacusMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface AbbacusResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class AbbacusLLMService {
  private apiKey: string
  private baseUrl: string = 'https://api.abbacus.ai/v1' // URL da API Abbacus
  private model: string = 'abbacus-1' // Modelo padrão

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Processa texto usando o LLM da Abbacus
   */
  async processText(
    userMessage: string,
    systemPrompt?: string,
    temperature: number = 0.7
  ): Promise<string> {
    const messages: AbbacusMessage[] = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    messages.push({
      role: 'user',
      content: userMessage
    })

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: 500
        } as AbbacusRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Abbacus API error: ${response.status} - ${errorText}`)
      }

      const data: AbbacusResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta vazia da API Abbacus')
      }

      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('[Abbacus] Erro ao processar texto:', error)
      throw error
    }
  }

  /**
   * Gera resposta inteligente para comando de voz
   */
  async generateVoiceResponse(
    userText: string,
    context?: string
  ): Promise<{ thought: string; speak: string }> {
    const systemPrompt = `Você é Kaia, uma assistente de voz inteligente em português brasileiro.

Seu objetivo é:
- Compreender comandos de voz e responder de forma natural
- Ser concisa e direta nas respostas (máximo 2-3 frases)
- Usar linguagem casual e amigável
- Identificar intenções: lembretes, abrir arquivos, perguntas, controle de sistema, saudações

Formato de resposta JSON:
{
  "thought": "seu raciocínio interno sobre o que fazer",
  "speak": "o que você vai falar para o usuário"
}

${context ? `Contexto adicional: ${context}` : ''}

Responda APENAS com o JSON, sem formatação markdown.`

    try {
      const response = await this.processText(userText, systemPrompt, 0.7)
      
      // Tentar parsear JSON da resposta
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
      const parsed = JSON.parse(cleanResponse)

      return {
        thought: parsed.thought || 'Processando...',
        speak: parsed.speak || 'Entendi.'
      }
    } catch (error) {
      console.error('[Abbacus] Erro ao gerar resposta:', error)
      
      // Fallback: retornar resposta simples
      return {
        thought: 'Erro ao processar com LLM',
        speak: 'Desculpe, tive dificuldade em processar sua solicitação.'
      }
    }
  }

  /**
   * Extrai intenção e parâmetros do texto usando LLM
   */
  async extractIntent(userText: string): Promise<{
    type: string
    confidence: number
    params?: any
  }> {
    const systemPrompt = `Analise o comando de voz e identifique a intenção.

Tipos de intenção possíveis:
- file_operation: abrir arquivos, navegar, salvar
- reminder: criar lembretes, alarmes
- question: perguntas factuais
- system_control: volume, música, configurações
- greeting: saudações, cumprimentos
- conversation: conversa casual

Responda APENAS com JSON no formato:
{
  "type": "tipo_de_intenção",
  "confidence": 0.95,
  "params": { "chave": "valor" }
}

Sem formatação markdown, apenas o JSON.`

    try {
      const response = await this.processText(userText, systemPrompt, 0.3)
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim()
      return JSON.parse(cleanResponse)
    } catch (error) {
      console.error('[Abbacus] Erro ao extrair intenção:', error)
      
      // Fallback para conversation
      return {
        type: 'conversation',
        confidence: 0.5
      }
    }
  }

  /**
   * Verifica se a API está acessível
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.processText('teste', 'Responda apenas: ok')
      return response.toLowerCase().includes('ok')
    } catch (error) {
      console.error('[Abbacus] Health check falhou:', error)
      return false
    }
  }
}

// Singleton instance
let abbacusInstance: AbbacusLLMService | null = null

export function getAbbacusService(): AbbacusLLMService | null {
  if (!process.env.ABBACUS_API_KEY) {
    console.warn('[Abbacus] API key não configurada')
    return null
  }

  if (!abbacusInstance) {
    abbacusInstance = new AbbacusLLMService(process.env.ABBACUS_API_KEY)
  }

  return abbacusInstance
}
