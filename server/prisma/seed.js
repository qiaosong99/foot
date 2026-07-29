const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建管理员账号 admin/admin123
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      nickname: '超级管理员',
      role: 'admin'
    }
  });
  console.log('管理员账号创建成功: admin / admin123');

  // 创建默认分类
  const categories = [
    { name: '热菜', sort: 1 },
    { name: '凉菜', sort: 2 },
    { name: '汤类', sort: 3 },
    { name: '主食', sort: 4 },
    { name: '饮品', sort: 5 },
    { name: '小吃', sort: 6 }
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.sort },
      update: { name: cat.name },
      create: cat
    });
  }
  console.log('默认分类创建成功');

  // 创建示例菜品
  const sampleProducts = [
    { name: '宫保鸡丁', categoryId: 1, price: 38, unit: '份', description: '经典川菜，鸡肉嫩滑，花生酥脆' },
    { name: '麻婆豆腐', categoryId: 1, price: 28, unit: '份', description: '麻辣鲜香，下饭神器' },
    { name: '红烧肉', categoryId: 1, price: 48, unit: '份', description: '肥而不腻，入口即化' },
    { name: '水煮鱼', categoryId: 1, price: 58, unit: '份', description: '鲜嫩鱼片，麻辣过瘾' },
    { name: '凉拌黄瓜', categoryId: 2, price: 16, unit: '份', description: '清爽开胃' },
    { name: '皮蛋豆腐', categoryId: 2, price: 18, unit: '份', description: '清凉爽口' },
    { name: '番茄蛋汤', categoryId: 3, price: 18, unit: '份', description: '酸甜可口' },
    { name: '紫菜蛋花汤', categoryId: 3, price: 16, unit: '份', description: '清淡营养' },
    { name: '米饭', categoryId: 4, price: 3, unit: '碗', description: '精选东北大米' },
    { name: '蛋炒饭', categoryId: 4, price: 18, unit: '份', description: '粒粒分明' },
    { name: '可乐', categoryId: 5, price: 5, unit: '瓶', description: '冰镇可乐' },
    { name: '酸梅汤', categoryId: 5, price: 8, unit: '杯', description: '自制酸梅汤' },
  ];

  for (const prod of sampleProducts) {
    const existing = await prisma.product.findFirst({ where: { name: prod.name } });
    if (!existing) {
      await prisma.product.create({ data: prod });
    }
  }
  console.log('示例菜品创建成功');

  // 创建示例桌台
  for (let i = 1; i <= 10; i++) {
    const tableNo = `A${String(i).padStart(2, '0')}`;
    const existing = await prisma.diningTable.findUnique({ where: { tableNo } });
    if (!existing) {
      await prisma.diningTable.create({
        data: { tableNo, seats: i <= 5 ? 4 : 8, area: i <= 5 ? '大厅' : '包间' }
      });
    }
  }
  console.log('示例桌台创建成功 (A01-A10)');

  // 默认设置
  const defaultSettings = [
    { key: 'restaurant_name', value: '美味餐厅' },
    { key: 'restaurant_logo', value: '' },
    { key: 'announcement', value: '欢迎光临，祝您用餐愉快！' }
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }
  console.log('默认设置创建成功');

  console.log('数据库初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
