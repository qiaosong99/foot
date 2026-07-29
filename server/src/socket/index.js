// Socket.io 事件处理
function initSocket(io) {
  io.on('connection', (socket) => {
    console.log('客户端连接:', socket.id);

    // 客户端加入桌台房间
    socket.on('join_table', (tableNo) => {
      socket.join(`table_${tableNo}`);
      console.log(`Socket ${socket.id} 加入桌台 ${tableNo}`);
    });

    // 后厨加入厨房房间
    socket.on('join_kitchen', () => {
      socket.join('kitchen');
      console.log(`后厨端连接: ${socket.id}`);
    });

    // 离开房间
    socket.on('leave_table', (tableNo) => {
      socket.leave(`table_${tableNo}`);
    });

    socket.on('disconnect', () => {
      console.log('客户端断开:', socket.id);
    });
  });

  // 将 io 存储为全局可访问
  global.io = io;
}

// 通知后厨新订单
function notifyKitchenNewOrder(order) {
  if (global.io) {
    global.io.to('kitchen').emit('new_order', order);
  }
}

// 通知客户端上菜
function notifyTableServed(tableNo, order) {
  if (global.io) {
    global.io.to(`table_${tableNo}`).emit('order_served', order);
  }
}

// 通知订单状态变更
function notifyOrderStatusChange(tableNo, order) {
  if (global.io) {
    global.io.to(`table_${tableNo}`).emit('order_status_change', order);
    global.io.to('kitchen').emit('order_status_change', order);
  }
}

module.exports = {
  initSocket,
  notifyKitchenNewOrder,
  notifyTableServed,
  notifyOrderStatusChange
};
