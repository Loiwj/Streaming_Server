const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    
    let uploadPath;
    if (isVideo) {
      uploadPath = path.join(__dirname, '../uploads/videos');
    } else if (isImage) {
      uploadPath = path.join(__dirname, '../uploads/images');
    } else {
      uploadPath = path.join(__dirname, '../uploads');
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    cb(null, baseName + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter to allow only videos and images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|wmv|flv|webm|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép tải lên file video (mp4, avi, mov, wmv, flv, webm, mkv) và hình ảnh (jpeg, jpg, png, gif)!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Path to MediaMTX config file
const MEDIAMTX_CONFIG_PATH = path.join(__dirname, '../media-server/mediamtx.yml');

// Helper function to read MediaMTX config
async function readMediaMTXConfig() {
  try {
    const content = await fs.readFile(MEDIAMTX_CONFIG_PATH, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error('Error reading MediaMTX config:', error);
    throw error;
  }
}

// Helper function to write MediaMTX config
async function writeMediaMTXConfig(config) {
  try {
    const yamlContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1
    });
    await fs.writeFile(MEDIAMTX_CONFIG_PATH, yamlContent, 'utf8');
    console.log('MediaMTX config updated successfully');
  } catch (error) {
    console.error('Error writing MediaMTX config:', error);
    throw error;
  }
}

// Helper function to generate unique path name
function generatePathName(cameraName) {
  return cameraName.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20) || 'camera';
}

// API: Add RTSP camera to MediaMTX
app.post('/api/cameras/rtsp', async (req, res) => {
  try {
    console.log('📥 Received RTSP camera request:', req.body);
    
    const { name, rtspUrl } = req.body;
    
    if (!name || !rtspUrl) {
      const error = 'Name and RTSP URL are required';
      console.error('❌ Validation error:', error);
      return res.status(400).json({ error });
    }

    // Validate RTSP URL format
    if (!rtspUrl.startsWith('rtsp://')) {
      const error = 'URL must start with rtsp://';
      console.error('❌ URL validation error:', error);
      return res.status(400).json({ error });
    }

    console.log('📖 Reading MediaMTX config...');
    // Read current config
    const config = await readMediaMTXConfig();
    
    // Ensure paths object exists
    if (!config.paths) {
      config.paths = {};
    }

    // Generate unique path name
    const pathName = generatePathName(name);
    let finalPathName = pathName;
    let counter = 1;
    
    // Make sure path name is unique
    while (config.paths[finalPathName]) {
      finalPathName = `${pathName}${counter}`;
      counter++;
    }

    console.log(`📝 Adding path '${finalPathName}' with source '${rtspUrl}'`);

    // Add new RTSP path
    config.paths[finalPathName] = {
      source: rtspUrl,
      sourceOnDemand: false,
      rtspTransport: 'tcp'
    };

    // Write updated config
    await writeMediaMTXConfig(config);

    // Return the path name for WHEP URL
    const whepUrl = `http://localhost:8889/${finalPathName}/whep`;
    
    const response = { 
      success: true, 
      pathName: finalPathName,
      whepUrl: whepUrl,
      message: 'RTSP camera added to MediaMTX successfully'
    };
    
    console.log('✅ RTSP camera added successfully:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error adding RTSP camera:', error);
    res.status(500).json({ 
      error: 'Failed to add RTSP camera to MediaMTX',
      details: error.message 
    });
  }
});

// API: Remove camera from MediaMTX
app.delete('/api/cameras/:pathName', async (req, res) => {
  try {
    const { pathName } = req.params;
    
    if (!pathName) {
      return res.status(400).json({ error: 'Path name is required' });
    }

    // Read current config
    const config = await readMediaMTXConfig();
    
    // Check if path exists
    if (!config.paths || !config.paths[pathName]) {
      return res.status(404).json({ error: 'Camera path not found in MediaMTX config' });
    }

    // Remove the path
    delete config.paths[pathName];

    // Write updated config
    await writeMediaMTXConfig(config);

    res.json({ 
      success: true, 
      message: `Camera path '${pathName}' removed from MediaMTX successfully`
    });

  } catch (error) {
    console.error('Error removing camera:', error);
    res.status(500).json({ error: 'Failed to remove camera from MediaMTX' });
  }
});

