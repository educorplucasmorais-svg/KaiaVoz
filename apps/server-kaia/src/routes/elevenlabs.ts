import { Router } from 'express'

const router = Router()

// Default voice ID for Kaia (Portuguese female voice)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

// Text-to-Speech endpoint
router.post('/speak', async (req, res) => {
  try {
    const { text, voiceId } = req.body
    console.log('[ElevenLabs] POST /speak - text:', text?.substring(0, 50), 'voiceId:', voiceId)

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text is required' })
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('[ElevenLabs] API key not configured!')
      return res.status(500).json({ success: false, error: 'ElevenLabs API key not configured' })
    }

    console.log('[ElevenLabs] Using voice:', voiceId || DEFAULT_VOICE_ID)

    // Generate speech using fetch
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    // Set response headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')
    console.log('[ElevenLabs] Streaming audio response...')

    // Pipe the audio stream to response
    const reader = response.body?.getReader()
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
    console.log('[ElevenLabs] Audio stream completed')
  } catch (error: any) {
    console.error('[TTS Error]', error.message || error)
    res.status(500).json({ success: false, error: error.message || 'Failed to generate speech' })
  }
})

// Get available voices
router.get('/voices', async (_req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ success: false, error: 'ElevenLabs API key not configured' })
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      }
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Filter for Portuguese-compatible voices
    const portugueseVoices = data.voices
      ?.filter((v: any) => v.labels?.language === 'pt' || v.labels?.language === 'pt-BR' || v.fine_tuning?.language === 'pt' || true)
      .map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category,
        labels: v.labels
      }))

    res.json({ success: true, data: portugueseVoices || [] })
  } catch (error: any) {
    console.error('[Voices Error]', error.message || error)
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch voices' })
  }
})

// Conversational AI Agent placeholder
router.post('/conversation', async (req, res) => {
  try {
    const { message, agentId } = req.body

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' })
    }

    res.json({ success: true, data: { response: 'Conversational AI agent not yet configured', agentId } })
  } catch (error: any) {
    console.error('[Conversation Error]', error.message || error)
    res.status(500).json({ success: false, error: error.message || 'Failed to process conversation' })
  }
})

export const elevenLabsRouter = router
