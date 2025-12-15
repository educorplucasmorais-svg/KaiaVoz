interface Props {
  listening: boolean
  transcript: string
  onStart: () => void
  onStop: () => void
}

export default function VoiceControls({ listening, transcript, onStart, onStop }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={listening ? onStop : onStart}
        className={`px-6 py-3 rounded-full text-white font-semibold shadow-lg ${listening ? 'bg-red-600' : 'bg-blue-600'}`}
      >
        {listening ? 'Parar' : 'Começar'}
      </button>
      <div className="text-white/90 text-center max-w-2xl min-h-[2rem]">
        {transcript}
      </div>
    </div>
  )
}
