const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const { initSocket } = require('./socket');

// 导入路由
const adminRoutes = require('./routes/admin');
const customerRoutes = require('./routes/customer');
const kitchenRoutes = require('./routes/kitchen');
const uploadRoutes = require('./routes/upload');
const waiterRoutes = require('./routes/waiter');
const printerRoutes = require('./routes/printer');

const app = express();
const server = http.createServer(app);

// Socket.io 配置
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 将 io 实例挂载到 app 上，供路由使用
app.set('io', io);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 上传的图片
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 路由
app.use('/api/admin', adminRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/waiter', waiterRoutes);
app.use('/api/admin/printer', printerRoutes);

// 生产环境：托管前端静态文件
const adminDist = path.join(__dirname, '../../admin/dist');
const webDist = path.join(__dirname, '../../web/dist');

const fs = require('fs');
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

if (fs.existsSync(webDist)) {
  app.use('/', express.static(webDist));
  app.get(['/c/*', '/c'], (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
  app.get(['/kitchen', '/kitchen/*'], (req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    data: null
  });
});

// 初始化 Socket
initSocket(io);

// 启动服务
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`  点餐系统服务已启动`);
  console.log(`  本地访问: http://localhost:${PORT}`);
  console.log(`  管理后台: http://localhost:${PORT}/admin`);
  console.log(`  后厨端:   http://localhost:${PORT}/kitchen`);
  console.log(`========================================`);
  
  // 获取局域网IP
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  局域网访问: http://${iface.address}:${PORT}`);
        console.log(`  管理后台:   http://${iface.address}:${PORT}/admin`);
        console.log(`  后厨端:     http://${iface.address}:${PORT}/kitchen`);
      }
    }
  }
  console.log(`========================================`);
});

module.exports = app;
