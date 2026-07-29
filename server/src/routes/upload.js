const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置 multer
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// 单图上传
router.post('/image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.json({ code: 400, message: '请选择文件', data: null });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ code: 200, message: '上传成功', data: { url } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

// 多图上传
router.post('/images', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ code: 400, message: '请选择文件', data: null });
    }
    const urls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({ code: 200, message: '上传成功', data: { urls } });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message, data: null });
  }
});

module.exports = router;
