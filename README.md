# 局域网扫码点餐系统

基于 Node.js 全栈的局域网扫码点餐系统，支持客户扫码点餐、后厨实时接单、管理后台运营，部署在局域网内无需外网。

## 功能特性

- 客户扫码点餐（分类浏览、规格选择、购物车、下单）
- 后厨实时看板（WebSocket 推送新订单、声音提醒、标记上菜）
- 上菜通知（客户端实时收到上菜提醒）
- 管理后台（菜品管理、分类管理、订单管理、桌台管理、会员、优惠券、广告、页面装修）
- 桌台二维码生成与下载
- PC / 手机响应式适配
- 页面装修（自定义主题色、店铺Logo、Banner、公告）
- 局域网部署，单端口运行

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express + Prisma + SQLite + Socket.io |
| 管理后台 | Vue 3 + Vite + Element Plus + Pinia |
| 客户端/后厨 | Vue 3 + Vite + Vant 4 + Socket.io-client |
| 认证 | JWT + bcryptjs |
| 部署 | 单端口 Express 托管静态文件 + API |

## 项目结构

```
├── server/          # 后端服务 (Express + Prisma + Socket.io)
│   ├── src/
│   │   ├── routes/      # API 路由 (admin, customer, kitchen, upload)
│   │   ├── middleware/  # 中间件 (JWT认证)
│   │   ├── socket/      # WebSocket 事件
│   │   ├── services/    # Prisma 客户端
│   │   └── app.js       # 入口
│   └── prisma/
│       └── schema.prisma  # 数据库模型
├── admin/           # 管理后台 (Vue3 + Element Plus)
│   └── src/views/       # 页面 (登录、仪表盘、菜品、订单、桌台、会员、优惠券、广告、装修、设置)
├── web/             # 客户点餐 + 后厨端 (Vue3 + Vant 4)
│   └── src/views/
│       ├── customer/    # 菜单、购物车、订单状态、订单列表
│       └── kitchen/     # 后厨看板、历史订单
└── start.bat        # Windows 一键启动脚本
```

## 快速开始

### 环境要求

- Node.js >= 18

### 启动

```bash
# 双击 start.bat 或执行:
cd server
node src/app.js
```

### 访问地址

| 端 | 地址 |
|----|------|
| 管理后台 | http://localhost:3000/admin |
| 客户点餐 | http://localhost:3000/c/menu?table=A01 |
| 后厨看板 | http://localhost:3000/kitchen |

管理后台默认账号: `admin` / `admin123`

### 局域网访问

启动后控制台会显示局域网 IP 地址，同一局域网内的手机/电脑通过该 IP 访问即可。桌台二维码会自动包含局域网地址。

## 开发

```bash
# 后端开发模式
cd server && npm run dev

# 管理后台开发
cd admin && npm run dev

# 客户端/后厨开发
cd web && npm run dev

# 构建前端
cd admin && npx vite build
cd web && npx vite build

# 数据库重置
cd server && npx prisma db push && node prisma/seed.js
```

## 订单流程

1. 客户扫描桌台二维码 → 进入点餐页面
2. 浏览菜单、选择规格、加入购物车、提交订单
3. 后厨看板实时收到新订单（声音提醒）
4. 后厨开始制作 → 标记上菜
5. 客户端收到上菜通知
6. 订单完成，桌台释放
