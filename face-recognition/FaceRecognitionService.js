const ort = require('onnxruntime-node');
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const Jimp = require('jimp');
const fetch = require('node-fetch');

class FaceRecognitionService {
  constructor() {
    this.scrfdSession = null;
    this.arcfaceSession = null;
    this.knownFaces = new Map(); // Store known face embeddings
    this.isInitialized = false;
    this.processingFrames = new Map(); // Track processing frames by camera
    
    // Face detection parameters
    this.confidenceThreshold = 0.5;
    this.nmsThreshold = 0.4;
    
    // Face recognition parameters
    this.recognitionThreshold = 0.7; // Cosine similarity threshold (higher = more strict)
    this.detectionConfidence = 0.5; // Minimum confidence for face detection
    
    // Logging
    this.logsDir = path.join(__dirname, '../logs');
    this.snapshotsDir = path.join(__dirname, '../snapshots');
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.logsDir, { recursive: true });
      await fs.mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async initialize() {
    try {
      console.log('🚀 Initializing Face Recognition Service...');
      
      // Initialize ONNX Runtime sessions
      await this.loadModels();
      
      // Load known faces database
      await this.loadKnownFaces();
      
      this.isInitialized = true;
      console.log('✅ Face Recognition Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Face Recognition Service:', error);
      throw error;
    }
  }

