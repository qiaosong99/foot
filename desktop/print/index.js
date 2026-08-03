const net = require('net');
const iconv = require('iconv-lite');

// ESC/POS 指令常量
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

const CMD = {
  INIT: ESC + '@',           // 初始化打印机
  BOLD_ON: ESC + 'E\x01',   // 加粗开
  BOLD_OFF: ESC + 'E\x00',  // 加粗关
  ALIGN_LT: ESC + 'a\x00',  // 左对齐
  ALIGN_CT: ESC + 'a\x01',  // 居中
  ALIGN_RT: ESC + 'a\x02',  // 右对齐
  SIZE_NORMAL: GS + '!\x00', // 正常大小
  SIZE_DOUBLE: GS + '!\x11', // 双倍大小
  CUT: GS + 'V\x00',        // 切纸
  LINE: '--------------------------------\n'
};

// 编码文本为 GBK
function encodeText(text) {
  return iconv.encode(text, 'GBK');
}

// 格式化菜品行（名称、数量、小计对齐）
function formatItemLine(name, qty, subtotal, paperWidth) {
  const maxNameLen = paperWidth === 80 ? 20 : 14;
  let nameStr = name;
  // 中文字符占2个宽度
  let displayLen = 0;
  for (let i = 0; i < nameStr.length; i++) {
    displayLen += nameStr.charCodeAt(i) > 127 ? 2 : 1;
  }
  if (displayLen > maxNameLen) {
    // 截断
    let len = 0;
    let cutIdx = 0;
    for (let i = 0; i < nameStr.length; i++) {
      len += nameStr.charCodeAt(i) > 127 ? 2 : 1;
      if (len > maxNameLen - 2) { cutIdx = i; break; }
    }
    nameStr = nameStr.substring(0, cutIdx) + '..';
  }
  const qtyStr = 'x' + qty;
  const priceStr = '¥' + subtotal.toFixed(2);
  return `${nameStr} ${qtyStr} ${priceStr}\n`;
}

// 生成小票内容 Buffer
function generateReceiptBuffer(data) {
  const { template, order } = data;
  let content = '';

  // 初始化
  content += CMD.INIT;
  content += CMD.ALIGN_CT;

  // 店名（大号加粗）
  if (template.storeName) {
    content += CMD.SIZE_DOUBLE + CMD.BOLD_ON;
    content += template.storeName + '\n';
    content += CMD.SIZE_NORMAL + CMD.BOLD_OFF;
  }

  // 电话和地址
  if (template.storePhone) {
    content += '电话: ' + template.storePhone + '\n';
  }
  if (template.storeAddr) {
    content += template.storeAddr + '\n';
  }

  // 头部自定义文字
  if (template.headerText) {
    content += template.headerText + '\n';
  }

  content += CMD.LINE;
  content += CMD.ALIGN_LT;

  // 订单信息
  const orderTypeText = { dine_in: '堂食', takeout: '外卖', waiter: '服务员点单' };
  content += `单号: ${order.orderNo}\n`;
  content += `桌号: ${order.tableNo}  类型: ${orderTypeText[order.orderType] || '堂食'}\n`;
  content += `时间: ${new Date(order.createdAt).toLocaleString()}\n`;
  content += CMD.LINE;

  // 菜品明细标题
  content += CMD.BOLD_ON;
  content += '菜名        数量  小计\n';
  content += CMD.BOLD_OFF;

  // 菜品列表
  for (const item of order.items) {
    const itemName = item.specInfo ? `${item.name}(${item.specInfo})` : item.name;
    content += formatItemLine(itemName, item.quantity, item.subtotal || item.price * item.quantity, template.paperWidth);
  }

  content += CMD.LINE;

  // 合计
  content += CMD.BOLD_ON + CMD.ALIGN_RT;
  content += `共${order.itemCount}件  合计: ¥${order.totalPrice.toFixed(2)}\n`;
  content += CMD.BOLD_OFF;

  content += CMD.LINE;

  // 底部自定义文字
  if (template.footerText) {
    content += CMD.ALIGN_CT;
    content += template.footerText + '\n';
  }

  // 空行 + 切纸
  content += '\n\n\n';
  content += CMD.CUT;

  return encodeText(content);
}

// 通过网络发送打印数据
function sendToPrinter(ip, port, buffer) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 10000;

    socket.setTimeout(timeout);

    socket.connect(port, ip, () => {
      socket.write(buffer, () => {
        socket.destroy();
        resolve();
      });
    });

    socket.on('error', (err) => {
      reject(new Error(`打印机连接失败: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('打印机连接超时'));
    });
  });
}

// 测试打印机连接（仅TCP探测，不发送打印数据）
function testConnection(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.connect(port || 9100, ip, () => {
      socket.destroy();
      resolve({ success: true, message: `连接成功: ${ip}:${port || 9100} 可正常通信` });
    });

    socket.on('error', (err) => {
      socket.destroy();
      let msg = '';
      if (err.code === 'ECONNREFUSED') {
        msg = '连接被拒绝: 打印机可能未开机，或未开启9100端口(请在打印机设置中开启RAW/网络打印)';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
        msg = '连接超时: IP不通，请确认打印机IP填写正确且与电脑在同一局域网';
      } else if (err.code === 'ENOTFOUND') {
        msg = 'IP地址格式错误，请填写如 192.168.1.100 的地址';
      } else {
        msg = `连接失败: ${err.message}`;
      }
      resolve({ success: false, message: msg });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, message: '连接超时: 请检查打印机IP是否正确、是否在同一局域网' });
    });
  });
}

// 打印小票
async function printReceipt(data) {
  const { printer, template, order } = data;
  if (!printer || !printer.ip) {
    throw new Error('未配置打印机');
  }
  const buffer = generateReceiptBuffer({ template, order });
  await sendToPrinter(printer.ip, printer.port || 9100, buffer);
  return true;
}

// 测试打印
async function testPrint(data) {
  const { ip, port } = data;
  let content = '';
  content += CMD.INIT;
  content += CMD.ALIGN_CT;
  content += CMD.SIZE_DOUBLE + CMD.BOLD_ON;
  content += '测试打印\n';
  content += CMD.SIZE_NORMAL + CMD.BOLD_OFF;
  content += CMD.LINE;
  content += '打印机连接正常\n';
  content += `时间: ${new Date().toLocaleString()}\n`;
  content += CMD.LINE;
  content += '\n\n\n';
  content += CMD.CUT;

  const buffer = encodeText(content);
  await sendToPrinter(ip, port || 9100, buffer);
  return true;
}

module.exports = { printReceipt, testPrint, testConnection, generateReceiptBuffer };
