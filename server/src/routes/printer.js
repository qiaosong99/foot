const express = require('express');
const router = express.Router();
const prisma = require('../services/prisma');
const { authMiddleware } = require('../middleware/auth');

// ==================== 打印机配置 ====================
// 获取打印机配置列表
router.get('/config', authMiddleware, async (req, res) => {
  try {
    const list = await prisma.printerConfig.findMany({ orderBy: { isDefault: 'desc' } });
    res.json({ code: 200, message: 'ok', data: list });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 保存打印机配置
router.put('/config', authMiddleware, async (req, res) => {
  try {
    const { id, name, ip, port, paperWidth, isDefault, status } = req.body;

    if (id) {
      // 更新
      const config = await prisma.printerConfig.update({
        where: { id },
        data: { name, ip, port, paperWidth, isDefault, status }
      });
      res.json({ code: 200, message: '更新成功', data: config });
    } else {
      // 新建
      const config = await prisma.printerConfig.create({
        data: {
          name: name || '默认打印机',
          ip,
          port: port || 9100,
          paperWidth: paperWidth || 58,
          isDefault: isDefault ?? 1,
          status: status ?? 1
        }
      });
      res.json({ code: 200, message: '创建成功', data: config });
    }
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 删除打印机配置
router.delete('/config/:id', authMiddleware, async (req, res) => {
  try {
    await prisma.printerConfig.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ code: 200, message: '删除成功', data: null });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 测试打印（返回打印数据，实际打印由桌面端执行）
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { ip, port } = req.body;
    res.json({
      code: 200,
      message: 'ok',
      data: {
        type: 'test',
        ip: ip || '192.168.0.100',
        port: port || 9100,
        content: {
          storeName: '测试餐厅',
          text: '这是一张测试小票',
          time: new Date().toLocaleString()
        }
      }
    });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 扫描局域网打印机
router.post('/scan', authMiddleware, async (req, res) => {
  const net = require('net');
  const { subnet } = req.body; // 如 "192.168.0"
  const os = require('os');

  // 自动检测局域网网段
  let base = subnet;
  if (!base) {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          base = iface.address.split('.').slice(0, 3).join('.');
          break;
        }
      }
      if (base) break;
    }
  }
  if (!base) base = '192.168.0';

  const found = [];
  const promises = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${base}.${i}`;
    promises.push(new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.connect(9100, ip, () => {
        socket.destroy();
        resolve(ip);
      });
      socket.on('error', () => { socket.destroy(); resolve(null); });
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
    }));
  }

  const results = await Promise.all(promises);
  results.forEach(ip => { if (ip) found.push(ip); });

  res.json({ code: 200, message: `扫描完成，发现 ${found.length} 台打印机`, data: found });
});

// ==================== 小票模板 ====================
// 获取小票模板
router.get('/template', authMiddleware, async (req, res) => {
  try {
    let template = await prisma.receiptTemplate.findFirst({
      where: { isDefault: 1 }
    });
    if (!template) {
      // 创建默认模板
      template = await prisma.receiptTemplate.create({
        data: {
          name: '默认模板',
          storeName: '美味餐厅',
          storePhone: '',
          storeAddr: '',
          headerText: '欢迎光临',
          footerText: '谢谢惠顾，欢迎下次光临！',
          paperWidth: 58,
          fontSize: 12,
          isDefault: 1
        }
      });
    }
    res.json({ code: 200, message: 'ok', data: template });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 保存小票模板
router.put('/template', authMiddleware, async (req, res) => {
  try {
    const { id, name, storeName, storePhone, storeAddr, headerText, footerText, showLogo, logoUrl, paperWidth, fontSize } = req.body;

    if (id) {
      const template = await prisma.receiptTemplate.update({
        where: { id },
        data: { name, storeName, storePhone, storeAddr, headerText, footerText, showLogo, logoUrl, paperWidth, fontSize }
      });
      res.json({ code: 200, message: '保存成功', data: template });
    } else {
      const template = await prisma.receiptTemplate.create({
        data: {
          name: name || '默认模板',
          storeName: storeName || '',
          storePhone,
          storeAddr,
          headerText,
          footerText,
          showLogo: showLogo || 0,
          logoUrl,
          paperWidth: paperWidth || 58,
          fontSize: fontSize || 12,
          isDefault: 1
        }
      });
      res.json({ code: 200, message: '创建成功', data: template });
    }
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 预览小票（根据模板和订单数据生成预览）
router.post('/preview', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    const template = await prisma.receiptTemplate.findFirst({ where: { isDefault: 1 } });
    if (!template) {
      return res.json({ code: 400, message: '请先配置小票模板', data: null });
    }

    let orderData = null;
    if (orderId) {
      orderData = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, table: true }
      });
    }

    // 生成预览数据
    const preview = {
      template: {
        storeName: template.storeName,
        storePhone: template.storePhone,
        storeAddr: template.storeAddr,
        headerText: template.headerText,
        footerText: template.footerText,
        paperWidth: template.paperWidth,
        fontSize: template.fontSize
      },
      order: orderData ? {
        orderNo: orderData.orderNo,
        tableNo: orderData.table.tableNo,
        orderType: orderData.orderType,
        createdAt: orderData.createdAt,
        items: orderData.items.map(i => ({
          name: i.name,
          specInfo: i.specInfo,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.price * i.quantity
        })),
        totalPrice: orderData.totalPrice,
        itemCount: orderData.itemCount
      } : {
        orderNo: '20260730120000001',
        tableNo: 'A01',
        orderType: 'dine_in',
        createdAt: new Date().toISOString(),
        items: [
          { name: '宫保鸡丁', specInfo: '微辣', quantity: 1, price: 38, subtotal: 38 },
          { name: '米饭', specInfo: null, quantity: 2, price: 3, subtotal: 6 }
        ],
        totalPrice: 44,
        itemCount: 3
      }
    };

    res.json({ code: 200, message: 'ok', data: preview });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