  async loadModels() {
    const modelsDir = path.join(__dirname, 'models');
    
    // Load face detection model (try different available models)
    const detectionModels = ['det_10g.onnx', '2d106det.onnx', 'scrfd_2.5g_bnkps.onnx'];
    for (const modelName of detectionModels) {
      const modelPath = path.join(modelsDir, modelName);
      if (await this.fileExists(modelPath)) {
        try {
          this.scrfdSession = await ort.InferenceSession.create(modelPath);
          console.log(`✅ Face detection model loaded: ${modelName}`);
          break;
        } catch (error) {
          console.warn(`⚠️  Failed to load ${modelName}:`, error.message);
        }
      }
    }
    
    if (!this.scrfdSession) {
      console.warn('⚠️  No face detection model found. Available models:', detectionModels.join(', '));
    }
    
    // Load face recognition model (try different available models)
    const recognitionModels = ['w600k_r50.onnx', '1k3d68.onnx', 'arcface_r50_v1.onnx'];
    for (const modelName of recognitionModels) {
      const modelPath = path.join(modelsDir, modelName);
      if (await this.fileExists(modelPath)) {
        try {
          this.arcfaceSession = await ort.InferenceSession.create(modelPath);
          console.log(`✅ Face recognition model loaded: ${modelName}`);
          break;
        } catch (error) {
          console.warn(`⚠️  Failed to load ${modelName}:`, error.message);
        }
      }
    }
    
    if (!this.arcfaceSession) {
      console.warn('⚠️  No face recognition model found. Available models:', recognitionModels.join(', '));
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async loadKnownFaces() {
    try {
      const dbPath = path.join(__dirname, 'known_faces.json');
      if (await this.fileExists(dbPath)) {
        const data = await fs.readFile(dbPath, 'utf8');
        const faces = JSON.parse(data);
        
        for (const [id, faceData] of Object.entries(faces)) {
          if (typeof faceData === 'object' && faceData.embedding) {
            // New format with detailed info
            this.knownFaces.set(id, {
              ...faceData,
              embedding: new Float32Array(faceData.embedding)
            });
          } else {
            // Legacy format (just embedding array)
            this.knownFaces.set(id, new Float32Array(faceData));
          }
        }
        
        console.log(`📚 Loaded ${this.knownFaces.size} known faces`);
      }
    } catch (error) {
      console.error('Error loading known faces:', error);
    }
  }

  async saveKnownFaces() {
    try {
      const dbPath = path.join(__dirname, 'known_faces.json');
      const faces = {};
      
      for (const [id, faceData] of this.knownFaces.entries()) {
        if (typeof faceData === 'object' && faceData.embedding) {
          // New format with detailed info
          faces[id] = {
            ...faceData,
            embedding: Array.from(faceData.embedding)
          };
        } else {
          // Legacy format (just embedding)
          faces[id] = Array.from(faceData);
        }
      }
      
      await fs.writeFile(dbPath, JSON.stringify(faces, null, 2));
      console.log('💾 Known faces database saved');
    } catch (error) {
      console.error('Error saving known faces:', error);
    }
  }

  async processFrameFromUrl(cameraName, streamUrl) {
    if (!this.isInitialized) {
      console.warn('Face Recognition Service not initialized');
      return;
    }

    // Prevent multiple processing of same camera
    if (this.processingFrames.has(cameraName)) {
      return;
    }

    this.processingFrames.set(cameraName, true);

    try {
      console.log(`🔍 Processing frame from ${cameraName}: ${streamUrl}`);
      
      // For demo purposes, simulate face detection
      const simulatedDetection = Math.random() > 0.7; // 30% chance of "detecting" a face
      
      if (simulatedDetection) {
        console.log(`👥 Simulated face detection in ${cameraName}`);
        
        // Create a dummy face detection
        const dummyFace = {
          x: 100 + Math.random() * 200,
          y: 80 + Math.random() * 150,
          width: 120 + Math.random() * 80,
          height: 150 + Math.random() * 100,
          confidence: 0.7 + Math.random() * 0.3
        };
        
        // Simulate recognition with proper threshold checking
        const knownFaceNames = Array.from(this.knownFaces.keys());
        let identity = { name: 'Unknown', confidence: 0.0 };
        
        if (knownFaceNames.length > 0) {
          // Simulate face recognition with threshold
          const randomConfidence = Math.random();
          
          // Only recognize if confidence is above recognition threshold
          if (randomConfidence > this.recognitionThreshold) {
            const faceIds = Array.from(this.knownFaces.keys());
            const randomFaceId = faceIds[Math.floor(Math.random() * faceIds.length)];
            const faceData = this.knownFaces.get(randomFaceId);
            
            // Get the name from face data
            const faceName = typeof faceData === 'object' && faceData.name ? faceData.name : randomFaceId;
            
            identity = { 
              name: faceName, 
              confidence: randomConfidence,
              userId: randomFaceId
            };
            console.log(`🎯 Person recognized: ${faceName} (confidence: ${(randomConfidence * 100).toFixed(1)}%)`);
          } else {
            console.log(`👤 Person detected but confidence ${(randomConfidence * 100).toFixed(1)}% below threshold ${(this.recognitionThreshold * 100).toFixed(1)}%`);
          }
        }
        
        // Log detection
        await this.logFaceDetection(cameraName, identity, dummyFace);
        
        // Take snapshot if person is recognized (not Unknown)
        if (identity.name !== 'Unknown') {
          console.log(`📸 Taking snapshot for recognized person: ${identity.name}`);
          await this.saveSimulatedSnapshot(cameraName, dummyFace, identity, 0);
        }
        
        console.log(`📝 Logged detection: ${identity.name} in ${cameraName}`);
      }

    } catch (error) {
      console.error(`Error processing frame from ${cameraName}:`, error);
    } finally {
      this.processingFrames.delete(cameraName);
    }
  }

  async captureFrameFromStream(streamUrl) {
    try {
      // Capture frame from HTTP stream using fetch
      const response = await fetch(streamUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'FaceRecognition/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const buffer = await response.buffer();
      
      // Load image using Jimp
      const image = await Jimp.read(buffer);
      
      return {
        data: image.bitmap.data,
        width: image.bitmap.width,
        height: image.bitmap.height,
        channels: 4 // RGBA
      };
      
    } catch (error) {
      console.error('Error capturing frame:', error);
      return null;
    }
  }

  async detectFaces(frame) {
    if (!this.scrfdSession) {
      return [];
    }

    try {
      // Prepare input for SCRFD model
      const inputTensor = await this.prepareInputForSCRFD(frame);
      
      // Run inference
      const results = await this.scrfdSession.run({ input: inputTensor });
      
      // Process results to get face bounding boxes
      const faces = this.processSCRFDOutput(results, frame.sizes);
      
      return faces;
    } catch (error) {
      console.error('Error in face detection:', error);
      return [];
    }
  }

  async prepareInputForSCRFD(frame) {
    // Convert frame to tensor format expected by SCRFD
    // SCRFD expects input shape: [1, 3, 640, 640] (NCHW format)
    
    // Resize image to 640x640 using Jimp
    const image = new Jimp(frame.width, frame.height, Buffer.from(frame.data));
    const resized = image.resize(640, 640);
    
    const rgbData = new Float32Array(3 * 640 * 640);
    
    // Convert RGBA to RGB and normalize to [0,1], then transpose to CHW format
    for (let y = 0; y < 640; y++) {
      for (let x = 0; x < 640; x++) {
        const idx = (y * 640 + x) * 4; // RGBA format
        const pixelIdx = y * 640 + x;
        
        // Normalize to [0,1] and convert RGBA to RGB
        rgbData[pixelIdx] = resized.bitmap.data[idx] / 255.0;         // R channel
        rgbData[pixelIdx + 640 * 640] = resized.bitmap.data[idx + 1] / 255.0;  // G channel  
        rgbData[pixelIdx + 2 * 640 * 640] = resized.bitmap.data[idx + 2] / 255.0; // B channel
      }
    }
    
    return new ort.Tensor('float32', rgbData, [1, 3, 640, 640]);
  }

  processSCRFDOutput(results, originalSize) {
    // Process SCRFD output to extract face bounding boxes
    // This is a simplified version - actual implementation depends on SCRFD output format
    const faces = [];
    
    try {
      // SCRFD typically outputs detection results with scores and boxes
      const boxes = results.boxes?.data || results.output0?.data;
      const scores = results.scores?.data || results.output1?.data;
      
      if (!boxes || !scores) {
        return faces;
      }
      
      // Apply NMS and confidence filtering
      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > this.confidenceThreshold) {
          const box = {
            x: boxes[i * 4] * originalSize.width / 640,
            y: boxes[i * 4 + 1] * originalSize.height / 640,
            width: (boxes[i * 4 + 2] - boxes[i * 4]) * originalSize.width / 640,
            height: (boxes[i * 4 + 3] - boxes[i * 4 + 1]) * originalSize.height / 640,
            confidence: scores[i]
          };
          faces.push(box);
        }
      }
    } catch (error) {
      console.error('Error processing SCRFD output:', error);
    }
    
    return faces;
  }

  async processFace(cameraName, frame, faceBox, faceIndex) {
    try {
      // Extract face region
      const faceRegion = await this.extractFaceRegion(frame, faceBox);
      if (!faceRegion) {
        return;
      }

      // Get face embedding
      const embedding = await this.getFaceEmbedding(faceRegion);
      if (!embedding) {
        return;
      }

      // Recognize face
      const identity = await this.recognizeFace(embedding);
      
      // Log detection
      await this.logFaceDetection(cameraName, identity, faceBox);
      
      // Save snapshot
      await this.saveSnapshot(cameraName, frame, faceBox, identity, faceIndex);
      
    } catch (error) {
      console.error('Error processing face:', error);
    }
  }

  async extractFaceRegion(frame, faceBox) {
    try {
      const image = new Jimp(frame.width, frame.height, Buffer.from(frame.data));
      
      // Crop face region
      const x = Math.max(0, Math.floor(faceBox.x));
      const y = Math.max(0, Math.floor(faceBox.y));
      const width = Math.min(frame.width - x, Math.floor(faceBox.width));
      const height = Math.min(frame.height - y, Math.floor(faceBox.height));
      
      const cropped = image.crop(x, y, width, height);
      
      return {
        data: cropped.bitmap.data,
        width: cropped.bitmap.width,
        height: cropped.bitmap.height,
        channels: 4
      };
    } catch (error) {
      console.error('Error extracting face region:', error);
      return null;
    }
  }

  async getFaceEmbedding(faceRegion) {
    if (!this.arcfaceSession) {
      return null;
    }

    try {
      // Prepare input for ArcFace model
      const inputTensor = await this.prepareInputForArcFace(faceRegion);
      
      // Run inference
      const results = await this.arcfaceSession.run({ input: inputTensor });
      
      // Get embedding vector
      const embedding = results.output?.data || results.embedding?.data;
      
      return embedding ? new Float32Array(embedding) : null;
    } catch (error) {
      console.error('Error getting face embedding:', error);
      return null;
    }
  }

  async prepareInputForArcFace(faceRegion) {
    // ArcFace expects input shape: [1, 3, 112, 112] (NCHW format)
    
    // Resize face to 112x112 using Jimp
    const image = new Jimp(faceRegion.width, faceRegion.height, Buffer.from(faceRegion.data));
    const resized = image.resize(112, 112);
    
    const rgbData = new Float32Array(3 * 112 * 112);
    
    // Convert RGBA to RGB, normalize to [-1,1], and transpose to CHW format
    for (let y = 0; y < 112; y++) {
      for (let x = 0; x < 112; x++) {
        const idx = (y * 112 + x) * 4; // RGBA format
        const pixelIdx = y * 112 + x;
        
        // Normalize to [-1,1] and convert RGBA to RGB
        rgbData[pixelIdx] = (resized.bitmap.data[idx] / 127.5) - 1.0;         // R channel
        rgbData[pixelIdx + 112 * 112] = (resized.bitmap.data[idx + 1] / 127.5) - 1.0;  // G channel  
        rgbData[pixelIdx + 2 * 112 * 112] = (resized.bitmap.data[idx + 2] / 127.5) - 1.0; // B channel
      }
    }
    
    return new ort.Tensor('float32', rgbData, [1, 3, 112, 112]);
  }

  async recognizeFace(embedding) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [name, knownEmbedding] of this.knownFaces.entries()) {
      const similarity = this.cosineSimilarity(embedding, knownEmbedding);
      
      if (similarity > bestScore && similarity > this.recognitionThreshold) {
        bestScore = similarity;
        bestMatch = { name, confidence: similarity };
      }
    }

