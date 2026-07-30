import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    // 桌面端连接后端服务（同机或局域网）
    const serverUrl = localStorage.getItem('server_url') || 'http://localhost:3000'
    socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export function onEvent(event, callback) {
  const s = getSocket()
  s.on(event, callback)
  return () => s.off(event, callback)
}
