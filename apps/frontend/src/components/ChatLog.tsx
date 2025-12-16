import { useEffect, useRef, useState } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'kaia'
  text: string
  timestamp: Date
  status?: 'listening' | 'processing' | 'speaking' | 'done'
}

interface Props {
  messages: ChatMessage[]
  isListening: boolean
  currentTranscript: string
  isOpen: boolean
  onToggle: () => void
}

export default function ChatLog({ messages, isListening, currentTranscript, isOpen, onToggle }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTranscript])

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 px-2 py-4 rounded-l-lg transition-all duration-300 ${
          isOpen ? 'translate-x-80' : 'translate-x-0'
        } bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 border-r-0`}
        title={isOpen ? 'Fechar chat' : 'Abrir chat'}
      >
        <svg 
          className={`w-5 h-5 text-white transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Chat panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-l border-white/20 shadow-2xl transition-transform duration-300 z-40 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <h2 className="text-white font-semibold">Chat com Kaia</h2>
          </div>
          <span className="text-xs text-white/50">
            {isListening ? '🎤 Ouvindo...' : '⏸️ Pausado'}
          </span>
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && !currentTranscript && (
            <div className="text-center text-white/40 text-sm py-8">
              <p>Nenhuma mensagem ainda.</p>
              <p className="mt-2">Diga "Oi Kaia" para começar!</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white/10 text-white rounded-bl-sm border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs opacity-70">
                    {msg.role === 'user' ? '👤 Você' : '🤖 Kaia'}
                  </span>
                  <span className="text-xs opacity-50">
                    {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                {msg.status && msg.status !== 'done' && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs opacity-50 ml-1">
                      {msg.status === 'listening' && 'ouvindo...'}
                      {msg.status === 'processing' && 'processando...'}
                      {msg.status === 'speaking' && 'falando...'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Current transcript (live typing indicator) */}
          {currentTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-blue-600/50 text-white rounded-br-sm border border-blue-400/30">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs opacity-70">👤 Você</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-300">ao vivo</span>
                  </span>
                </div>
                <p className="text-sm leading-relaxed italic">{currentTranscript}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer status */}
        <div className="p-3 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-center gap-2 text-xs text-white/50">
            {isListening ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Microfone ativo</span>
                </div>
                <span>•</span>
                <span>Fale naturalmente</span>
              </>
            ) : (
              <span>Microfone desativado</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
