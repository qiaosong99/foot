// SQLite 数据层（better-sqlite3 实现，Prisma 兼容接口）
// 兼容 Win7：不依赖 Prisma Rust 引擎，直接复用原 Prisma 生成的 dev.db 文件结构
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../prisma/dev.db');

// ============ 建表（仅当数据库文件不存在时执行） ============
const INIT_SQL = `
CREATE TABLE IF NOT EXISTS AdminUser (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '管理员',
  role TEXT NOT NULL DEFAULT 'admin',
  status INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  icon TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  categoryId INTEGER NOT NULL,
  price REAL NOT NULL,
  image TEXT,
  images TEXT,
  description TEXT,
  unit TEXT NOT NULL DEFAULT '份',
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  sales INTEGER NOT NULL DEFAULT 0,
  isHot INTEGER NOT NULL DEFAULT 0,
  isDiscount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ProductSpec (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productId INTEGER NOT NULL,
  name TEXT NOT NULL,
  values TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS DiningTable (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tableNo TEXT NOT NULL UNIQUE,
  seats INTEGER NOT NULL DEFAULT 4,
  status INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'dine_in',
  qrCodeUrl TEXT,
  area TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "Order" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderNo TEXT NOT NULL UNIQUE,
  tableId INTEGER NOT NULL,
  status INTEGER NOT NULL DEFAULT 0,
  settleStatus INTEGER NOT NULL DEFAULT 0,
  orderType TEXT NOT NULL DEFAULT 'dine_in',
  totalPrice REAL NOT NULL DEFAULT 0,
  remark TEXT,
  itemCount INTEGER NOT NULL DEFAULT 0,
  settledAt TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS OrderItem (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId INTEGER NOT NULL,
  productId INTEGER NOT NULL,
  name TEXT NOT NULL,
  specInfo TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL,
  status INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS Member (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT,
  phone TEXT UNIQUE,
  avatar TEXT,
  balance REAL NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Coupon (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type INTEGER NOT NULL DEFAULT 1,
  value REAL NOT NULL,
  minAmount REAL NOT NULL DEFAULT 0,
  startTime TEXT,
  endTime TEXT,
  total INTEGER NOT NULL DEFAULT 100,
  used INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Ad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image TEXT NOT NULL,
  url TEXT,
  sort INTEGER NOT NULL DEFAULT 0,
  status INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS Setting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ReceiptTemplate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '默认模板',
  storeName TEXT NOT NULL DEFAULT '',
  storePhone TEXT,
  storeAddr TEXT,
  headerText TEXT,
  footerText TEXT,
  showLogo INTEGER NOT NULL DEFAULT 0,
  logoUrl TEXT,
  paperWidth INTEGER NOT NULL DEFAULT 58,
  fontSize INTEGER NOT NULL DEFAULT 12,
  isDefault INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS PrinterConfig (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '默认打印机',
  printMode TEXT NOT NULL DEFAULT 'network',
  deviceName TEXT,
  ip TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 9100,
  paperWidth INTEGER NOT NULL DEFAULT 58,
  isDefault INTEGER NOT NULL DEFAULT 1,
  status INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`;

const isNewDb = !fs.existsSync(dbPath);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

