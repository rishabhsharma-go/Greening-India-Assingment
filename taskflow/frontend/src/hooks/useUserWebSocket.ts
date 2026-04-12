import { useEffect, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: 'project_assigned' | 'project_removed'
  user_id: string
  data: {
    project_id: string
    task?: unknown
  }
}

interface UseUserWebSocketOptions {
  userId: string
  onProjectAssigned?: (data: { project_id: string; task: unknown }) => void
  onProjectRemoved?: (data: { project_id: string }) => void
}

export function useUserWebSocket({
  userId,
  onProjectAssigned,
  onProjectRemoved,
}: UseUserWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!userId) return

    // Construct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/user/${userId}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('User WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'project_assigned':
              onProjectAssigned?.(message.data as { project_id: string; task: unknown })
              break
            case 'project_removed':
              onProjectRemoved?.(message.data as { project_id: string })
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('User WebSocket disconnected, reconnecting in 3s...')
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('User WebSocket error:', error)
        ws.close()
      }
    } catch (err) {
      console.error('Failed to connect User WebSocket:', err)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }
  }, [userId, onProjectAssigned, onProjectRemoved])

  useEffect(() => {
    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  return wsRef
}