// API: Get all MediaMTX paths
app.get('/api/cameras/paths', async (req, res) => {
  try {
    const config = await readMediaMTXConfig();
    const paths = config.paths || {};
    
    const cameras = Object.keys(paths).map(pathName => ({
      pathName,
      source: paths[pathName].source,
      whepUrl: `http://localhost:8889/${pathName}/whep`
    }));

    res.json({ cameras });

  } catch (error) {
    console.error('Error getting camera paths:', error);
    res.status(500).json({ error: 'Failed to get camera paths' });
  }
});

// API: Restart MediaMTX (optional)
app.post('/api/mediamtx/restart', async (req, res) => {
  try {
    // This would require process management (pm2, systemd, etc.)
    // For now, just return success
    res.json({ 
      success: true, 
      message: 'MediaMTX restart signal sent (please restart manually if needed)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restart MediaMTX' });
  }
});

// File upload endpoints

// Upload single file (video or image)
app.post('/api/upload/single', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }

    const fileInfo = {
      success: true,
      message: 'File đã được tải lên thành công',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.mimetype.startsWith('video/') ? 'videos' : 'images'}/${req.file.filename}`
      }
    };

    console.log('✅ File uploaded successfully:', fileInfo);
    res.json(fileInfo);

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({ 
      error: 'Lỗi khi tải file lên', 
      details: error.message 
    });
  }
});

// Upload multiple files
app.post('/api/upload/multiple', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }

    const filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.mimetype.startsWith('video/') ? 'videos' : 'images'}/${file.filename}`
    }));

    const response = {
      success: true,
      message: `${req.files.length} file(s) đã được tải lên thành công`,
      files: filesInfo
    };

    console.log('✅ Multiple files uploaded successfully:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error uploading multiple files:', error);
    res.status(500).json({ 
      error: 'Lỗi khi tải nhiều file lên', 
      details: error.message 
    });
  }
});

// Get list of uploaded files
app.get('/api/files/:type?', async (req, res) => {
  try {
    const { type } = req.params; // 'videos', 'images', or undefined for all
    
    let directories = [];
    if (type === 'videos') {
      directories = [path.join(__dirname, '../uploads/videos')];
    } else if (type === 'images') {
      directories = [path.join(__dirname, '../uploads/images')];
    } else {
      directories = [
        path.join(__dirname, '../uploads/videos'),
        path.join(__dirname, '../uploads/images')
      ];
    }

    const allFiles = [];
    
    for (const dir of directories) {
      try {
        const files = await fs.readdir(dir);
        const fileType = dir.includes('videos') ? 'video' : 'image';
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          
          allFiles.push({
            name: file,
            type: fileType,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `/uploads/${fileType}s/${file}`
          });
        }
      } catch (dirError) {
        console.warn(`Directory ${dir} not accessible:`, dirError.message);
      }
    }

    // Sort by creation date (newest first)
    allFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({
      success: true,
      files: allFiles,
      count: allFiles.length
    });

  } catch (error) {
    console.error('❌ Error listing files:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách file', 
      details: error.message 
    });
  }
});

// Delete uploaded file
app.delete('/api/files/:type/:filename', async (req, res) => {
  try {
    const { type, filename } = req.params;
    
    if (!['videos', 'images'].includes(type)) {
      return res.status(400).json({ error: 'Type phải là "videos" hoặc "images"' });
    }

    const filePath = path.join(__dirname, `../uploads/${type}/${filename}`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'File không tồn tại' });
    }

    // Delete the file
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: `File ${filename} đã được xóa thành công`
    });

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ 
      error: 'Lỗi khi xóa file', 
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Camera management server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Camera management server running on http://localhost:${PORT}`);
  console.log(`📹 MediaMTX config path: ${MEDIAMTX_CONFIG_PATH}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down camera management server...');
  process.exit(0);
});