if (isNewDb) {
  db.exec(INIT_SQL);
  // 初始管理员 admin/admin123
  const bcrypt = require('bcryptjs');
  const now = Date.now();
  db.prepare('INSERT INTO AdminUser (username, password, nickname, role, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run('admin', bcrypt.hashSync('admin123', 10), '超级管理员', 'admin', 1, now, now);
  console.log('[db] 已初始化新数据库并创建默认管理员 admin/admin123');
} else {
  // 兼容旧库：确保 PrinterConfig 新字段存在（老库可能缺少）
  const cols = db.prepare('PRAGMA table_info(PrinterConfig)').all().map(c => c.name);
  if (!cols.includes('printMode')) {
    db.exec("ALTER TABLE PrinterConfig ADD COLUMN printMode TEXT NOT NULL DEFAULT 'network'");
  }
  if (!cols.includes('deviceName')) {
    db.exec('ALTER TABLE PrinterConfig ADD COLUMN deviceName TEXT');
  }
}

// ============ 关系定义 ============
// type: one=外键在对方表指向本表 / many=一对多
const RELATIONS = {
  AdminUser: {},
  Category: {
    products: { model: 'Product', fk: 'categoryId', type: 'many' }
  },
  Product: {
    category: { model: 'Category', fk: 'categoryId', type: 'one' },
    specs: { model: 'ProductSpec', fk: 'productId', type: 'many' },
    orderItems: { model: 'OrderItem', fk: 'productId', type: 'many' }
  },
  ProductSpec: {
    product: { model: 'Product', fk: 'productId', type: 'one' }
  },
  DiningTable: {
    orders: { model: 'Order', fk: 'tableId', type: 'many' }
  },
  Order: {
    table: { model: 'DiningTable', fk: 'tableId', type: 'one' },
    items: { model: 'OrderItem', fk: 'orderId', type: 'many' }
  },
  OrderItem: {
    order: { model: 'Order', fk: 'orderId', type: 'one' },
    product: { model: 'Product', fk: 'productId', type: 'one' }
  },
  Member: {},
  Coupon: {},
  Ad: {},
  Setting: {},
  ReceiptTemplate: {},
  PrinterConfig: {}
};

// 时间戳字段标记（Prisma 在 SQLite 中将 DateTime 存为毫秒时间戳）
const HAS_CREATED = {
  AdminUser: true, Category: true, Product: true, ProductSpec: false,
  DiningTable: true, Order: true, OrderItem: false, Member: true,
  Coupon: true, Ad: true, Setting: false, ReceiptTemplate: true, PrinterConfig: true
};
const HAS_UPDATED = {
  AdminUser: true, Category: true, Product: true, ProductSpec: false,
  DiningTable: true, Order: true, OrderItem: false, Member: true,
  Coupon: true, Ad: true, Setting: true, ReceiptTemplate: true, PrinterConfig: true
};
// DateTime 列（读取时转为 ISO 字符串，与 Prisma 输出保持一致）
const DATE_COLS = ['createdAt', 'updatedAt', 'settledAt', 'startTime', 'endTime'];

const TABLE = (name) => (name === 'Order' ? '"Order"' : name);
const COL = (name) => `"${name}"`; // 列名加引号（values/key 等为 SQLite 保留字）
const nowTs = () => Date.now();

function normValue(v) {
  if (v instanceof Date) return v.getTime();
  return v;
}

// 将行内 DateTime 列转为 ISO 字符串（模拟 Prisma 的 Date 序列化行为）
function mapDates(rows) {
  for (const r of rows) {
    for (const c of DATE_COLS) {
      if (typeof r[c] === 'number') r[c] = new Date(r[c]).toISOString();
    }
  }
  return rows;
}

// ============ where 子句构建 ============
function buildWhere(model, where, params, alias = 't') {
  const conds = [];
  if (!where) return '';
  for (const key of Object.keys(where)) {
    if (key === 'OR') {
      const subs = where.OR.map(w => {
        const inner = [];
        buildWhereInto(model, w, params, alias, inner);
        return '(' + inner.join(' AND ') + ')';
      });
      conds.push('(' + subs.join(' OR ') + ')');
      continue;
    }
    if (key === 'AND') {
      for (const w of where.AND) buildWhereInto(model, w, params, alias, conds);
      continue;
    }
    const rel = RELATIONS[model][key];
    if (rel) {
      // 嵌套关系条件 → EXISTS 子查询
      const childTable = TABLE(rel.model);
      const subConds = [];
      buildWhereInto(rel.model, where[key], params, 'c', subConds);
      const link = rel.type === 'many'
        ? `c.${COL(rel.fk)} = ${alias}.id`
        : `c.id = ${alias}.${COL(rel.fk)}`;
      conds.push(`EXISTS (SELECT 1 FROM ${childTable} c WHERE ${link}${subConds.length ? ' AND ' + subConds.join(' AND ') : ''})`);
      continue;
    }
    buildFieldCond(`${alias}.${COL(key)}`, where[key], params, conds);
  }
  return conds.length ? ' WHERE ' + conds.join(' AND ') : '';
}

function buildWhereInto(model, where, params, alias, conds) {
  for (const key of Object.keys(where)) {
    if (key === 'OR') {
      const subs = where.OR.map(w => {
        const inner = [];
        buildWhereInto(model, w, params, alias, inner);
        return '(' + inner.join(' AND ') + ')';
      });
      conds.push('(' + subs.join(' OR ') + ')');
      continue;
    }
    const rel = RELATIONS[model][key];
    if (rel) {
      const childTable = TABLE(rel.model);
      const subConds = [];
      buildWhereInto(rel.model, where[key], params, 'c', subConds);
      const link = rel.type === 'many'
        ? `c.${COL(rel.fk)} = ${alias}.id`
        : `c.id = ${alias}.${COL(rel.fk)}`;
      conds.push(`EXISTS (SELECT 1 FROM ${childTable} c WHERE ${link}${subConds.length ? ' AND ' + subConds.join(' AND ') : ''})`);
      continue;
    }
    buildFieldCond(`${alias}.${COL(key)}`, where[key], params, conds);
  }
}

function buildFieldCond(col, cond, params, conds) {
  if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
    for (const op of Object.keys(cond)) {
      const v = normValue(cond[op]);
      if (op === 'not') conds.push(`${col} != ?`), params.push(v);
      else if (op === 'in') conds.push(`${col} IN (${cond[op].map(() => '?').join(',')})`), params.push(...cond[op].map(normValue));
      else if (op === 'contains') conds.push(`${col} LIKE ?`), params.push(`%${v}%`);
      else if (op === 'gte') conds.push(`${col} >= ?`), params.push(v);
      else if (op === 'lte') conds.push(`${col} <= ?`), params.push(v);
      else if (op === 'gt') conds.push(`${col} > ?`), params.push(v);
      else if (op === 'lt') conds.push(`${col} < ?`), params.push(v);
    }
  } else {
    conds.push(`${col} = ?`);
    params.push(normValue(cond));
  }
}

