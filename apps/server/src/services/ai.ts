/**
 * AI Service - Processamento inteligente de comandos
 * Integra com OpenAI/Claude para compreensão de linguagem natural
 */

interface Intent {
  type: 'greeting' | 'command' | 'reminder' | 'info' | 'chitchat' | 'help' | 'unknown'
  confidence: number
  action?: string
  parameters?: Record<string, any>
}

// Sistema inteligente de detecção de intenção
export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase().trim()
  
  // Normalizações
  const normalized = lower
    .replace(/[?!.]+$/, '')
    .replace(/\s+/g, ' ')

  // SAUDAÇÕES
  const greetingPatterns = [
    /^(oi|olá|eai|e aí|hey|hello|bom dia|boa tarde|boa noite|salve|fala|opa|blz)\b/,
    /^como (você está|vai|tá)(\s|$)/,
    /^tudo (bem|certo|ok)(\s|$)/,
    /kaia[!.,]?\s*$/, // Só "Kaia"
  ]

  if (greetingPatterns.some(p => p.test(normalized))) {
    return { type: 'greeting', confidence: 0.95 }
  }

  // LEMBRETES
  const reminderPatterns = [
    /lembre.?me\s+(?:de\s+)?(.+)/i,
    /me avise\s+(?:quando|quando|sobre|de)\s+(.+)/i,
    /cria\w*\s+(?:um\s+)?lembrete\s+(?:de\s+)?(.+)/i,
    /não esquece\s+de\s+(.+)/i,
  ]

  const reminderMatch = reminderPatterns.find(p => p.test(text))
  if (reminderMatch) {
    const match = text.match(reminderMatch)
    return {
      type: 'reminder',
      confidence: 0.9,
      parameters: { text: match?.[1] || text }
    }
  }

  // COMANDOS DO WINDOWS
  const commandPatterns = [
    /^kaia\s+(?:execute|executa|roda|rodá|abre|execute)\s*:?\s*(.+)/i,
    /^(?:execute|executa|roda)\s+(.+)/i,
    /^abre\s+(?:o\s+)?(.+)/i,
  ]

  const commandMatch = commandPatterns.find(p => p.test(text))
  if (commandMatch) {
    const match = text.match(commandMatch)
    return {
      type: 'command',
      confidence: 0.9,
      action: 'execute_command',
      parameters: { command: match?.[1] || '' }
    }
  }

  // INFORMAÇÕES (Hora, data, clima, etc)
  const infoPatterns = [
    /^que horas?\s+(são|é)/, // Que horas são
    /^qual\s+.*hora/, // Qual é a hora
    /^que dia\s+(é|a gente tá)/i, // Que dia é
    /^qual.*data/i, // Qual é a data
    /^clima|^como\s+tá\s+o\s+clima/i, // Clima
    /^preço|^cotação|^dólar|^euro/i, // Preços
    /^notícias|^news|^últimas\s+noticias/i, // Notícias
  ]

  if (infoPatterns.some(p => p.test(normalized))) {
    return { type: 'info', confidence: 0.85 }
  }

  // AJUDA
  const helpPatterns = [
    /^(?:ajuda|help|como uso|o que você faz|oq você faz|quem é você|qual seu nome)/i,
    /^o que\s+(?:você\s+)?(?:pode\s+)?fazer/i,
    /^quem\s+(?:é|és|sou)\s+você/i,
  ]

  if (helpPatterns.some(p => p.test(normalized))) {
    return { type: 'help', confidence: 0.9 }
  }

  // Detectar se é pergunta sobre a Kaia
  if (/(?:você|kaia)/.test(text) && text.length > 5) {
    return { type: 'chitchat', confidence: 0.7 }
  }

  // Detectar se é uma frase muito curta (possível comando incompleto)
  if (text.length < 3) {
    return { type: 'unknown', confidence: 0 }
  }

  // Se chegar aqui, é chitchat geral
  return { type: 'chitchat', confidence: 0.6 }
}

