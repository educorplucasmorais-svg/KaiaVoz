import { EventEmitter } from 'events'

interface ThoughtSpeakResponse {
  thought: string
  speak: string
  toolCall?: ToolCall
}

interface ToolCall {
  name: string
  params: Record<string, any>
  requiresConfirmation: boolean
}

interface VoiceCommand {
  text: string
  timestamp: number
  userId?: string
}

interface SecurityContext {
  allowedOperations: string[]
  blockedPatterns: RegExp[]
  maxTokens: number
}

export class NeuralCoreAgent extends EventEmitter {
  private securityContext: SecurityContext
  private ragContext: Map<string, any>

  constructor() {
    super()

    this.securityContext = {
      allowedOperations: [
        'open_file',
        'search_file',
        'create_reminder',
        'get_time',
        'get_weather',
        'play_music',
        'volume_control'
      ],
      blockedPatterns: [
        /system32/i,
        /delete.*windows/i,
        /rm\s+-rf\s+\//i,
        /format\s+c:/i,
        /shutdown/i
      ],
      maxTokens: 20
    }

    this.ragContext = new Map()
  }

  async processVoiceCommand(command: VoiceCommand): Promise<ThoughtSpeakResponse> {
    const startTime = Date.now()

    const securityCheck = this.validateSecurity(command.text)
    if (!securityCheck.safe) {
      return {
        thought: `Comando bloqueado: ${securityCheck.reason}`,
        speak: 'Desculpe, não posso executar essa ação por questões de segurança.'
      }
    }

    const intent = this.analyzeIntent(command.text)

    if (intent.requiresContext) {
      const context = await this.retrieveRAGContext(intent.query)
      if (!context) {
        return {
          thought: 'Informação não encontrada no contexto local',
          speak: 'Não tenho essa informação no momento.'
        }
      }
    }

    const response = await this.generateResponse(intent, command)

    const latency = Date.now() - startTime
    if (latency > 300) {
      console.warn(`[NeuralCore] Latência alta: ${latency}ms`)
    }

    return response
  }

  private validateSecurity(text: string): { safe: boolean; reason?: string } {
    for (const pattern of this.securityContext.blockedPatterns) {
      if (pattern.test(text)) {
        return { safe: false, reason: 'Padrão de comando perigoso detectado' }
      }
    }
    return { safe: true }
  }

  private analyzeIntent(text: string): any {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('abrir') || lowerText.includes('abra')) {
      return {
        type: 'file_operation',
        action: 'open',
        requiresContext: false,
        params: this.extractFileParams(text)
      }
    }

    if (lowerText.includes('lembrete') || lowerText.includes('lembrar') || lowerText.includes('lembre')) {
      return {
        type: 'reminder',
        action: 'create',
        requiresContext: false,
        params: this.extractReminderParams(text)
      }
    }

    if (lowerText.startsWith('o que') || lowerText.startsWith('qual') || lowerText.startsWith('como')) {
      return {
        type: 'question',
        requiresContext: true,
        query: text
      }
    }

    if (lowerText.includes('volume') || lowerText.includes('música')) {
      return {
        type: 'system_control',
        action: this.extractSystemAction(text),
        requiresContext: false
      }
    }

    if (/^(oi|olá|hey|e aí|bom dia|boa tarde|boa noite)\b/i.test(text)) {
      return {
        type: 'greeting',
        requiresContext: false
      }
    }

