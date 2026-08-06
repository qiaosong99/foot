// 数据访问层：better-sqlite3 实现（Win7 兼容，无 Rust 引擎依赖）
// 接口与原 Prisma Client 完全兼容，业务路由无需改动
// 历史数据（Prisma 生成的 dev.db）可直接复用
module.exports = require('./db');
