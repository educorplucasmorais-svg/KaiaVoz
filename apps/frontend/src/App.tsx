import { useEffect, useMemo, useRef, useState } from 'react'
import ModeSwitch from './components/ModeSwitch'
import VoiceControls from './components/VoiceControls'
import CommandOutput from './components/CommandOutput'
import type { KaiaMode, ExecuteCommandEvent, ExecuteCommandRequest, ServerConfig, ApiResponse } from '@kaia/shared'
import { useSpeech } from './hooks/useSpeech'
import { useTTS } from './hooks/useTTS'
import { createReminder } from './lib/api'
import RemindersPanel from './components/RemindersPanel'
import VoiceSettingsPanel from './components/VoiceSettings'

export default function App() {
  const [mode, setMode] = useState<KaiaMode>('assistente')
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const { listening, transcript, start, stop, speak: speakBrowser, supported } = useSpeech()
  const { settings: voiceSettings, setSettings: setVoiceSettings, speak } = useTTS()
  const [cmdLines, setCmdLines] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const canAgent = useMemo(() => mode === 'codigo', [mode])

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

  useEffect(() => {
    // very simple command parse: "Kaia execute: <comando>"
    if (!transcript) return
    const m = /kaia\s+(?:c[oó]digo\s+)?execute?:?\s+(.+)/i.exec(transcript)
    if (m && canAgent) {
      const command = m[1].trim()
      const ok = window.confirm(`Executar comando no Windows?\n${command}`)
      if (!ok) return
      const req: ExecuteCommandRequest = {
        kind: 'execute-command',
        id: crypto.randomUUID(),
        command,
        confirm: true
      }
      wsRef.current?.send(JSON.stringify(req))
      speak('Executando o comando agora.')
    }
    // reminders: "lembre-me <texto...>"; server will try to parse date
    if (/lembre\-?me/i.test(transcript) && mode === 'assistente') {
      const m2 = /lembre\-?me\s+(de\s+)?(.+)/i.exec(transcript)
      const title = (m2?.[2] || transcript).trim()
      const whenPhrase = transcript
      createReminder({ title, when: whenPhrase }).then((r) => {
        if (r.success) {
          speak('Lembrete criado com sucesso.')
        } else {
          speak(r.error || 'Não consegui entender a data do lembrete.')
        }
      }).catch(() => speak('Erro ao criar lembrete.'))
    }
  }, [transcript, speak, canAgent, mode])

  return (
    <div className="ocean-waves min-h-screen text-white flex flex-col items-center py-10 px-4">
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
        <div className={`w-44 h-44 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-300 ${listening ? 'animate-pulse scale-110 border-blue-400' : 'animate-wave'}`}>
          <div className={`w-28 h-8 rounded-full bg-gradient-to-r from-sky-300 to-blue-600 transition-all duration-300 ${listening ? 'scale-110' : ''}`} />
        </div>
        {!supported && (
          <div className="text-yellow-200">Seu navegador pode não suportar STT/TTS (Web Speech API).</div>
        )}
        <VoiceControls listening={listening} transcript={transcript} onStart={start} onStop={stop} />
        
        {mode === 'codigo' && <CommandOutput lines={cmdLines} />}
        
        {showSettings && (
          <div className="w-full max-w-3xl space-y-4">
            {mode === 'assistente' && <RemindersPanel />}
            <VoiceSettingsPanel settings={voiceSettings} onChange={setVoiceSettings} />
          </div>
        )}
      </section>

      <footer className="mt-10 text-white/70 text-sm">
        Diga: "Kaia execute: abrir o bloco de notas" ou "Kaia execute: dir".
      </footer>
    </div>
  )
}
