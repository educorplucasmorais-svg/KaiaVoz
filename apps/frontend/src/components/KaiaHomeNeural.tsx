import React from 'react'

interface KaiaHomeNeuralProps {
  isListening?: boolean
  transcript?: string
  isPaused?: boolean
  onToggleMode?: (mode: 'assistente' | 'codigo') => void
  mode?: 'assistente' | 'codigo'
}

export function KaiaHomeNeural({
  isListening = false,
  transcript = '',
  isPaused = true,
  onToggleMode,
  mode = 'assistente'
}: KaiaHomeNeuralProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Fundo neural animado */}
      <div className="pointer-events-none absolute inset-0 neural-bg" />

      {/* Conteúdo principal */}
      <div className="relative z-10">
        <header className="flex items-center justify-between px-10 pt-6 pb-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-[0_0_24px_rgba(56,189,248,0.7)]" />
            <span className="text-2xl font-bold tracking-tight">Kaia</span>
          </div>

          {/* Centro: preview + modos */}
          <div className="flex items-center gap-6">
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.6)]">
              ✓ GPT‑5.2 Preview ativo
            </span>

            <div className="flex items-center rounded-full border border-cyan-400/40 bg-slate-900/60 px-1 py-1 backdrop-blur-xl">
              <button
                onClick={() => onToggleMode?.('assistente')}
                className={`rounded-full text-xs font-medium px-4 py-2 transition-all ${
                  mode === 'assistente'
                    ? 'bg-cyan-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.8)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                Kaia – Assistente
              </button>
              <button
                onClick={() => onToggleMode?.('codigo')}
                className={`rounded-full text-xs font-medium px-4 py-2 transition-all ${
                  mode === 'codigo'
                    ? 'bg-cyan-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.8)]'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                Kaia – Código
              </button>
            </div>
          </div>

          {/* Lado direito: status */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              Microfone:
              <span className={isListening ? 'text-green-300 font-medium' : 'text-slate-400'}>
                {isListening ? 'ativo' : 'pronto'}
              </span>
            </span>
          </div>
        </header>

        <main className="flex h-[calc(100vh-100px)] px-10 pb-8 gap-8 items-stretch">
          {/* Área central: núcleo da rede neural */}
          <section className="flex-1 flex items-center justify-center">
            <div className="relative h-96 w-96">
              {/* Anel externo girando - gradiente cíclico */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-cyan-400 opacity-40 blur-sm"
                style={{ animation: 'spin-slow 28s linear infinite' }}
              />

              {/* Camada do meio com padrão de grade */}
              <div className="absolute inset-4 rounded-full bg-slate-900/20 opacity-50 blur-md" />

              {/* Esfera principal com glassmorphism */}
              <div className="relative z-10 flex h-full w-full items-center justify-center rounded-full border border-cyan-400/30 bg-slate-900/60 backdrop-blur-2xl shadow-[0_0_70px_rgba(56,189,248,0.8)]">
                {/* Núcleo brilhante */}
                <div
                  className="h-40 w-40 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-fuchsia-500 opacity-90 shadow-[0_0_60px_rgba(59,130,246,0.95)]"
                  style={{
                    animation: isListening ? 'pulse-soft 1.5s ease-in-out infinite' : 'pulse-soft 3s ease-in-out infinite'
                  }}
                />
              </div>

              {/* "Nós" (neurônios) orbitando */}
              <div
                className="pointer-events-none absolute inset-6 rounded-full border border-cyan-400/20"
                style={{ animation: 'spin-slow 40s linear reverse infinite' }}
              >
                <NeuronDot position="top-0 left-1/2 -translate-x-1/2" isListening={isListening} />
                <NeuronDot position="bottom-3 left-12 -translate-x-1/2" isListening={isListening} />
                <NeuronDot position="top-8 right-6" isListening={isListening} />
                <NeuronDot position="bottom-10 right-10" isListening={isListening} />
              </div>
            </div>

            {/* Texto descritivo ao lado do núcleo */}
            <div className="ml-16 max-w-sm space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 font-semibold">
                  ◆ NeuralCore Online
                </p>
                <p className="text-3xl font-bold leading-tight">
                  {isListening
                    ? 'Processando comando...'
                    : transcript
                      ? transcript
                      : 'Aguardando seu "Oi Kaia"'}
                </p>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                {isListening
                  ? 'Analisando intenção e gerando resposta com latência &lt; 300ms...'
                  : 'Baixa latência, processamento local e foco total em privacidade. Diga "Oi Kaia" para iniciar.'}
              </p>

              <div className="flex items-center gap-3 pt-4">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xs text-slate-400">
                  Web Speech API + ElevenLabs TTS
                </span>
              </div>
            </div>
          </section>

          {/* Painel de chat à direita */}
          <aside className="w-96 flex flex-col rounded-3xl border border-slate-700/60 bg-slate-950/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(15,23,42,0.9)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-700/70 px-6 py-4">
              <span className="text-sm font-semibold">Chat com Kaia</span>
              <span className={`text-[11px] rounded-full px-2.5 py-1 font-medium border transition-colors ${
                isPaused
                  ? 'bg-amber-500/10 text-amber-300 border-amber-400/40'
                  : 'bg-green-500/10 text-green-300 border-green-400/40'
              }`}>
                {isPaused ? '⏸ Pausado' : '▶ Ativo'}
              </span>
            </div>

            {/* Área de chat */}
            <div className="flex-1 p-6 space-y-3 overflow-y-auto">
              {transcript ? (
                <>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-slate-500">Você</p>
                    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/30 px-4 py-3">
                      <p className="text-sm text-slate-100">{transcript}</p>
                    </div>
                  </div>
                  {isListening && (
                    <div className="flex items-center gap-1 pt-2">
                      <div className="h-1.5 w-1.5 bg-cyan-400 rounded-full animate-pulse" />
                      <p className="text-xs text-slate-400">Kaia está pensando...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <div className="text-3xl opacity-30">🎤</div>
                  <p className="text-sm text-slate-400">Nenhuma mensagem ainda.</p>
                  <p className="text-xs text-slate-500">
                    Diga <span className="text-cyan-300 font-medium">"Oi Kaia"</span> para começar
                  </p>
                </div>
              )}
            </div>

            {/* Linha de status no rodapé */}
            <div className="border-t border-slate-700/70 px-6 py-3 bg-slate-950/30">
              <p className="text-[11px] text-slate-500">
                {isListening ? '🔴 Ouvindo' : '🟢 Pronto'} — Modo: <span className="text-slate-300 font-medium">{mode === 'assistente' ? 'Assistente' : 'Código'}</span>
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  )
}

// Componente para os "nós" luminosos da rede neural
interface NeuronDotProps {
  position: string
  isListening?: boolean
}

function NeuronDot({ position, isListening }: NeuronDotProps) {
  return (
    <div
      className={`absolute h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(56,189,248,1)] ${position} ${
        isListening ? 'animate-pulse' : ''
      }`}
      style={{
        animation: isListening ? 'pulse-soft 0.8s ease-in-out infinite' : 'pulse-soft 2s ease-in-out infinite'
      }}
    />
  )
}