    return bestMatch || { name: 'Unknown', confidence: 0 };
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async logFaceDetection(cameraName, identity, faceBox) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      camera: cameraName,
      identity: identity.name,
      confidence: identity.confidence,
      boundingBox: faceBox
    };

    // Write to log file
    const logFile = path.join(this.logsDir, `${cameraName}_${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      let logs = [];
      if (await this.fileExists(logFile)) {
        const content = await fs.readFile(logFile, 'utf8');
        logs = JSON.parse(content);
      }
      
      logs.push(logEntry);
      await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
      
      console.log(`📝 Face detection logged: ${identity.name} in ${cameraName} (confidence: ${identity.confidence.toFixed(2)})`);
    } catch (error) {
      console.error('Error writing log:', error);
    }
  }

  async saveSnapshot(cameraName, frame, faceBox, identity, faceIndex) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${cameraName}_${timestamp}_${identity.name}_${faceIndex}.jpg`;
      const snapshotPath = path.join(this.snapshotsDir, filename);

      // Create image from frame data using Jimp
      const image = new Jimp(frame.width, frame.height, Buffer.from(frame.data));
      
      // Draw bounding box (simple rectangle overlay)
      const boxColor = Jimp.rgbaToInt(0, 255, 0, 255); // Green color
      
      // Draw rectangle border
      for (let i = 0; i < 2; i++) { // 2px thick border
        // Top and bottom lines
        for (let x = faceBox.x; x < faceBox.x + faceBox.width; x++) {
          if (x >= 0 && x < frame.width) {
            if (faceBox.y + i >= 0 && faceBox.y + i < frame.height) {
              image.setPixelColor(boxColor, x, faceBox.y + i);
            }
            if (faceBox.y + faceBox.height - i >= 0 && faceBox.y + faceBox.height - i < frame.height) {
              image.setPixelColor(boxColor, x, faceBox.y + faceBox.height - i);
            }
          }
        }
        
        // Left and right lines
        for (let y = faceBox.y; y < faceBox.y + faceBox.height; y++) {
          if (y >= 0 && y < frame.height) {
            if (faceBox.x + i >= 0 && faceBox.x + i < frame.width) {
              image.setPixelColor(boxColor, faceBox.x + i, y);
            }
            if (faceBox.x + faceBox.width - i >= 0 && faceBox.x + faceBox.width - i < frame.width) {
              image.setPixelColor(boxColor, faceBox.x + faceBox.width - i, y);
            }
          }
        }
      }

      // Save image as JPEG
      await image.writeAsync(snapshotPath);
      
      console.log(`📸 Snapshot saved: ${filename}`);
    } catch (error) {
      console.error('Error saving snapshot:', error);
    }
  }

  // API methods for managing known faces
  async addKnownFace(userData, imageBuffer) {
    try {
      console.log(`🔄 Processing known face for: ${userData.name || userData}`);
      console.log(`📦 Buffer info:`, {
        isBuffer: Buffer.isBuffer(imageBuffer),
        length: imageBuffer?.length,
        type: typeof imageBuffer
      });
      
      if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        throw new Error('Invalid image buffer provided');
      }
      
      if (imageBuffer.length === 0) {
        throw new Error('Empty image buffer provided');
      }
      
      // Convert image buffer to Jimp image
      const image = await Jimp.read(imageBuffer);
      console.log(`📷 Image loaded: ${image.bitmap.width}x${image.bitmap.height}`);
      
      // Handle both old format (just name) and new format (user object)
      let userInfo;
      if (typeof userData === 'string') {
        // Legacy format - just name
        userInfo = {
          id: Date.now().toString(),
          name: userData,
          department: '',
          position: '',
          email: '',
          phone: '',
          createdAt: new Date().toISOString()
        };
      } else {
        // New format - full user object
        userInfo = {
          id: userData.id || Date.now().toString(),
          name: userData.name,
          department: userData.department || '',
          position: userData.position || '',
          email: userData.email || '',
          phone: userData.phone || '',
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // For now, skip face detection and just create a dummy embedding
      console.log('⚠️  Skipping face detection for now, creating dummy embedding');
      
      // Create a dummy embedding (512-dimensional vector)
      const dummyEmbedding = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        dummyEmbedding[i] = Math.random() * 2 - 1; // Random values between -1 and 1
      }
      
      // Store known face with full user info
      const faceData = {
        ...userInfo,
        embedding: dummyEmbedding
      };
      
      this.knownFaces.set(userInfo.id, faceData);
      await this.saveKnownFaces();
      
      console.log(`✅ Added known face: ${userInfo.name} (ID: ${userInfo.id})`);
      return { success: true, message: `Face added for ${userInfo.name}`, userId: userInfo.id };
      
    } catch (error) {
      console.error('❌ Error adding known face:', error);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  async removeKnownFace(name) {
    if (this.knownFaces.has(name)) {
      this.knownFaces.delete(name);
      await this.saveKnownFaces();
      console.log(`🗑️  Removed known face: ${name}`);
      return { success: true, message: `Face removed for ${name}` };
    } else {
      throw new Error(`Face not found: ${name}`);
    }
  }

  getKnownFaces() {
    const facesList = [];
    for (const [id, faceData] of this.knownFaces.entries()) {
      if (typeof faceData === 'object' && faceData.name) {
        // New format with detailed info
        facesList.push({
          id: id,
          name: faceData.name,
          department: faceData.department || '',
          position: faceData.position || '',
          email: faceData.email || '',
          phone: faceData.phone || '',
          createdAt: faceData.createdAt,
          updatedAt: faceData.updatedAt
        });
      } else {
        // Legacy format (just name as key)
        facesList.push({
          id: id,
          name: id,
          department: '',
          position: '',
          email: '',
          phone: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
    return facesList;
  }

  getUserById(userId) {
    const faceData = this.knownFaces.get(userId);
    if (!faceData) {
      return null;
    }

    if (typeof faceData === 'object' && faceData.name) {
      return {
        id: userId,
        name: faceData.name,
        department: faceData.department || '',
        position: faceData.position || '',
        email: faceData.email || '',
        phone: faceData.phone || '',
        createdAt: faceData.createdAt,
        updatedAt: faceData.updatedAt
      };
    } else {
      return {
        id: userId,
        name: userId,
        department: '',
        position: '',
        email: '',
        phone: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  async updateKnownFace(userId, updateData) {
    try {
      const existingFace = this.knownFaces.get(userId);
      if (!existingFace) {
        throw new Error(`User with ID ${userId} not found`);
      }

      let updatedFaceData;
      if (typeof existingFace === 'object' && existingFace.embedding) {
        // New format - update existing data
        updatedFaceData = {
          ...existingFace,
          name: updateData.name || existingFace.name,
          department: updateData.department !== undefined ? updateData.department : existingFace.department,
          position: updateData.position !== undefined ? updateData.position : existingFace.position,
          email: updateData.email !== undefined ? updateData.email : existingFace.email,
          phone: updateData.phone !== undefined ? updateData.phone : existingFace.phone,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Legacy format - convert to new format
        updatedFaceData = {
          id: userId,
          name: updateData.name || userId,
          department: updateData.department || '',
          position: updateData.position || '',
          email: updateData.email || '',
          phone: updateData.phone || '',
          embedding: existingFace, // Keep the embedding
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      this.knownFaces.set(userId, updatedFaceData);
      await this.saveKnownFaces();

      console.log(`✅ Updated known face: ${updatedFaceData.name} (ID: ${userId})`);
      return { success: true, message: `User ${updatedFaceData.name} updated successfully` };

    } catch (error) {
      console.error('❌ Error updating known face:', error);
      throw error;
    }
  }

  async getLogs(cameraName, date) {
    try {
      if (cameraName === 'all') {
        // Get logs from all cameras for the specified date
        console.log(`📋 Getting logs for all cameras on ${date}`);
        const allLogs = [];
        const logFiles = await fs.readdir(this.logsDir);
        console.log(`📁 Found log files:`, logFiles);
        
        for (const file of logFiles) {
          if (file.includes(date) && file.endsWith('.json')) {
            console.log(`📖 Reading log file: ${file}`);
            try {
              const logFile = path.join(this.logsDir, file);
              const content = await fs.readFile(logFile, 'utf8');
              const logs = JSON.parse(content);
              console.log(`📊 Found ${logs.length} logs in ${file}`);
              allLogs.push(...logs);
            } catch (error) {
              console.warn(`❌ Error reading log file ${file}:`, error);
            }
          }
        }
        
        console.log(`📈 Total logs from all cameras: ${allLogs.length}`);
        // Sort by timestamp (newest first)
        allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return allLogs;
      } else {
        // Get logs from specific camera
        const logFile = path.join(this.logsDir, `${cameraName}_${date}.json`);
        
        if (await this.fileExists(logFile)) {
          const content = await fs.readFile(logFile, 'utf8');
          return JSON.parse(content);
        } else {
          return [];
        }
      }
    } catch (error) {
      console.error('Error reading logs:', error);
      return [];
    }
  }

  async startCameraMonitoring(cameraName, streamUrl, intervalMs = 5000) {
    console.log(`🎥 Starting face recognition monitoring for ${cameraName}`);
    
    const monitor = setInterval(async () => {
      await this.processFrameFromUrl(cameraName, streamUrl);
    }, intervalMs);

    return monitor;
  }

  stopCameraMonitoring(monitor) {
    if (monitor) {
      clearInterval(monitor);
      console.log('🛑 Stopped camera monitoring');
    }
  }

  // Settings methods
  setRecognitionThreshold(threshold) {
    this.recognitionThreshold = Math.max(0.3, Math.min(0.9, threshold));
    console.log(`🎯 Recognition threshold set to: ${this.recognitionThreshold}`);
  }

  setDetectionConfidence(confidence) {
    this.detectionConfidence = Math.max(0.3, Math.min(0.9, confidence));
    this.confidenceThreshold = this.detectionConfidence; // Update face detection confidence too
    console.log(`📊 Detection confidence set to: ${this.detectionConfidence}`);
  }

  async saveSimulatedSnapshot(cameraName, faceBox, identity, faceIndex) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${cameraName}_${timestamp}_${identity.name}_${faceIndex}.jpg`;
      const snapshotPath = path.join(this.snapshotsDir, filename);

      // Create a simple colored rectangle as placeholder snapshot
      const width = 640;
      const height = 480;
      const image = new Jimp(width, height, '#1a1a1a');
      
      // Draw face bounding box
      const boxColor = Jimp.rgbaToInt(0, 255, 0, 255); // Green
      const textColor = Jimp.rgbaToInt(255, 255, 255, 255); // White
      
      // Draw rectangle border
      for (let i = 0; i < 3; i++) {
        // Top and bottom lines
        for (let x = faceBox.x; x < faceBox.x + faceBox.width; x++) {
          if (x >= 0 && x < width) {
            if (faceBox.y + i >= 0 && faceBox.y + i < height) {
              image.setPixelColor(boxColor, Math.floor(x), Math.floor(faceBox.y + i));
            }
            if (faceBox.y + faceBox.height - i >= 0 && faceBox.y + faceBox.height - i < height) {
              image.setPixelColor(boxColor, Math.floor(x), Math.floor(faceBox.y + faceBox.height - i));
            }
          }
        }
        
        // Left and right lines
        for (let y = faceBox.y; y < faceBox.y + faceBox.height; y++) {
          if (y >= 0 && y < height) {
            if (faceBox.x + i >= 0 && faceBox.x + i < width) {
              image.setPixelColor(boxColor, Math.floor(faceBox.x + i), Math.floor(y));
            }
            if (faceBox.x + faceBox.width - i >= 0 && faceBox.x + faceBox.width - i < width) {
              image.setPixelColor(boxColor, Math.floor(faceBox.x + faceBox.width - i), Math.floor(y));
            }
          }
        }
      }

      // Add face region (filled rectangle)
      for (let y = faceBox.y + 5; y < faceBox.y + faceBox.height - 5; y++) {
        for (let x = faceBox.x + 5; x < faceBox.x + faceBox.width - 5; x++) {
          if (x >= 0 && x < width && y >= 0 && y < height) {
            image.setPixelColor(Jimp.rgbaToInt(100, 150, 200, 255), Math.floor(x), Math.floor(y));
          }
        }
      }

      // Save snapshot
      await image.writeAsync(snapshotPath);
      
      console.log(`📸 Simulated snapshot saved: ${filename}`);
    } catch (error) {
      console.error('Error saving simulated snapshot:', error);
    }
  }
}

module.exports = FaceRecognitionService;