function buildOrderBy(orderBy) {
  if (!orderBy) return '';
  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts = [];
  for (const e of entries) {
    for (const k of Object.keys(e)) parts.push(`${COL(k)} ${e[k] === 'desc' ? 'DESC' : 'ASC'}`);
  }
  return parts.length ? ' ORDER BY ' + parts.join(', ') : '';
}

// ============ include 组装 ============
function applyIncludes(model, rows, include) {
  if (!include || !rows.length) return rows;
  for (const relName of Object.keys(include)) {
    if (!include[relName]) continue;
    if (relName === '_count') {
      const spec = include._count.select || {};
      for (const cntRel of Object.keys(spec)) {
        const rel = RELATIONS[model][cntRel];
        if (!rel) continue;
        const childTable = TABLE(rel.model);
        const ids = rows.map(r => r.id);
        const counts = {};
        const rowsCount = db.prepare(
          `SELECT ${COL(rel.fk)} AS fk, COUNT(*) AS cnt FROM ${childTable} WHERE ${COL(rel.fk)} IN (${ids.map(() => '?').join(',')}) GROUP BY ${COL(rel.fk)}`
        ).all(...ids);
        rowsCount.forEach(rc => { counts[rc.fk] = rc.cnt; });
        rows.forEach(r => { r._count = r._count || {}; r._count[cntRel] = counts[r.id] || 0; });
      }
      continue;
    }
    const rel = RELATIONS[model][relName];
    if (!rel) continue;
    const sub = typeof include[relName] === 'object' ? include[relName] : {};
    if (rel.type === 'many') {
      const childTable = TABLE(rel.model);
      const parentIds = rows.map(r => r.id);
      const params = [...parentIds];
      let sql = `SELECT * FROM ${childTable} t WHERE t.${COL(rel.fk)} IN (${parentIds.map(() => '?').join(',')})`;
      if (sub.where) {
        const wParams = [];
        const wConds = [];
        buildWhereInto(rel.model, sub.where, wParams, 't', wConds);
        if (wConds.length) sql += ' AND ' + wConds.join(' AND ');
        params.push(...wParams);
      }
      sql += buildOrderBy(sub.orderBy);
      const children = db.prepare(sql).all(...params);
      mapDates(children);
      if (sub.include) applyIncludes(rel.model, children, sub.include);
      const grouped = {};
      children.forEach(c => {
        const fk = c[rel.fk];
        (grouped[fk] = grouped[fk] || []).push(sub.select ? pick(c, sub.select) : c);
      });
      rows.forEach(r => { r[relName] = grouped[r.id] || []; });
    } else {
      // one: 外键在本表行上
      const fkIds = [...new Set(rows.map(r => r[rel.fk]).filter(v => v != null))];
      const map = {};
      if (fkIds.length) {
        const childTable = TABLE(rel.model);
        let sql = `SELECT * FROM ${childTable} WHERE id IN (${fkIds.map(() => '?').join(',')})`;
        const children = db.prepare(sql).all(...fkIds);
        mapDates(children);
        if (sub.include) applyIncludes(rel.model, children, sub.include);
        children.forEach(c => { map[c.id] = sub.select ? pick(c, sub.select) : c; });
      }
      rows.forEach(r => { r[relName] = r[rel.fk] != null ? (map[r[rel.fk]] || null) : null; });
    }
  }
  return rows;
}