    return {
      type: 'conversation',
      requiresContext: false
    }
  }

  private async generateResponse(intent: any, command: VoiceCommand): Promise<ThoughtSpeakResponse> {
    switch (intent.type) {
      case 'file_operation':
        return this.handleFileOperation(intent)
      case 'reminder':
        return this.handleReminder(intent)
      case 'question':
        return this.handleQuestion(intent)
      case 'system_control':
        return this.handleSystemControl(intent)
      case 'greeting':
        return this.handleGreeting()
      case 'conversation':
        return this.handleConversation(command.text)
      default:
        return {
          thought: 'Intenção não reconhecida',
          speak: 'Não entendi. Pode repetir?'
        }
    }
  }

  private handleFileOperation(intent: any): ThoughtSpeakResponse {
    const { action, params } = intent

    if (action === 'open' && params.fileName) {
      return {
        thought: `Preparando para abrir arquivo: ${params.fileName}`,
        speak: `Certo, abrindo ${params.fileName}.`,
        toolCall: {
          name: 'open_file',
          params: { path: params.fileName },
          requiresConfirmation: false
        }
      }
    }

    return {
      thought: 'Parâmetros insuficientes para operação de arquivo',
      speak: 'Qual arquivo você quer abrir?'
    }
  }

  private handleReminder(intent: any): ThoughtSpeakResponse {
    const { params } = intent

    if (params.text && params.time) {
      return {
        thought: `Criando lembrete: "${params.text}" para ${params.time}`,
        speak: `Ok, vou te lembrar às ${params.time}.`,
        toolCall: {
          name: 'create_reminder',
          params: {
            text: params.text,
            scheduledFor: params.time
          },
          requiresConfirmation: false
        }
      }
    }

    return {
      thought: 'Informações incompletas para criar lembrete',
      speak: 'Para quando você quer o lembrete?'
    }
  }

  private handleQuestion(intent: any): ThoughtSpeakResponse {
    const context = this.ragContext.get(intent.query)

    if (!context) {
      return {
        thought: 'Informação não disponível no contexto local',
        speak: 'Não sei responder isso agora, mas posso aprender!'
      }
    }

    return {
      thought: `Respondendo com base no contexto: ${context}`,
      speak: this.formatShortAnswer(context)
    }
  }

  private handleSystemControl(intent: any): ThoughtSpeakResponse {
    const { action } = intent

    return {
      thought: `Executando controle de sistema: ${action}`,
      speak: 'Entendido.',
      toolCall: {
        name: 'system_control',
        params: { action },
        requiresConfirmation: false
      }
    }
  }

  private handleGreeting(): ThoughtSpeakResponse {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

    const responses = [
      `${greeting}! Como posso ajudar?`,
      `${greeting}! No que posso ser útil?`,
      `Oi! ${greeting}! Pronta para ajudar.`,
      `Olá! ${greeting}!`
    ]

    return {
      thought: 'Saudação detectada',
      speak: responses[Math.floor(Math.random() * responses.length)]
    }
  }

  private handleConversation(text: string): ThoughtSpeakResponse {
    const responses = [
      'Estou aqui. Como posso ajudar?',
      'Interessante! Quer que eu faça algo?',
      'Entendi. Tem mais algo?',
      'Anotei! Como posso ajudar com isso?'
    ]

    return {
      thought: 'Conversa genérica',
      speak: responses[Math.floor(Math.random() * responses.length)]
    }
  }

  private extractFileParams(text: string): any {
    const match = text.match(/abr(?:ir|a)\s+(?:o\s+)?(.+)/i)
    return { fileName: match ? match[1].trim() : null }
  }

  private extractReminderParams(text: string): any {
    const timeMatch = text.match(/(\d{1,2}:\d{2}|\d{1,2}\s*h(?:oras?)?)/i)
    const textMatch = text.replace(/lembr(?:ar|ete|e-me)/i, '').trim()

    return {
      text: textMatch,
      time: timeMatch ? timeMatch[1] : null
    }
  }

  private extractSystemAction(text: string): string {
    if (text.includes('aumentar') || text.includes('subir')) return 'volume_up'
    if (text.includes('diminuir') || text.includes('baixar')) return 'volume_down'
    if (text.includes('pausar')) return 'pause'
    if (text.includes('tocar') || text.includes('play')) return 'play'
    return 'unknown'
  }

  private formatShortAnswer(context: any): string {
    const text = String(context)
    const words = text.split(' ')

    if (words.length <= 20) return text

    return words.slice(0, 20).join(' ') + '...'
  }

  private async retrieveRAGContext(query: string): Promise<any> {
    return this.ragContext.get(query) || null
  }

  public setRAGContext(key: string, value: any): void {
    this.ragContext.set(key, value)
  }
}
