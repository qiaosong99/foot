const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'foot-ordering-secret-key-2024';

// 验证管理员登录（局域网模式：无token也放行，有token则解析用户信息）
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 局域网模式：无token也放行，设置默认用户
    req.user = { id: 1, username: 'admin', role: 'admin' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // token过期也放行（局域网模式）
    req.user = { id: 1, username: 'admin', role: 'admin' };
    next();
  }
}

module.exports = { authMiddleware, JWT_SECRET };
