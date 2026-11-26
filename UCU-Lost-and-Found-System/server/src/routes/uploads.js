const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg','image/png','image/webp'].includes(file.mimetype)) {
      return cb(new Error('Upload a JPG, PNG or WEBP image.'));
    }
    cb(null, true);
  }
});

router.post('/', authenticate, (req, res, next) => {
  upload.single('photo')(req, res, err => {
    if (err) return res.status(400).json({ message: err.message || 'Image upload failed.' });
    if (!req.file) return res.status(400).json({ message: 'Choose an image to upload.' });
    res.status(201).json({ photoPath: `/uploads/${req.file.filename}` });
  });
});

module.exports = router;
