import { io } from 'socket.io-client'

let socket = null
let socketUrl = ''

export function getServerUrl() {
  return localStorage.getItem('server_url') || 'http://localhost:3000'
}

export function getSocket() {
  const serverUrl = getServerUrl()
  // 服务地址变更时自动重建连接（保存即生效，无需重启）
  if (!socket || socketUrl !== serverUrl) {
    if (socket) {
      try { socket.removeAllListeners(); socket.disconnect() } catch (e) { /* ignore */ }
    }
    socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    })
    socketUrl = serverUrl
    // 连接/重连时自动加入房间
    socket.on('connect', () => {
      socket.emit('join_screen')
      socket.emit('join_kitchen')
    })
  }
  return socket
}

export function onEvent(event, callback) {
  const s = getSocket()
  s.on(event, callback)
  return () => s.off(event, callback)
}
