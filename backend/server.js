const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const cors = require('cors');
const multer = require('multer');
const FaceRecognitionService = require('../face-recognition/FaceRecognitionService');

const app = express();
const PORT = 3001;

// Initialize Face Recognition Service
const faceRecognitionService = new FaceRecognitionService();
let activeCameraMonitors = new Map(); // Track active camera monitoring

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

// Configure multer for file uploads (disk storage)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter
});

// Configure multer for face recognition (memory storage)
const faceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for face images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif) are allowed for face recognition!'));
    }
  }
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

// Face Recognition API Endpoints

// Initialize face recognition service
app.post('/api/face-recognition/initialize', async (req, res) => {
  try {
    await faceRecognitionService.initialize();
    res.json({ success: true, message: 'Face Recognition Service initialized' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize Face Recognition Service', details: error.message });
  }
});

// Start face recognition monitoring for a camera
app.post('/api/face-recognition/start/:cameraName', async (req, res) => {
  try {
    const { cameraName } = req.params;
    const { intervalMs = 5000 } = req.body;
    
    // Stop existing monitoring if any
    if (activeCameraMonitors.has(cameraName)) {
      faceRecognitionService.stopCameraMonitoring(activeCameraMonitors.get(cameraName));
    }
    
    // Build stream URL (remove /whep from the end)
    const streamUrl = `http://localhost:8889/${cameraName}/`;
    
    // Start monitoring
    const monitor = await faceRecognitionService.startCameraMonitoring(cameraName, streamUrl, intervalMs);
    activeCameraMonitors.set(cameraName, monitor);
    
    res.json({ 
      success: true, 
      message: `Face recognition monitoring started for ${cameraName}`,
      streamUrl: streamUrl,
      intervalMs: intervalMs
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to start face recognition monitoring', details: error.message });
  }
});

// Stop face recognition monitoring for a camera
app.post('/api/face-recognition/stop/:cameraName', (req, res) => {
  try {
    const { cameraName } = req.params;
    
    if (activeCameraMonitors.has(cameraName)) {
      faceRecognitionService.stopCameraMonitoring(activeCameraMonitors.get(cameraName));
      activeCameraMonitors.delete(cameraName);
      
      res.json({ success: true, message: `Face recognition monitoring stopped for ${cameraName}` });
    } else {
      res.status(404).json({ error: `No active monitoring found for ${cameraName}` });
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop face recognition monitoring', details: error.message });
  }
});

// Add known face
app.post('/api/face-recognition/faces', faceUpload.single('image'), async (req, res) => {
  try {
    const { name, department, position, email, phone } = req.body;
    
    console.log('📥 Received add known face request:', { name, department, position, hasFile: !!req.file });
    
    if (!name || !req.file) {
      return res.status(400).json({ error: 'Name and image file are required' });
    }
    
    console.log('📁 File info:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    });
    
    // Create user data object
    const userData = {
      name,
      department: department || '',
      position: position || '',
      email: email || '',
      phone: phone || ''
    };
    
    const result = await faceRecognitionService.addKnownFace(userData, req.file.buffer);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error in add known face endpoint:', error);
    res.status(500).json({ error: 'Failed to add known face', details: error.message });
  }
});

// Remove known face
app.delete('/api/face-recognition/faces/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const result = await faceRecognitionService.removeKnownFace(name);
    res.json(result);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove known face', details: error.message });
  }
});

// Get all known faces
app.get('/api/face-recognition/faces', (req, res) => {
  try {
    const faces = faceRecognitionService.getKnownFaces();
    res.json({ faces });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get known faces', details: error.message });
  }
});

// Get user details by ID
app.get('/api/face-recognition/faces/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const user = faceRecognitionService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user details', details: error.message });
  }
});

// Update user information
app.put('/api/face-recognition/faces/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, department, position, email, phone } = req.body;
    
    const updateData = {
      name,
      department,
      position,
      email,
      phone
    };
    
    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const result = await faceRecognitionService.updateKnownFace(userId, updateData);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  }
});

// Get face recognition logs
app.get('/api/face-recognition/logs/:cameraName/:date?', async (req, res) => {
  try {
    const { cameraName, date } = req.params;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const logs = await faceRecognitionService.getLogs(cameraName, targetDate);
    res.json({ logs, camera: cameraName, date: targetDate });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get face recognition logs', details: error.message });
  }
});

