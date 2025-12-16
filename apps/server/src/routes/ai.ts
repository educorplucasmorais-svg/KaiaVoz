import { Router } from 'express'
import { NeuralCoreAgent } from '../services/neuralcore'

export const aiRouter = Router()
const agent = new NeuralCoreAgent()

// Processar comando de voz com NeuralCore
aiRouter.post('/voice', async (req, res) => {
  try {
    const { text, userId } = req.body

    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Texto é obrigatório' })
      return
    }

    const response = await agent.processVoiceCommand({
      text,
      timestamp: Date.now(),
      userId
    })

    res.json({
      success: true,
      data: response
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Processing error'
    console.error('[AI Error]', message)
    res.status(500).json({ success: false, error: message })
  }
})

// Endpoint legado para compatibilidade
aiRouter.post('/process', async (req, res) => {
  try {
    const { text } = req.body

    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Text is required' })
      return
    }

    const response = await agent.processVoiceCommand({
      text,
      timestamp: Date.now()
    })

    res.json({
      success: true,
      data: {
        intent: 'analyzed',
        response: response.speak,
        action: 'speak',
        confidence: 0.95,
        thought: response.thought
      }
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Processing error'
    console.error('[AI Error]', message)
    res.status(500).json({ success: false, error: message })
  }
})

