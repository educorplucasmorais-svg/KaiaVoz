import type { SpeechError } from '../hooks/useSpeech'

interface Props {
  listening: boolean
  transcript: string
  interimTranscript?: string
  confidence?: number
  lastError?: SpeechError | null
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'checking' | 'unavailable'
  onRequestPermission: () => void
  onClearError?: () => void
}

export default function VoiceControls({ 
  listening, 
  transcript, 
  interimTranscript = '',
  confidence = 0,
  lastError,
  permissionStatus, 
  onRequestPermission,
  onClearError
}: Props) {
  // Show permission request if not granted
  if (permissionStatus === 'checking') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-white/70 text-center">
          Verificando permissão do microfone...
        </div>
      </div>
    )
  }

  if (permissionStatus === 'unavailable') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-red-300 text-center">
          Nenhum microfone encontrado. Verifique se seu microfone está conectado e funcionando.
        </div>
        <button
          onClick={onRequestPermission}
          className="px-6 py-3 rounded-full text-white font-semibold shadow-lg bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Verificar novamente
        </button>
      </div>
    )
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="text-red-300 text-center">
          Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.
        </div>
        <button
          onClick={onRequestPermission}
          className="px-6 py-3 rounded-full text-white font-semibold shadow-lg bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (permissionStatus === 'prompt') {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onRequestPermission}
          className="px-6 py-3 rounded-full text-white font-semibold shadow-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          Permitir microfone
        </button>
        <div className="text-white/70 text-center text-sm">
          Clique para permitir o acesso ao microfone e começar a usar a Kaia
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Error display */}
      {lastError && (
        <div className="flex items-center gap-2 text-red-300 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{lastError.message}</span>
          {lastError.recoverable && onClearError && (
            <button 
              onClick={onClearError}
              className="ml-2 text-red-400 hover:text-red-300 underline text-xs"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div className={`text-sm ${listening ? 'text-green-300' : 'text-white/50'} flex items-center gap-2`}>
        {listening && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
        {listening ? 'Ouvindo...' : 'Aguardando...'}
        
        {/* Confidence indicator */}
        {confidence > 0 && listening && (
          <span className="text-xs text-white/40 ml-2">
            ({Math.round(confidence * 100)}% confiança)
          </span>
        )}
      </div>

      {/* Transcript display */}
      <div className="text-white/90 text-center max-w-2xl min-h-[2rem] text-lg">
        {transcript || interimTranscript || (listening ? 'Diga algo para a Kaia...' : '')}
      </div>

      {/* Interim transcript (show in lighter color while speaking) */}
      {interimTranscript && transcript && (
        <div className="text-white/50 text-center max-w-2xl text-sm italic">
          {interimTranscript}
        </div>
      )}
    </div>
  )
}
