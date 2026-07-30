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

    // 大屏加入房间
    socket.on('join_screen', () => {
      socket.join('screen');
      console.log(`大屏端连接: ${socket.id}`);
    });

    // 服务员加入房间
    socket.on('join_waiter', () => {
      socket.join('waiter');
      console.log(`服务员端连接: ${socket.id}`);
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
    global.io.to('screen').emit('new_order', order);
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
    global.io.to('screen').emit('order_status_change', order);
  }
}

// 通知结算请求（顾客发起 -> 桌面端/大屏）
function notifySettleRequest(tableNo, orders) {
  if (global.io) {
    global.io.to('screen').emit('settle_request', { tableNo, orders });
    global.io.to('kitchen').emit('settle_request', { tableNo, orders });
  }
}

// 通知结算完成（后台确认 -> 顾客端）
function notifySettleComplete(tableNo, orders) {
  if (global.io) {
    global.io.to(`table_${tableNo}`).emit('settle_complete', { tableNo, orders });
    global.io.to('screen').emit('settle_complete', { tableNo, orders });
    global.io.to('waiter').emit('settle_complete', { tableNo, orders });
  }
}

// 通知桌台状态变化（大屏实时更新）
function notifyTableStatusChange(table) {
  if (global.io) {
    global.io.to('screen').emit('table_status_change', table);
    global.io.to('waiter').emit('table_status_change', table);
  }
}

// 通知服务员下单（服务员 -> 后厨）
function notifyWaiterOrder(order) {
  if (global.io) {
    global.io.to('kitchen').emit('new_order', order);
    global.io.to('screen').emit('new_order', order);
    global.io.to(`table_${order.table.tableNo}`).emit('waiter_order', order);
  }
}

// 通知退菜
function notifyDishRemoved(tableNo, order) {
  if (global.io) {
    global.io.to(`table_${tableNo}`).emit('dish_removed', order);
    global.io.to('kitchen').emit('dish_removed', order);
    global.io.to('screen').emit('dish_removed', order);
  }
}

module.exports = {
  initSocket,
  notifyKitchenNewOrder,
  notifyTableServed,
  notifyOrderStatusChange,
  notifySettleRequest,
  notifySettleComplete,
  notifyTableStatusChange,
  notifyWaiterOrder,
  notifyDishRemoved
};
