import { Router } from 'express'
import { getVoices, tts, Voice } from 'edge-tts'

export const ttsRouter = Router()

// ElevenLabs configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Default: Adam
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2'

// Get TTS provider info
ttsRouter.get('/provider', (_req, res) => {
  const provider = ELEVENLABS_API_KEY ? 'elevenlabs' : 'edge-tts'
  return res.json({
    success: true,
    data: {
      provider,
      voiceId: provider === 'elevenlabs' ? ELEVENLABS_VOICE_ID : undefined,
      modelId: provider === 'elevenlabs' ? ELEVENLABS_MODEL_ID : undefined,
    }
  })
})

// List available voices (subset filter by locale if provided)
ttsRouter.get('/voices', async (req, res) => {
  try {
    // If ElevenLabs is configured, return ElevenLabs voices
    if (ELEVENLABS_API_KEY) {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      })
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`)
      }
      const data = await response.json() as { voices: Array<{ voice_id: string; name: string; labels?: Record<string, string> }> }
      const voices = data.voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        labels: v.labels || {},
      }))
      return res.json({ success: true, data: { provider: 'elevenlabs', voices } })
    }

    // Fallback to Edge TTS
    const voices = await getVoices()
    const locale = (req.query.locale as string) || 'pt-BR'
    const filtered = voices.filter((v: Voice) => !locale || (v.Locale || '').toLowerCase() === locale.toLowerCase())
    return res.json({ success: true, data: { provider: 'edge-tts', voices: filtered } })
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
    if (ELEVENLABS_API_KEY) {
      const voiceId = typeof voice === 'string' && voice.length > 0 ? voice : ELEVENLABS_VOICE_ID
      const audioBuffer = await synthesizeWithElevenLabs(text, voiceId)

      res.setHeader('Content-Type', 'audio/mpeg')
      res.setHeader('Cache-Control', 'no-store')
      res.send(Buffer.from(audioBuffer))
      return
    }

    // Fallback to Edge TTS
    const voiceName = typeof voice === 'string' && voice.length > 0 ? voice : process.env.TTS_VOICE || 'pt-BR-AntonioNeural'
    const rateStr = typeof rate === 'string' ? rate : '+0%'
    const pitchStr = typeof pitch === 'string' ? pitch : '+0Hz'

    const audioBuffer = await tts(text, { voice: voiceName, rate: rateStr, pitch: pitchStr })

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(audioBuffer)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'tts error'
    return res.status(500).json({ success: false, error: message })
  }
})