// Respostas inteligentes e contextualizadas
export function generateResponse(intent: Intent, text: string): string {
  switch (intent.type) {
    case 'greeting': {
      const hour = new Date().getHours()
      const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
      
      const responses = [
        `${greeting}! Como posso ajudar?`,
        `${greeting}! Qual é sua dúvida?`,
        `Oi! Estou aqui. O que precisa?`,
        `Olá! Como posso ser útil?`,
        `Oi! Pronta para ajudar!`,
      ]
      return responses[Math.floor(Math.random() * responses.length)]
    }

    case 'reminder':
      return `Ok, vou te lembrar disso mais tarde.`

    case 'command':
      return `Entendi. Vou executar esse comando.`

    case 'info': {
      const now = new Date()
      if (/hora/.test(text)) {
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        return `Agora são ${hours} horas e ${minutes} minutos.`
      }
      if (/dia/.test(text) || /data/.test(text)) {
        const options: Intl.DateTimeFormatOptions = { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long' 
        }
        return `Hoje é ${now.toLocaleDateString('pt-BR', options)}.`
      }
      if (/clima|temperatura|weather/.test(text)) {
        return `Não tenho informações de clima no momento, mas posso buscar para você.`
      }
      return `Deixa eu verificar isso para você.`
    }

    case 'help':
      return `Posso executar comandos do Windows, criar lembretes, contar piadas e muito mais! Diga "Kaia execute" seguido de um comando, ou "lembre-me de" algo.`

    case 'chitchat': {
      // Respostas para conversas gerais
      if (/como\s+(?:você\s+)?(?:está|tá|vai)/.test(text)) {
        const responses = [
          'Estou ótima! Obrigada por perguntar.',
          'Tudo bem sim! E você, como está?',
          'Funcionando perfeitamente! E você?',
        ]
        return responses[Math.floor(Math.random() * responses.length)]
      }

      if (/(?:obrigad|thanks|valeu)/.test(text)) {
        const responses = [
          'De nada! Estou aqui se precisar.',
          'Por nada! Sempre às ordens.',
          'Disponha! Qualquer coisa é só chamar.',
        ]
        return responses[Math.floor(Math.random() * responses.length)]
      }

      if (/(?:tudo bem|beleza|ok|certo)/.test(text)) {
        return `Ótimo! Como posso ajudar?`
      }

      // Respostas genéricas para chitchat
      const responses = [
        'Achei interessante! Quer que eu faça algo a respeito?',
        'Entendi. Como posso te ajudar com isso?',
        'Interessante! Quer mais alguma coisa?',
        'Anotei! Tem mais algo que eu possa fazer?',
      ]
      return responses[Math.floor(Math.random() * responses.length)]
    }

    case 'unknown':
    default:
      return `Desculpa, não entendi muito bem. Pode repetir ou falar de forma diferente?`
  }
}

// Cache de respostas para melhor performance
const responseCache = new Map<string, { response: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function getCachedResponse(key: string): string | null {
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response
  }
  responseCache.delete(key)
  return null
}

export function setCachedResponse(key: string, response: string): void {
  responseCache.set(key, { response, timestamp: Date.now() })
  
  // Limpar cache se ficar muito grande
  if (responseCache.size > 100) {
    const entries = Array.from(responseCache.entries())
    const oldest = entries[0][0]
    responseCache.delete(oldest)
  }
}

// Extrair comando do texto
export function extractCommand(text: string): string | null {
  const match = /(?:execute|executa|roda|abre)\s*:?\s*(.+)/i.exec(text)
  return match?.[1] || null
}

// Extrair texto do lembrete
export function extractReminderText(text: string): string | null {
  const match = /lembre.?me\s+(?:de\s+)?(.+)/i.exec(text)
  return match?.[1] || null
}

// Verificar se é ativação por palavra-chave
export function isActivationKeyword(text: string): boolean {
  const keywords = ['kaia', 'oi', 'olá', 'ei', 'hey', 'psiu']
  return keywords.some(kw => text.toLowerCase().includes(kw))
}
