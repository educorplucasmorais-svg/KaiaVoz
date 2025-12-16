import { Router } from 'express'

export const ttsRouter = Router()

// Edge TTS types (ESM module, must be dynamically imported)
interface EdgeTTSVoice {
  Name: string
  ShortName: string
  FriendlyName: string
  Gender: 'Male' | 'Female'
  Locale: string
  VoiceTag: {
    ContentCategories: string[]
    VoicePersonalities: string[]
  }
}

// Edge TTS module cache
let edgeTTSModule: { getVoices: () => Promise<EdgeTTSVoice[]>; tts: (text: string, options?: object) => Promise<Buffer> } | null = null
let edgeTTSLoadAttempted = false

// Dynamic import helper for edge-tts (ESM module)
// Returns null if import fails (ESM/CJS compatibility issue)
async function getEdgeTTS() {
  if (edgeTTSLoadAttempted) {
    return edgeTTSModule
  }
  edgeTTSLoadAttempted = true
  try {
    // Use Function constructor to avoid TypeScript transpiling the import
    const importFn = new Function('modulePath', 'return import(modulePath)')
    edgeTTSModule = await importFn('edge-tts')
    return edgeTTSModule
  } catch (err) {
    console.warn('edge-tts not available (ESM/CJS compatibility):', err instanceof Error ? err.message : err)
    return null
  }
}

// ElevenLabs configuration
const ELEVENLABS_API_KEY_RAW = process.env.ELEVENLABS_API_KEY || ''
// Validate API key format (non-empty, no whitespace-only)
const ELEVENLABS_API_KEY = ELEVENLABS_API_KEY_RAW.trim().length > 0 ? ELEVENLABS_API_KEY_RAW.trim() : ''
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Default: Adam
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'

// Helper to check if ElevenLabs is configured
const isElevenLabsConfigured = (): boolean => ELEVENLABS_API_KEY.length > 0

// Get TTS provider info
ttsRouter.get('/provider', async (_req, res) => {
  if (isElevenLabsConfigured()) {
    return res.json({
      success: true,
      data: {
        provider: 'elevenlabs',
        voiceId: ELEVENLABS_VOICE_ID,
        modelId: ELEVENLABS_MODEL_ID,
      }
    })
  }
  
  // Check if edge-tts is available
  const edgeTTS = await getEdgeTTS()
  const provider = edgeTTS ? 'edge-tts' : 'browser'
  
  return res.json({
    success: true,
    data: {
      provider,
    }
  })
})

// ElevenLabs voice response type
interface ElevenLabsVoice {
  voice_id: string
  name: string
  labels?: Record<string, string>
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[]
}

// Helper to validate ElevenLabs voices response
function isValidElevenLabsVoicesResponse(data: unknown): data is ElevenLabsVoicesResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'voices' in data &&
    Array.isArray((data as ElevenLabsVoicesResponse).voices)
  )
}

// List available voices (subset filter by locale if provided)
ttsRouter.get('/voices', async (req, res) => {
  try {
    // If ElevenLabs is configured, return ElevenLabs voices
    if (isElevenLabsConfigured()) {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      })
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }
      const data: unknown = await response.json()
      if (!isValidElevenLabsVoicesResponse(data)) {
        throw new Error('Invalid ElevenLabs API response format')
      }
      const voices = data.voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        labels: v.labels || {},
      }))
      return res.json({ success: true, data: { provider: 'elevenlabs', voices } })
    }

    // Try Edge TTS
    const edgeTTS = await getEdgeTTS()
    if (edgeTTS) {
      const voices = await edgeTTS.getVoices()
      const locale = (req.query.locale as string) || 'pt-BR'
      const filtered = voices.filter((v: EdgeTTSVoice) => !locale || (v.Locale || '').toLowerCase() === locale.toLowerCase())
      return res.json({ success: true, data: { provider: 'edge-tts', voices: filtered } })
    }
    
    // Fallback: no server-side TTS available, client should use browser
    return res.json({ success: true, data: { provider: 'browser', voices: [] } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'voices error'
    return res.status(500).json({ success: false, error: message })
  }
})

// Stream audio from text using ElevenLabs
async function synthesizeWithElevenLabs(text: string, voiceId: string): Promise<ArrayBuffer> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`)
  }

  return response.arrayBuffer()
}

// Stream audio from text
// query/body: text, voice (voiceId for ElevenLabs, voice name for Edge TTS), rate, pitch
ttsRouter.post('/', async (req, res) => {
  try {
    const { text, voice, rate, pitch } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'text is required' })
    }

    // Use ElevenLabs if API key is configured
    if (isElevenLabsConfigured()) {
      const voiceId = typeof voice === 'string' && voice.length > 0 ? voice : ELEVENLABS_VOICE_ID
      const audioBuffer = await synthesizeWithElevenLabs(text, voiceId)

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.send(Buffer.from(audioBuffer))
      return
    }

    // Try Edge TTS
    const edgeTTS = await getEdgeTTS()
    if (edgeTTS) {
      const voiceName = typeof voice === 'string' && voice.length > 0 ? voice : process.env.TTS_VOICE || 'pt-BR-AntonioNeural'
      const rateStr = typeof rate === 'string' ? rate : '+0%'
      const pitchStr = typeof pitch === 'string' ? pitch : '+0Hz'

      const audioBuffer = await edgeTTS.tts(text, { voice: voiceName, rate: rateStr, pitch: pitchStr })

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.send(audioBuffer)
      return
    }

    // No server-side TTS available
    return res.status(501).json({ 
      success: false, 
      error: 'No server-side TTS available. Use browser TTS instead.',
      fallback: 'browser'
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'tts error'
    return res.status(500).json({ success: false, error: message })
  }
})
