const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const { notifyKitchenNewOrder, notifySettleRequest } = require('../socket');

// 获取装修配置（客户端无需登录）
router.get('/decoration', async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'decoration' } });
    const defaultDecoration = {
      themeColor: '#DA5650',
      storeName: '美味餐厅',
      storeLogo: '',
      banner: '',
      notice: '欢迎光临，祝您用餐愉快！',
      showBanner: true,
      showNotice: true
    };
    const data = setting ? JSON.parse(setting.value) : defaultDecoration;
    res.json({ code: 200, message: 'ok', data });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取菜单（客户端无需登录）
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

// 获取广告列表
router.get('/ads', async (req, res) => {
  try {
    const ads = await prisma.ad.findMany({
      where: { status: 1 },
      orderBy: { sort: 'asc' }
    });
    res.json({ code: 200, message: 'ok', data: ads });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取桌台信息
router.get('/table/:tableNo', async (req, res) => {
  try {
    const table = await prisma.diningTable.findUnique({
      where: { tableNo: req.params.tableNo }
    });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }
    res.json({ code: 200, message: 'ok', data: table });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 提交订单
router.post('/orders', async (req, res) => {
  try {
    const { tableNo, items, remark } = req.body;
    // items: [{ productId, specInfo, quantity }]

    if (!tableNo || !items || items.length === 0) {
      return res.json({ code: 400, message: '订单信息不完整', data: null });
    }

    const table = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    // 计算总价并验证菜品
    let totalPrice = 0;
    let itemCount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });
      if (!product || product.status !== 1) {
        return res.json({ code: 400, message: `菜品"${item.name || item.productId}"不可用`, data: null });
      }
      const itemTotal = product.price * item.quantity;
      totalPrice += itemTotal;
      itemCount += item.quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        specInfo: item.specInfo || null,
        quantity: item.quantity,
        price: product.price
      });
    }

    // 生成订单号: 日期+时间戳+随机数
    const now = new Date();
    const orderNo = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNo,
        tableId: table.id,
        totalPrice,
        itemCount,
        remark: remark || null,
        items: { create: orderItems }
      },
      include: { items: true, table: true }
    });

    // 更新桌台状态为使用中
    await prisma.diningTable.update({
      where: { id: table.id },
      data: { status: 1 }
    });

    // 通知后厨
    notifyKitchenNewOrder(order);

    res.json({ code: 200, message: '下单成功', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 查看订单状态
router.get('/orders/:orderNo', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNo: req.params.orderNo },
      include: { items: true, table: true }
    });
    if (!order) {
      return res.json({ code: 404, message: '订单不存在', data: null });
    }
    res.json({ code: 200, message: 'ok', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取某桌台的订单列表
router.get('/orders', async (req, res) => {
  try {
    const { tableNo } = req.query;
    if (!tableNo) {
      return res.json({ code: 400, message: '缺少桌号参数', data: null });
    }
    const table = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }
    const orders = await prisma.order.findMany({
      where: { tableId: table.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json({ code: 200, message: 'ok', data: orders });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 顾客发起结算请求
router.post('/orders/request-settle', async (req, res) => {
  try {
    const { tableNo } = req.body;
    if (!tableNo) {
      return res.json({ code: 400, message: '缺少桌号参数', data: null });
    }
    const table = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    // 将该桌所有未结算订单标记为"请求结算"
    const updatedOrders = await prisma.order.updateMany({
      where: { tableId: table.id, settleStatus: 0, status: { not: 4 } },
      data: { settleStatus: 1 }
    });

    if (updatedOrders.count === 0) {
      return res.json({ code: 400, message: '没有可结算的订单', data: null });
    }

    // 获取更新后的订单列表
    const orders = await prisma.order.findMany({
      where: { tableId: table.id, settleStatus: 1 },
      include: { items: true, table: true }
    });

    // 通知桌面端/大屏
    notifySettleRequest(tableNo, orders);

    res.json({ code: 200, message: '结算请求已发送，请等待商家确认', data: { count: updatedOrders.count } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
