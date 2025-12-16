import { Router } from 'express'
import { ElevenLabsClient } from 'elevenlabs'

const router = Router()

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
})

// Default voice ID for Kaia (Portuguese female voice)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel

// Text-to-Speech endpoint
router.post('/speak', async (req, res) => {
  try {
    const { text, voiceId } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      })
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ElevenLabs API key not configured'
      })
    }

    // Generate speech
    const audioStream = await elevenlabs.textToSpeech.convert(
      voiceId || DEFAULT_VOICE_ID,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      }
    )

    // Set response headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')

    // Pipe the audio stream to response
    for await (const chunk of audioStream) {
      res.write(chunk)
    }
    res.end()

  } catch (error: any) {
    console.error('[TTS Error]', error.message || error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate speech'
    })
  }
})

// Get available voices
router.get('/voices', async (_req, res) => {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ElevenLabs API key not configured'
      })
    }

    const voices = await elevenlabs.voices.getAll()
    
    // Filter for Portuguese-compatible voices
    const portugueseVoices = voices.voices?.filter(v => 
      v.labels?.language === 'pt' || 
      v.labels?.language === 'pt-BR' ||
      v.fine_tuning?.language === 'pt' ||
      true // Include all for now, multilingual model supports all
    ).map(v => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
      labels: v.labels
    }))

    res.json({
      success: true,
      data: portugueseVoices || []
    })

  } catch (error: any) {
    console.error('[Voices Error]', error.message || error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch voices'
    })
  }
})

// Conversational AI Agent (for more advanced interactions)
router.post('/conversation', async (req, res) => {
  try {
    const { message, agentId } = req.body

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      })
    }

    // For now, return a simple response
    // Full conversational AI integration would require agent setup
    res.json({
      success: true,
      data: {
        response: 'Conversational AI agent not yet configured',
        agentId
      }
    })

  } catch (error: any) {
    console.error('[Conversation Error]', error.message || error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process conversation'
    })
  }
})

export const elevenLabsRouter = router
