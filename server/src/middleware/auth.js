const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'foot-ordering-secret-key-2024';

// 验证管理员登录
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      message: '未登录或登录已过期',
      data: null
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      code: 401,
      message: '登录已过期，请重新登录',
      data: null
    });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
