import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

// 客户端加入桌台房间
export function joinTable(tableNo) {
  const s = getSocket()
  s.emit('join_table', tableNo)
}

// 后厨加入厨房房间
export function joinKitchen() {
  const s = getSocket()
  s.emit('join_kitchen')
}

// 监听事件
export function onEvent(event, callback) {
  const s = getSocket()
  s.on(event, callback)
  return () => s.off(event, callback)
}
