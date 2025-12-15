interface Props {
  listening: boolean
  transcript: string
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'checking' | 'unavailable'
  onRequestPermission: () => void
}

export default function VoiceControls({ listening, transcript, permissionStatus, onRequestPermission }: Props) {
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
          Nenhum microfone encontrado. Conecte um microfone e recarregue a página.
        </div>
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
      <div className={`text-sm ${listening ? 'text-green-300' : 'text-white/50'} flex items-center gap-2`}>
        {listening && (
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        )}
        {listening ? 'Ouvindo...' : 'Aguardando...'}
      </div>
      <div className="text-white/90 text-center max-w-2xl min-h-[2rem] text-lg">
        {transcript || (listening ? 'Diga algo para a Kaia...' : '')}
      </div>
    </div>
  )
}
