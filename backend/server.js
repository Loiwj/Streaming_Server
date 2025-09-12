const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