function pick(row, select) {
  const out = {};
  for (const k of Object.keys(select)) if (select[k]) out[k] = row[k];
  return out;
}

// ============ 模型工厂 ============
function makeModel(model) {
  const table = TABLE(model);
  const rels = RELATIONS[model];
  const hasCreated = HAS_CREATED[model];
  const hasUpdated = HAS_UPDATED[model];

  function findManyRaw({ where, orderBy, skip, take, include, select }) {
    const params = [];
    let sql = `SELECT * FROM ${table} t`;
    sql += buildWhere(model, where, params, 't');
    sql += buildOrderBy(orderBy);
    if (take !== undefined && take !== null) {
      sql += ' LIMIT ?';
      params.push(parseInt(take));
      if (skip) { sql += ' OFFSET ?'; params.push(parseInt(skip)); }
    }
    let rows = db.prepare(sql).all(...params);
    mapDates(rows);
    if (include) applyIncludes(model, rows, include);
    if (select) rows = rows.map(r => pick(r, select));
    return rows;
  }

  return {
    async findUnique({ where, include, select }) {
      const rows = findManyRaw({ where, include, select, take: 1 });
      return rows[0] || null;
    },
    async findFirst({ where, include, select, orderBy } = {}) {
      const rows = findManyRaw({ where, include, select, orderBy, take: 1 });
      return rows[0] || null;
    },
    async findMany(args = {}) {
      return findManyRaw(args);
    },
    async count({ where } = {}) {
      const params = [];
      const sql = `SELECT COUNT(*) AS cnt FROM ${table} t` + buildWhere(model, where, params, 't');
      return db.prepare(sql).get(...params).cnt;
    },
    async aggregate({ where, _sum } = {}) {
      const result = { _sum: {} };
      if (_sum) {
        for (const field of Object.keys(_sum)) {
          if (!_sum[field]) continue;
          const params = [];
          const sql = `SELECT SUM(${COL(field)}) AS s FROM ${table} t` + buildWhere(model, where, params, 't');
          const row = db.prepare(sql).get(...params);
          result._sum[field] = row.s;
        }
      }
      return result;
    },
    async create({ data, include } = {}) {
      const nested = {};
      const fields = {};
      for (const k of Object.keys(data)) {
        const v = data[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date) && (v.create || v.connect)) {
          nested[k] = v;
        } else if (v !== undefined) {
          fields[k] = normValue(v);
        }
      }
      const now = nowTs();
      if (hasCreated && fields.createdAt === undefined) fields.createdAt = now;
      if (hasUpdated) fields.updatedAt = now;
      const cols = Object.keys(fields);
      const info = db.prepare(
        `INSERT INTO ${table} (${cols.map(COL).join(',')}) VALUES (${cols.map(() => '?').join(',')})`
      ).run(...cols.map(c => fields[c]));
      const id = info.lastInsertRowid;
      // 嵌套创建
      for (const relName of Object.keys(nested)) {
        const rel = rels[relName];
        if (!rel || rel.type !== 'many') continue;
        const creates = Array.isArray(nested[relName].create) ? nested[relName].create : [nested[relName].create];
        for (const c of creates) {
          const child = makeModel(rel.model);
          await child.create({ data: { ...c, [rel.fk]: id } });
        }
      }
      return this.findUnique({ where: { id }, include });
    },
    async update({ where, data, include } = {}) {
      const target = await this.findUnique({ where });
      if (!target) throw new Error(`Record to update not found (${model})`);
      const fields = {};
      for (const k of Object.keys(data)) {
        const v = data[k];
        if (v !== null && typeof v === 'object' && !(v instanceof Date)) continue; // 跳过嵌套写操作
        if (v !== undefined) fields[k] = normValue(v);
      }
      if (hasUpdated && fields.updatedAt === undefined) fields.updatedAt = nowTs();
      const cols = Object.keys(fields);
      if (cols.length) {
        const sets = cols.map(c => `${COL(c)} = ?`).join(', ');
        db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...cols.map(c => fields[c]), target.id);
      }
      return this.findUnique({ where: { id: target.id }, include });
    },
    async updateMany({ where, data } = {}) {
      const fields = {};
      for (const k of Object.keys(data)) {
        if (data[k] !== undefined) fields[k] = normValue(data[k]);
      }
      if (hasUpdated && fields.updatedAt === undefined) fields.updatedAt = nowTs();
      const cols = Object.keys(fields);
      const params = cols.map(c => fields[c]);
      const wParams = [];
      const wSql = buildWhere(model, where, wParams, 't');
      const info = db.prepare(`UPDATE ${table} AS t SET ${cols.map(COL).map(c => `${c} = ?`).join(', ')}${wSql}`).run(...params, ...wParams);
      return { count: info.changes };
    },
    async upsert({ where, update, create, include } = {}) {
      const existing = await this.findUnique({ where });
      if (existing) return this.update({ where: { id: existing.id }, data: update, include });
      return this.create({ data: create, include });
    },
    async delete({ where } = {}) {
      const target = await this.findUnique({ where });
      if (!target) throw new Error(`Record to delete does not exist (${model})`);
      // 级联删除子记录
      for (const relName of Object.keys(rels)) {
        const rel = rels[relName];
        if (rel.type !== 'many') continue;
        db.prepare(`DELETE FROM ${TABLE(rel.model)} WHERE ${COL(rel.fk)} = ?`).run(target.id);
      }
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(target.id);
      return target;
    },
    async deleteMany({ where } = {}) {
      const params = [];
      const wSql = buildWhere(model, where, params, 't');
      const info = db.prepare(`DELETE FROM ${table}${wSql}`).run(...params);
      return { count: info.changes };
    }
  };
}

// ============ 导出（Prisma 客户端同名小驼峰接口） ============
const client = {
  adminUser: makeModel('AdminUser'),
  category: makeModel('Category'),
  product: makeModel('Product'),
  productSpec: makeModel('ProductSpec'),
  diningTable: makeModel('DiningTable'),
  order: makeModel('Order'),
  orderItem: makeModel('OrderItem'),
  member: makeModel('Member'),
  coupon: makeModel('Coupon'),
  ad: makeModel('Ad'),
  setting: makeModel('Setting'),
  receiptTemplate: makeModel('ReceiptTemplate'),
  printerConfig: makeModel('PrinterConfig'),
  $queryRaw: async () => [],
  $disconnect: async () => db.close()
};

module.exports = client;
