const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const { notifyWaiterOrder, notifyDishRemoved, notifyTableStatusChange } = require('../socket');

// 获取所有桌台及状态
router.get('/tables', async (req, res) => {
  try {
    const tables = await prisma.diningTable.findMany({
      where: { type: 'dine_in' },
      orderBy: { tableNo: 'asc' },
      include: {
        orders: {
          where: { settleStatus: { not: 2 }, status: { not: 4 } },
          select: { id: true, totalPrice: true, itemCount: true, settleStatus: true }
        }
      }
    });

    const result = tables.map(table => ({
      id: table.id,
      tableNo: table.tableNo,
      seats: table.seats,
      status: table.status,
      area: table.area,
      orderCount: table.orders.length,
      totalAmount: table.orders.reduce((sum, o) => sum + o.totalPrice, 0),
      hasSettleRequest: table.orders.some(o => o.settleStatus === 1)
    }));

    res.json({ code: 200, message: 'ok', data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 查看某桌当前点单（未结算的）
router.get('/tables/:tableNo/orders', async (req, res) => {
  try {
    const table = await prisma.diningTable.findUnique({
      where: { tableNo: req.params.tableNo }
    });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    const orders = await prisma.order.findMany({
      where: { tableId: table.id, settleStatus: { not: 2 }, status: { not: 4 } },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ code: 200, message: 'ok', data: orders });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取菜单
router.get('/menu', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { status: 1 },
      orderBy: { sort: 'asc' },
      include: {
        products: {
          where: { status: 1 },
          orderBy: { sort: 'asc' },
          include: { specs: true }
        }
      }
    });
    res.json({ code: 200, message: 'ok', data: categories });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 服务员代客下单
router.post('/orders', async (req, res) => {
  try {
    const { tableNo, items, remark } = req.body;
    if (!tableNo || !items || items.length === 0) {
      return res.json({ code: 400, message: '订单信息不完整', data: null });
    }

    const table = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    let totalPrice = 0;
    let itemCount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status !== 1) {
        return res.json({ code: 400, message: `菜品"${item.name || item.productId}"不可用`, data: null });
      }
      totalPrice += product.price * item.quantity;
      itemCount += item.quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        specInfo: item.specInfo || null,
        quantity: item.quantity,
        price: product.price
      });
    }

    const now = new Date();
    const orderNo = `WT${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        tableId: table.id,
        totalPrice,
        itemCount,
        remark: remark || null,
        orderType: 'waiter',
        items: { create: orderItems }
      },
      include: { items: true, table: true }
    });

    // 更新桌台状态
    await prisma.diningTable.update({ where: { id: table.id }, data: { status: 1 } });

    // 通知后厨和大屏
    notifyWaiterOrder(order);
    notifyTableStatusChange({ ...table, status: 1 });

    res.json({ code: 200, message: '下单成功', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 退菜（删除某个订单明细）
router.delete('/orders/:id/items/:itemId', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true }
    });
    if (!order) {
      return res.json({ code: 404, message: '订单不存在', data: null });
    }
    if (order.settleStatus === 2) {
      return res.json({ code: 400, message: '已结算订单不能退菜', data: null });
    }

    const item = order.items.find(i => i.id === itemId);
    if (!item) {
      return res.json({ code: 404, message: '菜品不存在', data: null });
    }

    // 删除该菜品
    await prisma.orderItem.delete({ where: { id: itemId } });

    // 更新订单总价和数量
    const newTotalPrice = order.totalPrice - (item.price * item.quantity);
    const newItemCount = order.itemCount - item.quantity;

    // 检查订单是否还有菜品
    const remainingItems = order.items.length - 1;
    if (remainingItems === 0) {
      // 没有菜品了，取消订单
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 4, totalPrice: 0, itemCount: 0 }
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: { totalPrice: newTotalPrice, itemCount: newItemCount }
      });
    }

    // 获取更新后的订单
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true }
    });

    // 通知相关端
    notifyDishRemoved(order.table.tableNo, updatedOrder);

    res.json({ code: 200, message: `已退菜: ${item.name}`, data: updatedOrder });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
