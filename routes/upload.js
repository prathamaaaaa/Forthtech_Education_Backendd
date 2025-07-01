const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Setup storage with original name & auto-increment
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uploadDir = 'uploads/';
    const originalName = path.basename(file.originalname, path.extname(file.originalname));
    const ext = path.extname(file.originalname);

    let filename = `${originalName}${ext}`;
    let counter = 1;

    while (fs.existsSync(path.join(uploadDir, filename))) {
      filename = `${originalName}(${counter})${ext}`;
      counter++;
    }

    cb(null, filename);
  }
});

const upload = multer({ storage });

// POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;
  const fileType = req.file.mimetype;

  res.json({ fileUrl, fileType });
});

module.exports = router;
