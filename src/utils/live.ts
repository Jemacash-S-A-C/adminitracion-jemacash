import { api, getAccessToken } from './api'

export function subscribeLive(onChange: () => void, onConnection?: (connected: boolean) => void) {
  const controller = new AbortController()
  let retry: ReturnType<typeof setTimeout> | undefined
  async function connect() {
    try {
      // The normal API helper handles access-token refresh before each stream.
      await api.get('/auth/me')
      if (controller.signal.aborted) return
      const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
      const response = await fetch(`${base}/live`, { headers: { Authorization: `Bearer ${getAccessToken()}` }, signal: controller.signal })
      if (!response.ok || !response.body) throw new Error('Live connection unavailable')
      onConnection?.(true)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')
        let boundary: number
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const event = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          if (event.includes('data:')) onChange()
        }
      }
    } catch { if (!controller.signal.aborted) onConnection?.(false) }
    if (!controller.signal.aborted) retry = setTimeout(connect, 1500)
  }
  void connect()
  return () => { controller.abort(); clearTimeout(retry) }
}
