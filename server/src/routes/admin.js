const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const prisma = require('../services/prisma');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { notifySettleComplete, notifyTableStatusChange, notifyKitchenNewOrder } = require('../socket');

// ==================== 登录 ====================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空', data: null });
    }

    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) {
      return res.json({ code: 400, message: '用户名或密码错误', data: null });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.json({ code: 400, message: '用户名或密码错误', data: null });
    }

    if (user.status !== 1) {
      return res.json({ code: 400, message: '账号已被禁用', data: null });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, nickname: user.nickname, role: user.role }
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取当前用户信息
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.adminUser.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, nickname: true, role: true }
    });
    res.json({ code: 200, message: 'ok', data: user });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 分类管理 ====================
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.category.findMany({
      orderBy: { sort: 'asc' },
      include: { _count: { select: { products: true } } }
    });
    res.json({ code: 200, message: 'ok', data: list });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name, sort, status, icon } = req.body;
    const category = await prisma.category.create({
      data: { name, sort: sort || 0, status: status ?? 1, icon }
    });
    res.json({ code: 200, message: '创建成功', data: category });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const { name, sort, status, icon } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name, sort, status, icon }
    });
    res.json({ code: 200, message: '更新成功', data: category });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/categories/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.json({ code: 400, message: '该分类下还有菜品，无法删除', data: null });
    }
    await prisma.category.delete({ where: { id } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 菜品管理 ====================
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const { categoryId, status, keyword, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (status !== undefined && status !== '') where.status = parseInt(status);
    if (keyword) where.name = { contains: keyword };

    const total = await prisma.product.count({ where });
    const list = await prisma.product.findMany({
      where,
      include: { category: true, specs: true },
      orderBy: { sort: 'asc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize)
    });
    res.json({ code: 200, message: 'ok', data: { list, total } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/products', authMiddleware, async (req, res) => {
  try {
    const { name, categoryId, price, image, images, description, unit, sort, status, isHot, isDiscount, specs } = req.body;
    const product = await prisma.product.create({
      data: {
        name, categoryId, price, image, images,
        description, unit: unit || '份', sort: sort || 0,
        status: status ?? 1, isHot: isHot || 0, isDiscount: isDiscount || 0,
        specs: specs && specs.length > 0 ? {
          create: specs.map(s => ({ name: s.name, values: JSON.stringify(s.values) }))
        } : undefined
      },
      include: { specs: true, category: true }
    });
    res.json({ code: 200, message: '创建成功', data: product });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/products/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, categoryId, price, image, images, description, unit, sort, status, isHot, isDiscount, specs } = req.body;

    // 更新菜品基本信息
    const product = await prisma.product.update({
      where: { id },
      data: { name, categoryId, price, image, images, description, unit, sort, status, isHot, isDiscount }
    });

    // 更新规格：先删后建
    if (specs) {
      await prisma.productSpec.deleteMany({ where: { productId: id } });
      if (specs.length > 0) {
        await prisma.productSpec.createMany({
          data: specs.map(s => ({ productId: id, name: s.name, values: JSON.stringify(s.values) }))
        });
      }
    }

    const result = await prisma.product.findUnique({
      where: { id },
      include: { specs: true, category: true }
    });
    res.json({ code: 200, message: '更新成功', data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/products/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 桌台管理 ====================
router.get('/tables', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.diningTable.findMany({
      orderBy: { tableNo: 'asc' },
      include: { _count: { select: { orders: true } } }
    });
    res.json({ code: 200, message: 'ok', data: list });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/tables', authMiddleware, async (req, res) => {
  try {
    const { tableNo, seats, area } = req.body;
    if (!tableNo) {
      return res.json({ code: 400, message: '桌号不能为空', data: null });
    }
    const existing = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (existing) {
      return res.json({ code: 400, message: '桌号已存在', data: null });
    }
    const table = await prisma.diningTable.create({
      data: { tableNo, seats: seats || 4, area }
    });
    res.json({ code: 200, message: '创建成功', data: table });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/tables/:id', authMiddleware, async (req, res) => {
  try {
    const { tableNo, seats, status, area } = req.body;
    const table = await prisma.diningTable.update({
      where: { id: parseInt(req.params.id) },
      data: { tableNo, seats, status, area }
    });
    res.json({ code: 200, message: '更新成功', data: table });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/tables/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.diningTable.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 生成桌台二维码
router.get('/tables/:id/qrcode', authMiddleware, async (req, res) => {
  try {
    const table = await prisma.diningTable.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    // 获取服务器IP
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let serverIP = 'localhost';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          serverIP = iface.address;
          break;
        }
      }
    }

    const port = process.env.PORT || 3000;
    const url = `http://${serverIP}:${port}/c/menu?table=${table.tableNo}`;

    // 生成二维码图片
    const qrDir = path.join(__dirname, '../../uploads/qrcode');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    const qrFilename = `table_${table.tableNo}.png`;
    const qrPath = path.join(qrDir, qrFilename);
    await QRCode.toFile(qrPath, url, { width: 300, margin: 2 });

    // 更新数据库
    const qrCodeUrl = `/uploads/qrcode/${qrFilename}`;
    await prisma.diningTable.update({
      where: { id: table.id },
      data: { qrCodeUrl }
    });

    res.json({ code: 200, message: 'ok', data: { qrCodeUrl, url } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 获取当前服务器IP的辅助函数
function getServerIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let serverIP = 'localhost';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        serverIP = iface.address;
        break;
      }
    }
  }
  return serverIP;
}

// 一键刷新全部桌台二维码（用当前服务器IP重新生成）
router.put('/tables/qrcode/refresh-all', authMiddleware, async (req, res) => {
  try {
    const tables = await prisma.diningTable.findMany();
    const serverIP = getServerIP();
    const port = process.env.PORT || 3000;

    const qrDir = path.join(__dirname, '../../uploads/qrcode');
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    let count = 0;
    for (const table of tables) {
      const url = `http://${serverIP}:${port}/c/menu?table=${table.tableNo}`;
      const qrFilename = `table_${table.tableNo}.png`;
      const qrPath = path.join(qrDir, qrFilename);
      await QRCode.toFile(qrPath, url, { width: 300, margin: 2 });
      await prisma.diningTable.update({
        where: { id: table.id },
        data: { qrCodeUrl: `/uploads/qrcode/${qrFilename}` }
      });
      count++;
    }

    res.json({ code: 200, message: `已刷新 ${count} 张二维码，当前服务器IP: ${serverIP}`, data: { count, serverIP } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 订单管理 ====================
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { status, tableNo, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (status !== undefined && status !== '') where.status = parseInt(status);
    if (tableNo) where.table = { tableNo: { contains: tableNo } };

    const total = await prisma.order.count({ where });
    const list = await prisma.order.findMany({
      where,
      include: { items: true, table: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize)
    });
    res.json({ code: 200, message: 'ok', data: { list, total } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/orders/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { items: true, table: true }
    });
    res.json({ code: 200, message: '更新成功', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 会员管理 ====================
router.get('/members', authMiddleware, async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (keyword) {
      where.OR = [
        { nickname: { contains: keyword } },
        { phone: { contains: keyword } }
      ];
    }
    const total = await prisma.member.count({ where });
    const list = await prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: parseInt(pageSize)
    });
    res.json({ code: 200, message: 'ok', data: { list, total } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/members', authMiddleware, async (req, res) => {
  try {
    const { nickname, phone, balance, points } = req.body;
    const member = await prisma.member.create({
      data: { nickname, phone, balance: balance || 0, points: points || 0 }
    });
    res.json({ code: 200, message: '创建成功', data: member });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/members/:id', authMiddleware, async (req, res) => {
  try {
    const { nickname, phone, balance, points, status } = req.body;
    const member = await prisma.member.update({
      where: { id: parseInt(req.params.id) },
      data: { nickname, phone, balance, points, status }
    });
    res.json({ code: 200, message: '更新成功', data: member });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/members/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.member.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 优惠券管理 ====================
router.get('/coupons', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ code: 200, message: 'ok', data: list });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/coupons', authMiddleware, async (req, res) => {
  try {
    const { name, type, value, minAmount, startTime, endTime, total, status } = req.body;
    const coupon = await prisma.coupon.create({
      data: {
        name, type: type || 1, value, minAmount: minAmount || 0,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        total: total || 100, status: status ?? 1
      }
    });
    res.json({ code: 200, message: '创建成功', data: coupon });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/coupons/:id', authMiddleware, async (req, res) => {
  try {
    const { name, type, value, minAmount, startTime, endTime, total, status } = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name, type, value, minAmount,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        total, status
      }
    });
    res.json({ code: 200, message: '更新成功', data: coupon });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/coupons/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 广告管理 ====================
router.get('/ads', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.ad.findMany({ orderBy: { sort: 'asc' } });
    res.json({ code: 200, message: 'ok', data: list });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.post('/ads', authMiddleware, async (req, res) => {
  try {
    const { title, image, url, sort, status } = req.body;
    const ad = await prisma.ad.create({
      data: { title, image, url, sort: sort || 0, status: status ?? 1 }
    });
    res.json({ code: 200, message: '创建成功', data: ad });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/ads/:id', authMiddleware, async (req, res) => {
  try {
    const { title, image, url, sort, status } = req.body;
    const ad = await prisma.ad.update({
      where: { id: parseInt(req.params.id) },
      data: { title, image, url, sort, status }
    });
    res.json({ code: 200, message: '更新成功', data: ad });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.delete('/ads/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.ad.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 系统设置 ====================
router.get('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json({ code: 200, message: 'ok', data: settingsMap });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  try {
    const settings = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    res.json({ code: 200, message: '保存成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 统计 ====================
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await prisma.order.count({
      where: { createdAt: { gte: today } }
    });
    const todayRevenue = await prisma.order.aggregate({
      where: { createdAt: { gte: today }, status: { not: 4 } },
      _sum: { totalPrice: true }
    });
    const pendingOrders = await prisma.order.count({
      where: { status: { in: [0, 1] } }
    });
    const totalProducts = await prisma.product.count();
    const totalTables = await prisma.diningTable.count();
    const busyTables = await prisma.diningTable.count({ where: { status: 1 } });

    res.json({
      code: 200,
      message: 'ok',
      data: {
        todayOrders,
        todayRevenue: todayRevenue._sum.totalPrice || 0,
        pendingOrders,
        totalProducts,
        totalTables,
        busyTables,
        serverIP: getServerIP()
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 页面装修 ====================
router.get('/decoration', authMiddleware, async (req, res) => {
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

router.put('/decoration', authMiddleware, async (req, res) => {
  try {
    const decoration = req.body;
    await prisma.setting.upsert({
      where: { key: 'decoration' },
      update: { value: JSON.stringify(decoration) },
      create: { key: 'decoration', value: JSON.stringify(decoration) }
    });
    res.json({ code: 200, message: '保存成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 结算管理 ====================
// 获取待结算订单列表
router.get('/settle-pending', authMiddleware, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { settleStatus: 1 },
      include: { items: true, table: true },
      orderBy: { updatedAt: 'asc' }
    });
    res.json({ code: 200, message: 'ok', data: orders });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 后台确认结算
router.put('/orders/:id/settle', authMiddleware, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true }
    });
    if (!order) {
      return res.json({ code: 404, message: '订单不存在', data: null });
    }
    if (order.settleStatus === 2) {
      return res.json({ code: 400, message: '订单已结算', data: null });
    }

    // 更新订单状态
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { settleStatus: 2, status: 3, settledAt: new Date() },
      include: { items: true, table: true }
    });

    // 检查该桌是否还有其他未结算订单
    const remainingOrders = await prisma.order.count({
      where: { tableId: order.tableId, settleStatus: { not: 2 }, status: { not: 4 } }
    });

    // 如果没有未结算订单，释放桌台
    if (remainingOrders === 0) {
      await prisma.diningTable.update({
        where: { id: order.tableId },
        data: { status: 0 }
      });
      notifyTableStatusChange({ ...order.table, status: 0 });
    }

    // 通知顾客端结算完成
    notifySettleComplete(order.table.tableNo, [updatedOrder]);

    res.json({ code: 200, message: '结算成功', data: updatedOrder });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 整桌结算（一次性结算某桌所有订单）
router.put('/tables/:id/settle-all', authMiddleware, async (req, res) => {
  try {
    const tableId = parseInt(req.params.id);
    const table = await prisma.diningTable.findUnique({ where: { id: tableId } });
    if (!table) {
      return res.json({ code: 404, message: '桌台不存在', data: null });
    }

    // 获取该桌所有未结算订单
    const orders = await prisma.order.findMany({
      where: { tableId, settleStatus: { not: 2 }, status: { not: 4 } },
      include: { items: true, table: true }
    });

    if (orders.length === 0) {
      return res.json({ code: 400, message: '没有可结算的订单', data: null });
    }

    // 批量更新
    await prisma.order.updateMany({
      where: { tableId, settleStatus: { not: 2 }, status: { not: 4 } },
      data: { settleStatus: 2, status: 3, settledAt: new Date() }
    });

    // 释放桌台
    await prisma.diningTable.update({
      where: { id: tableId },
      data: { status: 0 }
    });

    notifyTableStatusChange({ ...table, status: 0 });
    notifySettleComplete(table.tableNo, orders);

    res.json({ code: 200, message: `已结算 ${orders.length} 笔订单`, data: orders });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 外卖管理 ====================
// 创建外卖订单
router.post('/takeout/orders', authMiddleware, async (req, res) => {
  try {
    const { tableNo, items, remark } = req.body;
    if (!tableNo || !items || items.length === 0) {
      return res.json({ code: 400, message: '订单信息不完整', data: null });
    }

    const table = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!table) {
      return res.json({ code: 404, message: '外卖桌台不存在', data: null });
    }

    let totalPrice = 0;
    let itemCount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.status !== 1) {
        return res.json({ code: 400, message: `菜品“${item.name || item.productId}”不可用`, data: null });
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
    const orderNo = `TK${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNo,
        tableId: table.id,
        totalPrice,
        itemCount,
        remark: remark || null,
        orderType: 'takeout',
        items: { create: orderItems }
      },
      include: { items: true, table: true }
    });

    await prisma.diningTable.update({ where: { id: table.id }, data: { status: 1 } });
    notifyKitchenNewOrder(order);
    notifyTableStatusChange({ ...table, status: 1 });

    res.json({ code: 200, message: '外卖订单创建成功', data: order });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// ==================== 大屏 ====================
// 获取所有桌台实时状态
router.get('/screen/tables', authMiddleware, async (req, res) => {
  try {
    const tables = await prisma.diningTable.findMany({
      orderBy: { tableNo: 'asc' },
      include: {
        orders: {
          where: { settleStatus: { not: 2 }, status: { not: 4 } },
          include: { items: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // 计算每桌的消费金额和订单摘要
    const result = tables.map(table => {
      const activeOrders = table.orders;
      const totalAmount = activeOrders.reduce((sum, o) => sum + o.totalPrice, 0);
      const totalItems = activeOrders.reduce((sum, o) => sum + o.itemCount, 0);
      const hasSettleRequest = activeOrders.some(o => o.settleStatus === 1);
      const firstOrderTime = activeOrders.length > 0 ? activeOrders[activeOrders.length - 1].createdAt : null;

      return {
        id: table.id,
        tableNo: table.tableNo,
        seats: table.seats,
        status: table.status,
        type: table.type,
        area: table.area,
        totalAmount,
        totalItems,
        orderCount: activeOrders.length,
        hasSettleRequest,
        firstOrderTime,
        orders: activeOrders
      };
    });

    res.json({ code: 200, message: 'ok', data: result });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
