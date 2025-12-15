import { Router } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import * as chrono from 'chrono-node'

const hasDb = Boolean(process.env.DATABASE_URL)
const prisma = hasDb ? new PrismaClient() : null

type MemReminder = {
  id: number
  title: string
  notes?: string | null
  whenAt: Date
  created: Date
}
const memory: { reminders: MemReminder[]; seq: number } = { reminders: [], seq: 1 }
export const remindersRouter = Router()

const CreateReminderSchema = z.object({
  title: z.string().min(1),
  when: z.string().optional(), // optional: we try to parse if missing
  notes: z.string().optional()
})

remindersRouter.post('/', async (req, res) => {
  try {
    const parsed = CreateReminderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid payload' })
    }
    const { title, when, notes } = parsed.data
    let whenAt: Date | null = null
    const ref = new Date()

    const parsePtBrNatural = (raw: string, reference: Date): Date | null => {
      const s = raw.toLowerCase()
      let offsetDays = 0
      if (/(depois\s+de\s+amanh[ãa])/i.test(s)) offsetDays = 2
      else if (/(amanh[ãa])/i.test(s)) offsetDays = 1
      else if (/(hoje)/i.test(s)) offsetDays = 0

      // special phrases
      if (/meio\s+dia/.test(s)) {
        const d = new Date(reference)
        d.setHours(12, 0, 0, 0)
        d.setDate(d.getDate() + offsetDays)
        return d
      }
      if (/meia\s+noite/.test(s)) {
        const d = new Date(reference)
        d.setHours(0, 0, 0, 0)
        d.setDate(d.getDate() + offsetDays)
        return d
      }

      // time like "às 9", "as 9", "9h", "9:30"
      const m = /(\bàs|\bas)?\s*(\d{1,2})(?:[:h](\d{2}))?/.exec(s)
      if (m) {
        const hour = parseInt(m[2], 10)
        const minute = m[3] ? parseInt(m[3], 10) : 0
        if (!isNaN(hour) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
          let h = hour
          // am/pm hints
          if (/da\s+manh[ãa]/.test(s)) {
            if (h === 12) h = 0
          } else if (/(da\s+tarde|da\s+noite)/.test(s)) {
            if (h < 12) h += 12
          }
          const d = new Date(reference)
          d.setHours(h, minute, 0, 0)
          d.setDate(d.getDate() + offsetDays)
          // if reference time already passed for today and no explicit today/amanhã, move forward
          if (offsetDays === 0 && !/hoje/.test(s)) {
            if (d.getTime() <= reference.getTime()) {
              d.setDate(d.getDate() + 1)
            }
          }
          return d
        }
      }
      return null
    }
    if (when) {
      // try native Date first
      const d = new Date(when)
      if (!isNaN(d.getTime())) {
        whenAt = d
      }
      // try custom pt-BR parser
      if (!whenAt) {
        whenAt = parsePtBrNatural(when, ref)
      }
      // fallback to chrono with current date as reference
      if (!whenAt) {
        const cd = chrono.parseDate(when, ref, { forwardDate: true })
        if (cd) whenAt = cd
      }
    }
    if (!whenAt) {
      // try to parse from title/notes using our pt-BR parser, then chrono
      const raw = [title, notes].filter(Boolean).join(' ')
      whenAt = parsePtBrNatural(raw, ref)
      if (!whenAt) {
        const parsedDate = chrono.parseDate(raw, ref, { forwardDate: true })
        if (parsedDate) whenAt = parsedDate
      }
    }
    if (!whenAt) {
      return res.status(400).json({ success: false, error: 'Could not parse reminder date/time. Provide when or say e.g. "amanhã às 9h".' })
    }
    if (prisma) {
      const reminder = await prisma.reminder.create({
        data: { title, whenAt, notes }
      })
      return res.json({ success: true, data: reminder })
    } else {
      const item: MemReminder = {
        id: memory.seq++,
        title,
        notes: notes ?? null,
        whenAt,
        created: new Date()
      }
      memory.reminders.push(item)
      return res.json({ success: true, data: item })
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Unknown error' })
  }
})

remindersRouter.get('/', async (_req, res) => {
  try {
    if (prisma) {
      const reminders = await prisma.reminder.findMany({ orderBy: { whenAt: 'asc' } })
      return res.json({ success: true, data: reminders })
    } else {
      const reminders = memory.reminders
        .slice()
        .sort((a, b) => a.whenAt.getTime() - b.whenAt.getTime())
      return res.json({ success: true, data: reminders })
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Unknown error' })
  }
})
