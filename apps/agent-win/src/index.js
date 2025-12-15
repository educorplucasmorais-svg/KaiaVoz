import { WebSocketServer } from 'ws'
import { spawn } from 'child_process'
import os from 'os'

const PORT = 5111
const wss = new WebSocketServer({ port: PORT })

function isLocal(address) {
  try {
    const url = new URL(address)
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  } catch {
    return true
  }
}

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress || ''
  // Allow only local connections
  const isLocalhost = ip.includes('127.0.0.1') || ip.includes('::1')
  if (!isLocalhost) {
    ws.close(1008, 'Forbidden')
    return
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.kind === 'execute-command' && msg.confirm === true) {
        const id = msg.id || Math.random().toString(36).slice(2)
        const command = String(msg.command)

        // Emit started
        ws.send(JSON.stringify({ kind: 'event', id, event: { type: 'started', command } }))

        // Spawn PowerShell on Windows; fallback to sh on others (dev only)
        let child
        if (process.platform === 'win32') {
          child = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { cwd: msg.cwd || process.cwd() })
        } else {
          child = spawn('sh', ['-lc', command], { cwd: msg.cwd || process.cwd() })
        }

        child.stdout.on('data', (chunk) => {
          ws.send(JSON.stringify({ kind: 'event', id, event: { type: 'stdout', chunk: chunk.toString() } }))
        })
        child.stderr.on('data', (chunk) => {
          ws.send(JSON.stringify({ kind: 'event', id, event: { type: 'stderr', chunk: chunk.toString() } }))
        })
        child.on('close', (code) => {
          ws.send(JSON.stringify({ kind: 'event', id, event: { type: 'exit', code } }))
        })
      }
    } catch (e) {
      // ignore malformed
    }
  })
})

console.log(`Caia Windows Agent listening ws://127.0.0.1:${PORT}`)
