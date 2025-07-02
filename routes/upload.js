const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const router = express.Router();

const mongoURI = process.env.MONGO_URI || 'your-fallback-mongodb-uri-here';

const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;
conn.once('open', async () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('✅ GridFS ready');

  // Ensure indexes
  await conn.db.collection('uploads.files').createIndex({ filename: 1 });
  await conn.db.collection('uploads.chunks').createIndex(
    { files_id: 1, n: 1 },
    { unique: true }
  );

  console.log('✅ GridFS collections initialized');
});

// ✅ Setup multer for memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadStream = gfs.openUploadStream(req.file.originalname, {
    contentType: req.file.mimetype,
  });

  uploadStream.end(req.file.buffer);

  uploadStream.on('finish', () => {
    const fileUrl = `${process.env.BASE_URL || 'https://forthtecheducationbackendd-production.up.railway.app/'}/api/upload/${uploadStream.id}`;
    res.json({
      fileUrl,
      fileType: req.file.mimetype,
    });
  });

  uploadStream.on('error', (err) => {
    console.error('GridFS upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  });
});


// ✅ GET /api/upload/:id for downloading
router.get('/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gfs.openDownloadStream(fileId);

    downloadStream.on('data', (chunk) => res.write(chunk));
    downloadStream.on('error', () =>
      res.status(404).json({ error: 'File not found' })
    );
    downloadStream.on('end', () => res.end());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;











// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const router = express.Router();

// // Setup storage with original name & auto-increment
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     const uploadDir = 'uploads/';
//     const originalName = path.basename(file.originalname, path.extname(file.originalname));
//     const ext = path.extname(file.originalname);

//     let filename = `${originalName}${ext}`;
//     let counter = 1;

//     while (fs.existsSync(path.join(uploadDir, filename))) {
//       filename = `${originalName}(${counter})${ext}`;
//       counter++;
//     }

//     cb(null, filename);
//   }
// });

// const upload = multer({ storage });

// // POST /api/upload
// router.post('/', upload.single('file'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const fileUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;
//   const fileType = req.file.mimetype;

//   res.json({ fileUrl, fileType });
// });

// module.exports = router;
