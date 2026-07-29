const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const { notifyTableServed, notifyOrderStatusChange } = require('../socket');

// 获取待处理订单列表（后厨端）
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status !== undefined && status !== '') {
      where.status = parseInt(status);
    } else {
      // 默认获取待制作和制作中的订单
      where.status = { in: [0, 1] };
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ code: 200, message: 'ok', data: orders });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取已完成订单（历史）
router.get('/orders/history', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const where = { status: { in: [2, 3] } };
    const total = await prisma.order.count({ where });
    const orders = await prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize)
    });
    res.json({ code: 200, message: 'ok', data: { list: orders, total } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 开始制作（状态: 待制作 -> 制作中）
router.put('/orders/:id/start', async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 1 },
      include: { items: true, table: true }
    });

    notifyOrderStatusChange(order.table.tableNo, order);
    res.json({ code: 200, message: '已开始制作', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 标记单个菜品上菜
router.put('/orders/:id/items/:itemId/serve', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    // 更新菜品状态
    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 1 }
    });

    // 检查是否所有菜品都已上菜
    const remainingItems = await prisma.orderItem.count({
      where: { orderId, status: 0 }
    });

    let order;
    if (remainingItems === 0) {
      // 所有菜品已上，更新订单状态为已上菜
      order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 2 },
        include: { items: true, table: true }
      });
    } else {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, table: true }
      });
    }

    // 通知客户端
    notifyTableServed(order.table.tableNo, order);
    res.json({ code: 200, message: '已上菜', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 整单上菜
router.put('/orders/:id/serve', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // 所有菜品标记为已上菜
    await prisma.orderItem.updateMany({
      where: { orderId },
      data: { status: 1 }
    });

    // 更新订单状态
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 2 },
      include: { items: true, table: true }
    });

    // 通知客户端
    notifyTableServed(order.table.tableNo, order);
    res.json({ code: 200, message: '整单已上菜', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 完成订单（已上菜 -> 已完成）
router.put('/orders/:id/complete', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: 3 },
      include: { items: true, table: true }
    });

    // 释放桌台
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: 0 }
    });

    notifyOrderStatusChange(order.table.tableNo, order);
    res.json({ code: 200, message: '订单已完成', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
