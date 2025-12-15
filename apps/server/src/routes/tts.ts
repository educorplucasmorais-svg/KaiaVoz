import { Router } from 'express'
import edgeTTS from 'edge-tts'

export const ttsRouter = Router()

// List available voices (subset filter by locale if provided)
ttsRouter.get('/voices', async (req, res) => {
  try {
    const voices = await edgeTTS.voices()
    const locale = (req.query.locale as string) || 'pt-BR'
    const filtered = voices.filter(v => !locale || (v.Locale || '').toLowerCase() === locale.toLowerCase())
    return res.json({ success: true, data: filtered })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'voices error' })
  }
})

// Stream audio from text
// query/body: text, voice, rate, pitch
ttsRouter.post('/', async (req, res) => {
  try {
    const { text, voice, rate, pitch } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'text is required' })
    }
    const voiceName = typeof voice === 'string' && voice.length > 0 ? voice : process.env.TTS_VOICE || 'pt-BR-AntonioNeural'
    const rateStr = typeof rate === 'string' ? rate : '+0%'
    const pitchStr = typeof pitch === 'string' ? pitch : '+0Hz'

    const stream = await edgeTTS.getAudioStream(text, { voice: voiceName, rate: rateStr, pitch: pitchStr })

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')

    for await (const chunk of stream) {
      res.write(chunk)
    }
    res.end()
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'tts error' })
  }
})
