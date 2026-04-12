import { useEffect, useRef, useCallback } from 'react'

interface WebSocketMessage {
  type: 'task_created' | 'task_updated' | 'task_deleted' | 'project_created' | 'project_updated' | 'project_deleted'
  project_id: string
  data: unknown
}

interface UseWebSocketOptions {
  projectId: string
  onTaskCreated?: (task: unknown) => void
  onTaskUpdated?: (task: unknown) => void
  onTaskDeleted?: (data: { id: string }) => void
  onProjectCreated?: (project: unknown) => void
  onProjectUpdated?: (project: unknown) => void
  onProjectDeleted?: (data: { id: string }) => void
}

export function useWebSocket({
  projectId,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const connect = useCallback(() => {
    if (!projectId) return

    // Construct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/projects/${projectId}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          switch (message.type) {
            case 'task_created':
              onTaskCreated?.(message.data)
              break
            case 'task_updated':
              onTaskUpdated?.(message.data)
              break
            case 'task_deleted':
              onTaskDeleted?.(message.data as { id: string })
              break
            case 'project_created':
              onProjectCreated?.(message.data)
              break
            case 'project_updated':
              onProjectUpdated?.(message.data)
              break
            case 'project_deleted':
              onProjectDeleted?.(message.data as { id: string })
              break
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting in 3s...')
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        ws.close()
      }
    } catch (err) {
      console.error('Failed to connect WebSocket:', err)
      reconnectTimeoutRef.current = setTimeout(connect, 3000)
    }
  }, [projectId, onTaskCreated, onTaskUpdated, onTaskDeleted, onProjectCreated, onProjectUpdated, onProjectDeleted])

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