// Get snapshots list
app.get('/api/face-recognition/snapshots', async (req, res) => {
  try {
    const snapshotsDir = path.join(__dirname, '../face-recognition/snapshots');
    const files = await fs.readdir(snapshotsDir);
    
    const snapshots = files
      .filter(file => file.endsWith('.jpg'))
      .map(file => {
        const parts = file.replace('.jpg', '').split('_');
        return {
          filename: file,
          camera: parts[0],
          timestamp: parts.slice(1, -2).join('_'),
          identity: parts[parts.length - 2],
          faceIndex: parts[parts.length - 1],
          url: `/api/face-recognition/snapshots/${file}`
        };
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ snapshots });
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to get snapshots', details: error.message });
  }
});

// Serve snapshot images
app.get('/api/face-recognition/snapshots/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../face-recognition/snapshots', filename);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve snapshot', details: error.message });
  }
});

// Get active monitoring status
app.get('/api/face-recognition/status', (req, res) => {
  try {
    const activeMonitoring = Array.from(activeCameraMonitors.keys());
    res.json({ 
      initialized: faceRecognitionService.isInitialized,
      isInitialized: faceRecognitionService.isInitialized,
      activeMonitoring: activeMonitoring,
      knownFaces: faceRecognitionService.getKnownFaces().length,
      knownFacesCount: faceRecognitionService.getKnownFaces().length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status', details: error.message });
  }
});

// Save face recognition settings
app.post('/api/face-recognition/settings', async (req, res) => {
  try {
    const { recognitionThreshold, detectionConfidence } = req.body;
    
    if (recognitionThreshold !== undefined) {
      faceRecognitionService.setRecognitionThreshold(recognitionThreshold);
    }
    
    if (detectionConfidence !== undefined) {
      faceRecognitionService.setDetectionConfidence(detectionConfidence);
    }
    
    res.json({ 
      success: true, 
      message: 'Settings saved successfully',
      settings: {
        recognitionThreshold: faceRecognitionService.recognitionThreshold,
        detectionConfidence: faceRecognitionService.detectionConfidence
      }
    });
  } catch (error) {
    console.error('❌ Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings', details: error.message });
  }
});

// Settings API endpoints
app.get('/api/settings', (req, res) => {
  try {
    // Return default settings for now
    const defaultSettings = {
      recording: {
        mode: 'manual',
        quality: '720p',
        frameRate: 25,
        maxRecordingTime: 60,
        preMotionBuffer: 5,
        postMotionBuffer: 10
      },
      motion: {
        sensitivity: 50,
        threshold: 30,
        zones: [],
        ignoreSmallMovements: true,
        ignoreShadows: true,
        ignoreWeather: false
      },
      storage: {
        path: './recordings',
        maxSize: 100,
        autoDeleteDays: 30,
        autoCleanup: true
      },
      system: {
        cpuUsage: 80,
        memoryUsage: 2048,
        streamQuality: 'medium',
        maxConnections: 10,
        enableAuth: false,
        enableSSL: false
      }
    };
    
    res.json(defaultSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings', details: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    console.log('💾 Settings saved:', JSON.stringify(settings, null, 2));
    
    // In a real implementation, you would save these to a file or database
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings', details: error.message });
  }
});

// Motion detection API endpoints
app.post('/api/motion-detection/start', (req, res) => {
  try {
    const { sensitivity, threshold, zones, recordingSettings } = req.body;
    
    console.log('🎯 Starting motion detection with settings:', {
      sensitivity,
      threshold,
      zones: zones.length,
      recordingMode: recordingSettings.mode
    });
    
    // In a real implementation, you would start motion detection here
    // For now, just simulate success
    res.json({ 
      success: true, 
      message: 'Motion detection started',
      settings: { sensitivity, threshold, zones }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start motion detection', details: error.message });
  }
});

app.post('/api/motion-detection/stop', (req, res) => {
  try {
    console.log('⏹️ Stopping motion detection');
    
    // In a real implementation, you would stop motion detection here
    res.json({ success: true, message: 'Motion detection stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop motion detection', details: error.message });
  }
});

// Storage stats API
app.get('/api/storage/stats', (req, res) => {
  try {
    // Simulate storage stats
    const stats = {
      used: 25.6,
      free: 74.4,
      recordingCount: 156
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get storage stats', details: error.message });
  }
});

// System status API
app.get('/api/status', (req, res) => {
  try {
    res.json({ 
      online: true,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get system status', details: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Camera management server is running' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Camera management server running on http://localhost:${PORT}`);
  console.log(`📹 MediaMTX config path: ${MEDIAMTX_CONFIG_PATH}`);
  
  // Initialize Face Recognition Service on startup
  try {
    await faceRecognitionService.initialize();
    console.log('🤖 Face Recognition Service initialized successfully');
  } catch (error) {
    console.warn('⚠️  Face Recognition Service initialization failed:', error.message);
    console.warn('   Please ensure ONNX models are placed in face-recognition/models/ directory');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down camera management server...');
  process.exit(0);
});
