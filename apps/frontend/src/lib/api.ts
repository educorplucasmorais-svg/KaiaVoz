const base = import.meta.env.VITE_API_URL || '' // use Vite proxy in dev when empty

export async function createReminder(input: { title: string; when?: string; notes?: string }) {
  const res = await fetch(`${base}/api/reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
  return res.json() as Promise<{ success: boolean; data?: any; error?: string }>
}

export async function listReminders() {
  const res = await fetch(`${base}/api/reminders`)
  return res.json() as Promise<{ success: boolean; data?: any; error?: string }>
}
