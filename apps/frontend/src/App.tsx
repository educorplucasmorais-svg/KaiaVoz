import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ModeSwitch from './components/ModeSwitch'
import VoiceControls from './components/VoiceControls'
import CommandOutput from './components/CommandOutput'
import ChatLog, { ChatMessage } from './components/ChatLog'
import { KaiaHomeNeural } from './components/KaiaHomeNeural'
import type { KaiaMode, ExecuteCommandEvent, ExecuteCommandRequest, ServerConfig, ApiResponse } from '@kaia/shared'
import { useSpeech } from './hooks/useSpeech'
import { useTTS } from './hooks/useTTS'
import { useNeuralCore } from './hooks/useNeuralCore'
import { createReminder } from './lib/api'
import RemindersPanel from './components/RemindersPanel'
import VoiceSettingsPanel from './components/VoiceSettings'

export default function App() {
  const [mode, setMode] = useState<KaiaMode>('assistente')
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [chatOpen, setChatOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  // Usar NeuralCore ao invés de useSpeech direto
  const { listening, transcript, supported, permissionStatus, requestPermission } = useSpeech()
  const { isListening: ncListening, response: ncResponse, processCommand } = useNeuralCore()
  const { settings: voiceSettings, setSettings: setVoiceSettings, speak: speakTTS, serverProvider } = useTTS()
  
  const [cmdLines, setCmdLines] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const canAgent = useMemo(() => mode === 'codigo', [mode])

  // Helper to add messages to chat
  const addMessage = useCallback((role: 'user' | 'kaia', text: string, status?: ChatMessage['status']) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      text,
      timestamp: new Date(),
      status
    }
    setMessages(prev => [...prev, msg])
    return msg.id
  }, [])

  // Helper to update message status
  const updateMessageStatus = useCallback((id: string, status: ChatMessage['status']) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }, [])

  // Speak and add to chat
  const speak = useCallback((text: string) => {
    const msgId = addMessage('kaia', text, 'speaking')
    speakTTS(text)
    const wordsPerMinute = 150
    const words = text.split(' ').length
    const duration = Math.max(1000, (words / wordsPerMinute) * 60 * 1000)
    setTimeout(() => updateMessageStatus(msgId, 'done'), duration)
  }, [addMessage, speakTTS, updateMessageStatus])

  useEffect(() => {
    // fetch server feature flags / default model
    fetch('/api/config')
      .then(r => r.json())
      .then((json: ApiResponse<ServerConfig>) => {
        if (json.success && json.data) setServerConfig(json.data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // connect to local agent ws when in code mode
    if (!canAgent) return
    const ws = new WebSocket('ws://127.0.0.1:5111')
    wsRef.current = ws
    ws.onopen = () => setCmdLines(prev => [...prev, '[agent] conectado\n'])
    ws.onmessage = (msg) => {
      try {
        const ev: ExecuteCommandEvent = JSON.parse(msg.data as string)
        if (ev.kind === 'event') {
          const e = ev.event
          switch (e.type) {
            case 'stdout':
              setCmdLines(prev => [...prev, e.chunk])
              break
            case 'stderr':
              setCmdLines(prev => [...prev, e.chunk])
              break
            case 'started':
              setCmdLines(prev => [...prev, `\n$ ${e.command}\n`])
              break
            case 'exit':
              setCmdLines(prev => [...prev, `\n[exit ${e.code}]\n`])
              break
          }
        }
      } catch {}
    }
    ws.onclose = () => setCmdLines(prev => [...prev, '[agent] desconectado\n'])
    return () => ws.close()
  }, [canAgent])

  // Track last processed transcript
  const lastProcessedRef = useRef<string>('')

  useEffect(() => {
    if (!transcript || transcript === lastProcessedRef.current) return
    
    lastProcessedRef.current = transcript
    addMessage('user', transcript, 'done')
    processCommand(transcript)
  }, [transcript, processCommand])

  // Processar resposta do NeuralCore
  useEffect(() => {
    if (ncResponse?.speak) {
      speak(ncResponse.speak)
      
      // Executar comando se necessário
      if (ncResponse.toolCall?.name === 'open_file' && canAgent) {
        const ok = window.confirm(`Executar: ${ncResponse.toolCall.params.path}?`)
        if (ok) {
          const req: ExecuteCommandRequest = {
            kind: 'execute-command',
            id: crypto.randomUUID(),
            command: `start ${ncResponse.toolCall.params.path}`,
            confirm: true
          }
          wsRef.current?.send(JSON.stringify(req))
        }
      }
      
      if (ncResponse.toolCall?.name === 'create_reminder') {
        createReminder({
          title: ncResponse.toolCall.params.text,
          when: ncResponse.toolCall.params.scheduledFor
        }).catch(() => speak('Erro ao criar lembrete.'))
      }
    }
  }, [ncResponse, speak, canAgent])

  return (
    <>
      {mode === 'assistente' ? (
        // Novo tema neural
        <KaiaHomeNeural
          isListening={listening}
          transcript={transcript !== lastProcessedRef.current ? transcript : ''}
          isPaused={!listening && !ncResponse}
          onToggleMode={setMode}
          mode={mode}
        />
      ) : (
        // Tema original para modo código
        <div className="ocean-waves min-h-screen text-white flex flex-col items-center py-10 px-4">
          {/* Chat Log Panel */}
          <ChatLog
            messages={messages}
            isListening={listening}
            currentTranscript={transcript !== lastProcessedRef.current ? transcript : ''}
            isOpen={chatOpen}
            onToggle={() => setChatOpen(!chatOpen)}
          />

          <header className="w-full max-w-5xl flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold tracking-wide">Kaia</h1>
            <div className="flex items-center gap-3">
              {serverConfig?.features.gpt52PreviewAllClients && (
                <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-200 border border-green-400/40">
                  GPT‑5.2 Preview ativo
                </span>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
                title="Configurações"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <ModeSwitch mode={mode} onChange={setMode} />
            </div>
          </header>

          <section className="flex flex-col items-center gap-6 w-full flex-1 justify-center">
            {/* Kaia Avatar with Wave Effects and Silhouette */}
            <div className="relative">
              {/* Outer wave rings */}
              <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${listening ? 'animate-ping opacity-20' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%)', transform: 'scale(2)' }} />
              <div className={`absolute inset-0 rounded-full transition-all duration-700 ${listening ? 'animate-pulse opacity-30' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', transform: 'scale(1.5)' }} />
              
              {/* Main avatar container */}
              <div className={`relative w-48 h-48 rounded-full bg-gradient-to-b from-white/20 to-white/5 backdrop-blur-md border-2 transition-all duration-300 flex items-center justify-center ${listening ? 'border-blue-400 shadow-lg shadow-blue-500/30' : 'border-white/20'}`}>
                {/* Kaia Silhouette */}
                <div className="relative flex flex-col items-center">
                  {/* Head */}
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-b from-sky-300 to-blue-500 transition-all duration-300 ${listening ? 'scale-105' : ''}`} />
                  {/* Body/shoulders silhouette */}
                  <div className={`w-24 h-10 -mt-2 rounded-t-full bg-gradient-to-b from-blue-500 to-blue-700 transition-all duration-300 ${listening ? 'scale-105' : ''}`} />
                </div>
                
                {/* Sound wave bars (visible when listening) */}
                {listening && (
                  <div className="absolute bottom-6 flex items-end gap-1">
                    <div className="w-1 bg-blue-300 rounded-full animate-wave-1" style={{ height: '12px' }} />
                    <div className="w-1 bg-blue-400 rounded-full animate-wave-2" style={{ height: '20px' }} />
                    <div className="w-1 bg-blue-300 rounded-full animate-wave-3" style={{ height: '16px' }} />
                    <div className="w-1 bg-blue-400 rounded-full animate-wave-2" style={{ height: '24px' }} />
                    <div className="w-1 bg-blue-300 rounded-full animate-wave-1" style={{ height: '14px' }} />
                  </div>
                )}
              </div>
            </div>

            {!supported && (
              <div className="text-yellow-200">Seu navegador pode não suportar STT/TTS (Web Speech API).</div>
            )}
            
            <VoiceControls 
              listening={listening} 
              transcript={transcript} 
              permissionStatus={permissionStatus}
              onRequestPermission={requestPermission}
            />
            
            <CommandOutput lines={cmdLines} />
            
            {showSettings && (
              <div className="w-full max-w-3xl space-y-4">
                <RemindersPanel />
                <VoiceSettingsPanel 
                  settings={voiceSettings} 
                  onChange={setVoiceSettings} 
                  serverProvider={serverProvider}
                  onTestVoice={() => speak('Olá, eu sou a Kaia.')}
                />
              </div>
            )}
          </section>

          <footer className="mt-10 text-white/70 text-sm">
            Diga: "Kaia execute: abrir o bloco de notas" ou "Kaia execute: dir".
          </footer>
        </div>
      )}
    </>
  )
}
