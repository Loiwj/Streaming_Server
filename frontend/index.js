// ---- CAMERA DASHBOARD SYSTEM ----

// Import WebRTC Player
import { WebRTCPlayer } from '../src/index.ts';

// ---- CAMERA MANAGEMENT SYSTEM ----
class CameraManager {
  constructor() {
    this.cameras = [];
    this.gridSize = this.loadGridSize() || 1; // Load saved grid size
    this.gridSlots = [];
    this.activeRecorders = new Map();
    this.settings = this.loadSettings();
    
    this.loadCameras();
    this.initializeUI();
    this.setupEventListeners();
    this.renderGrid();
  }
  
  loadSettings() {
    const saved = localStorage.getItem('cameraSettings');
    return saved ? JSON.parse(saved) : {
      filenameFormat: 'datetime',
      folderName: null
    };
  }
  
  saveSettings() {
    localStorage.setItem('cameraSettings', JSON.stringify(this.settings));
  }

  loadGridSize() {
    const saved = localStorage.getItem('gridSize');
    return saved ? parseInt(saved) : null;
  }

  saveGridSize() {
    localStorage.setItem('gridSize', this.gridSize.toString());
  }
  
  loadCameras() {
    const saved = localStorage.getItem('cameras');
    this.cameras = saved ? JSON.parse(saved) : [
      {
        id: 'cam1',
        name: 'Camera 1',
        type: 'whep',
        url: 'http://localhost:8889/cam1/whep',
        username: '',
        password: ''
      },
      {
        id: 'cam2', 
        name: 'Camera 2',
        type: 'whep',
        url: 'http://localhost:8889/cam2/whep',
        username: '',
        password: ''
      }
    ];
  }
  
  saveCameras() {
    localStorage.setItem('cameras', JSON.stringify(this.cameras));
  }
  
  initializeUI() {
    // Initialize grid slots based on loaded grid size
    this.gridSlots = Array(this.gridSize * this.gridSize).fill(null);
    
    // Load saved grid assignments
    const savedGrid = localStorage.getItem('gridAssignments');
    if (savedGrid) {
      this.gridSlots = JSON.parse(savedGrid);
    }

    // Set active grid button based on loaded grid size
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-grid="${this.gridSize}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }
  
  setupEventListeners() {
    // Grid size buttons
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const newSize = parseInt(e.target.dataset.grid);
        this.changeGridSize(newSize);
      });
    });
    
    // Camera management buttons
    document.getElementById('add-camera-btn').addEventListener('click', () => {
      this.showAddCameraModal();
    });
    
    document.getElementById('camera-list-btn').addEventListener('click', () => {
      this.showCameraListModal();
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettingsModal();
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    });
    
    // Add camera form
    document.getElementById('save-camera-btn').addEventListener('click', () => {
      this.saveNewCamera();
    });
    
    document.getElementById('cancel-add-btn').addEventListener('click', () => {
      document.getElementById('add-camera-modal').style.display = 'none';
    });
    
    // Settings
    document.getElementById('folder-select-btn').addEventListener('click', () => {
      this.selectFolder();
    });
    
    document.getElementById('filename-format').addEventListener('change', (e) => {
      this.settings.filenameFormat = e.target.value;
      this.saveSettings();
    });
  }
  
  changeGridSize(newSize) {
    // Update UI
    document.querySelectorAll('.grid-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-grid="${newSize}"]`).classList.add('active');
    
    // Update grid
    this.gridSize = newSize;
    const newSlotCount = newSize * newSize;
    
    // Resize grid slots array
    if (newSlotCount > this.gridSlots.length) {
      // Add empty slots
      while (this.gridSlots.length < newSlotCount) {
        this.gridSlots.push(null);
      }
    } else if (newSlotCount < this.gridSlots.length) {
      // Remove excess slots (stop recordings first)
      for (let i = newSlotCount; i < this.gridSlots.length; i++) {
        if (this.gridSlots[i]) {
          this.stopRecording(i);
        }
      }
      this.gridSlots = this.gridSlots.slice(0, newSlotCount);
    }
    
    // Save grid size and assignments, then re-render
    this.saveGridSize();
    localStorage.setItem('gridAssignments', JSON.stringify(this.gridSlots));
    this.renderGrid();
  }
  
  renderGrid() {
    const gridContainer = document.getElementById('camera-grid');
    
    // Update grid class
    gridContainer.className = `camera-grid grid-${this.gridSize}x${this.gridSize}`;
    
    // Clear container
    gridContainer.innerHTML = '';
    
    // Create slots
    this.gridSlots.forEach((cameraId, index) => {
      const slot = this.createGridSlot(index, cameraId);
      gridContainer.appendChild(slot);
    });
    
    // Also update device list
    this.renderDeviceList();
  }
  
  renderDeviceList() {
    const deviceContainer = document.getElementById('device-items');
    if (!deviceContainer) return;
    
    deviceContainer.innerHTML = '';
    
    this.cameras.forEach(camera => {
      const deviceItem = document.createElement('div');
      deviceItem.className = 'device-item';
      deviceItem.dataset.cameraId = camera.id;
      
      // Determine if camera is online (has active video)
      const isOnline = this.gridSlots.includes(camera.id);
      
      deviceItem.innerHTML = `
        <div class="device-icon ${isOnline ? '' : 'offline'}">
          📹
        </div>
        <div class="device-info">
          <div class="device-name">${camera.name}</div>
          <div class="device-ip">${this.getDeviceIP(camera)}</div>
        </div>
      `;
      
      // Click handler for device selection
      deviceItem.addEventListener('click', () => {
        // Find empty slot or ask user to select slot
        const emptySlotIndex = this.gridSlots.findIndex(slot => slot === null);
        if (emptySlotIndex !== -1) {
          this.assignCameraToSlot(emptySlotIndex, camera.id);
        } else {
          // All slots occupied, show slot selection
          this.showSlotSelectionForCamera(camera.id);
        }
        
        // Update selection state
        document.querySelectorAll('.device-item').forEach(item => {
          item.classList.remove('selected');
        });
        deviceItem.classList.add('selected');
      });
      
      deviceContainer.appendChild(deviceItem);
    });
  }
  
  getDeviceIP(camera) {
    if (camera.originalType === 'rtsp' && camera.originalUrl) {
      try {
        const url = new URL(camera.originalUrl);
        return url.hostname;
      } catch (e) {
        return 'Unknown IP';
      }
    }
    return camera.url ? 'Streaming URL' : 'No URL';
  }
  
  showSlotSelectionForCamera(cameraId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Chọn vị trí hiển thị</h3>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(${this.gridSize}, 1fr); gap: 10px; margin: 20px 0;">
          ${this.gridSlots.map((slotCameraId, index) => `
            <button 
              class="grid-slot-selector" 
              style="
                padding: 20px; 
                border: 2px solid ${slotCameraId ? '#e74c3c' : '#27ae60'}; 
                background: ${slotCameraId ? '#ffeaea' : '#eafff0'}; 
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              "
              onclick="cameraManager.assignCameraToSlot(${index}, '${cameraId}'); this.closest('.modal').remove();"
            >
              Slot ${index + 1}
              ${slotCameraId ? '<br>Đã có camera' : '<br>Trống'}
            </button>
          `).join('')}
        </div>
        <div class="modal-buttons">
          <button class="cancel-btn" onclick="this.closest('.modal').remove()">Hủy</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
  }
  
  createGridSlot(slotIndex, cameraId) {
    const slot = document.createElement('div');
    slot.className = 'grid-slot';
    slot.dataset.slotIndex = slotIndex;
    
    if (cameraId) {
      const camera = this.cameras.find(c => c.id === cameraId);
      if (camera) {
        slot.classList.add('has-camera');
        slot.innerHTML = `
          <div class="camera-view">
            <div class="camera-info">
              <div class="camera-name">${camera.name}</div>
              <div class="camera-controls">
                <button class="remove-camera-btn" onclick="cameraManager.removeCameraFromSlot(${slotIndex})" title="Xóa khỏi slot">
                  ❌
                </button>
              </div>
            </div>
            <div class="camera-video-container">
              <video id="video-${slotIndex}" autoplay muted playsinline></video>
            </div>
            <div class="recording-controls">
              <button class="record-btn" id="record-btn-${slotIndex}" onclick="cameraManager.toggleRecording(${slotIndex})">
                <span class="record-icon">🔴</span>
                <span class="record-text">Quay</span>
              </button>
              <button class="snapshot-btn" onclick="cameraManager.takeSnapshot(${slotIndex})" title="Chụp ảnh">
                📷
              </button>
              <div class="recording-status" id="recording-status-${slotIndex}" style="display: none;">
                <div class="recording-dot"></div>
                <span>Đang quay...</span>
                <span class="recording-time">00:00</span>
              </div>
              <button class="camera-selector" onclick="cameraManager.selectCameraForSlot(${slotIndex})" title="Thay đổi camera">
                🔄
              </button>
            </div>
          </div>
        `;
        
        // Initialize video player
        setTimeout(() => this.initializeVideoPlayer(slotIndex, camera), 100);
      }
    } else {
      slot.innerHTML = `
        <div class="empty-slot-content">
          <div class="empty-slot-icon">📹</div>
          <div class="empty-slot-text">Click để chọn camera</div>
          <button class="add-camera-slot-btn" onclick="cameraManager.selectCameraForSlot(${slotIndex})">
            ➕ Thêm Camera
          </button>
        </div>
      `;
      
      slot.addEventListener('click', () => {
        this.selectCameraForSlot(slotIndex);
      });
    }
    
    return slot;
  }
  
  async initializeVideoPlayer(slotIndex, camera) {
    const video = document.getElementById(`video-${slotIndex}`);
    if (!video || camera.type !== 'whep') {
      console.log(`Skipping player init for slot ${slotIndex}: video=${!!video}, type=${camera.type}`);
      return;
    }
    
    console.log(`🎬 Initializing WebRTC player for ${camera.name} at slot ${slotIndex}`);
    console.log(`URL: ${camera.url}`);
    
    try {
      const player = new WebRTCPlayer({
        video: video,
        type: 'whep',
        debug: true
      });
      
      player.on('peer-connection-connected', () => {
        console.log(`✅ ${camera.name}: WebRTC connected successfully`);
        video.style.background = 'transparent'; // Remove loading background
      });
      
      player.on('peer-connection-failed', (error) => {
        console.error(`❌ ${camera.name}: WebRTC connection failed:`, error);
        video.style.background = '#f44336'; // Red background on error
      });
      
      player.on('stream-added', () => {
        console.log(`🎥 ${camera.name}: Video stream started`);
      });
      
      player.on('stream-removed', () => {
        console.log(`📴 ${camera.name}: Video stream stopped`);
      });
      
      // Set loading background
      video.style.background = '#666';
      
      console.log(`🔗 Loading URL: ${camera.url}`);
      await player.load(new URL(camera.url));
      console.log(`✅ ${camera.name}: Player load completed`);
      
    } catch (error) {
      console.error(`❌ Error initializing ${camera.name}:`, error);
      // Show error in video element
      const video = document.getElementById(`video-${slotIndex}`);
      if (video) {
        video.style.background = '#f44336';
        video.title = `Error: ${error.message}`;
      }
    }
  }
  
  selectCameraForSlot(slotIndex) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>📷 Chọn Camera cho Slot ${slotIndex + 1}</h3>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 16px;">
            <button class="cancel-btn" onclick="cameraManager.assignCameraToSlot(${slotIndex}, null); this.closest('.modal').remove();">🚫 Xóa camera</button>
          </div>
          ${this.cameras.map(camera => `
            <div style="margin-bottom: 8px;">
              <button class="save-btn" style="width: 100%; text-align: left;" onclick="cameraManager.assignCameraToSlot(${slotIndex}, '${camera.id}'); this.closest('.modal').remove();">
                📹 ${camera.name} (${camera.type.toUpperCase()})
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
  
  assignCameraToSlot(slotIndex, cameraId) {
    // Stop current recording if any
    if (this.gridSlots[slotIndex]) {
      this.stopRecording(slotIndex);
    }
    
    // Update slot
    this.gridSlots[slotIndex] = cameraId;
    
    // Save and re-render
    localStorage.setItem('gridAssignments', JSON.stringify(this.gridSlots));
    this.renderGrid();
  }
  
  removeCameraFromSlot(slotIndex) {
    if (confirm('Bạn có chắc muốn xóa camera khỏi slot này?')) {
      // Stop recording if active
      this.stopRecording(slotIndex);
      
      // Clear slot
      this.gridSlots[slotIndex] = null;
      
      // Save and re-render
      localStorage.setItem('gridAssignments', JSON.stringify(this.gridSlots));
      this.renderGrid();
      
      this.showNotification('✅ Đã xóa camera khỏi slot');
    }
  }
  
  startRecording(slotIndex) {
    const cameraId = this.gridSlots[slotIndex];
    const camera = this.cameras.find(c => c.id === cameraId);
    if (!camera) return;
    
    const video = document.getElementById(`video-${slotIndex}`);
    const recordBtn = document.getElementById(`record-btn-${slotIndex}`);
    const status = document.getElementById(`recording-status-${slotIndex}`);
    const timeDisplay = status.querySelector('.recording-time');
    
    try {
      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      
      if (!stream) {
        alert('Không thể bắt được stream từ video.');
        return;
      }
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });
      
      const recordedChunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        this.handleRecordingComplete(slotIndex, recordedChunks, camera.name);
      };
      
      recorder.start(1000);
      
      // Store recorder info
      this.activeRecorders.set(slotIndex, {
        recorder,
        recordedChunks,
        startTime: Date.now(),
        timerInterval: null
      });
      
      // Update UI
      recordBtn.classList.add('recording');
      recordBtn.querySelector('.record-icon').textContent = '⏹️';
      recordBtn.querySelector('.record-text').textContent = 'Dừng';
      status.style.display = 'flex';
      
      // Start timer
      const recorderInfo = this.activeRecorders.get(slotIndex);
      recorderInfo.timerInterval = setInterval(() => {
        const elapsed = Date.now() - recorderInfo.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }, 1000);
      
    } catch (error) {
      console.error('Recording error:', error);
      alert('Lỗi khi bắt đầu quay: ' + error.message);
    }
  }
  
  stopRecording(slotIndex) {
    const recorderInfo = this.activeRecorders.get(slotIndex);
    if (!recorderInfo) return;
    
    const recordBtn = document.getElementById(`record-btn-${slotIndex}`);
    const status = document.getElementById(`recording-status-${slotIndex}`);
    
    // Stop recording
    recorderInfo.recorder.stop();
    
    // Clear timer
    if (recorderInfo.timerInterval) {
      clearInterval(recorderInfo.timerInterval);
    }
    
    // Update UI
    recordBtn.classList.remove('recording');
    recordBtn.querySelector('.record-icon').textContent = '🔴';
    recordBtn.querySelector('.record-text').textContent = 'Quay';
    status.style.display = 'none';
    
    // Remove from active recordings
    this.activeRecorders.delete(slotIndex);
  }
  
  async handleRecordingComplete(slotIndex, recordedChunks, cameraName) {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const filename = this.generateFilename(cameraName);
    
    // Try to save to folder or auto-download
    const savedToFolder = await this.saveToFolder(blob, filename);
    
    if (savedToFolder) {
      this.showNotification(`✅ Đã lưu vào thư mục: ${filename}`);
    } else {
      // Auto download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showNotification(`✅ Đã tải xuống: ${filename}`);
    }
  }

  toggleRecording(slotIndex) {
    const recorderInfo = this.activeRecorders.get(slotIndex);
    if (recorderInfo) {
      this.stopRecording(slotIndex);
    } else {
      this.startRecording(slotIndex);
    }
  }

  takeSnapshot(slotIndex) {
    const cameraId = this.gridSlots[slotIndex];
    const camera = this.cameras.find(c => c.id === cameraId);
    if (!camera) return;

    const video = document.getElementById(`video-${slotIndex}`);
    if (!video) return;

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to video size
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const filename = `${camera.name}-snapshot-${timestamp}.png`;
          
          // Create download link
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          this.showNotification(`📷 Đã chụp ảnh: ${filename}`);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error taking snapshot:', error);
      this.showNotification('❌ Lỗi chụp ảnh');
    }
  }
  
  generateFilename(cameraName) {
    const now = new Date();
    const cleanName = cameraName.replace(/[^a-zA-Z0-9]/g, '-');
    
    switch (this.settings.filenameFormat) {
      case 'datetime':
        return `${cleanName}-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      case 'timestamp':
        return `${cleanName}-${now.getTime()}.webm`;
      case 'simple':
        return `${cleanName}-video-${Math.floor(Math.random() * 1000)}.webm`;
      default:
        return `${cleanName}-${now.toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    }
  }
  
  async saveToFolder(blob, filename) {
    if (this.folderHandle) {
      try {
        const fileHandle = await this.folderHandle.getFileHandle(filename, {
          create: true
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        return true;
      } catch (error) {
        console.error('Error saving to folder:', error);
        return false;
      }
    }
    return false;
  }
  
  showNotification(message) {
    const notification = document.createElement('div');
    notification.innerHTML = message.replace(/\n/g, '<br>');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      max-width: 350px;
      word-wrap: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
  
  showAddCameraModal() {
    document.getElementById('add-camera-modal').style.display = 'flex';
  }
  
  showCameraListModal() {
    const content = document.getElementById('camera-list-content');
    content.innerHTML = this.cameras.map(camera => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 8px;">
        <div>
          <strong>${camera.name}</strong><br>
          <small>${camera.type.toUpperCase()}: ${camera.url}</small>
        </div>
        <button class="cancel-btn" onclick="cameraManager.deleteCamera('${camera.id}')">🗑️</button>
      </div>
    `).join('');
    
    document.getElementById('camera-list-modal').style.display = 'flex';
  }
  
  showSettingsModal() {
    // Update UI with current settings
    const folderDisplay = document.getElementById('folder-display');
    const filenameFormat = document.getElementById('filename-format');
    
    if (this.settings.folderName) {
      folderDisplay.textContent = `📁 ${this.settings.folderName}`;
      folderDisplay.className = 'folder-display selected';
    } else {
      folderDisplay.textContent = 'Chưa chọn thư mục';
      folderDisplay.className = 'folder-display';
    }
    
    filenameFormat.value = this.settings.filenameFormat;
    
    document.getElementById('settings-modal').style.display = 'flex';
  }
  
  async selectFolder() {
    try {
      if (!window.showDirectoryPicker) {
        alert('Trình duyệt của bạn không hỗ trợ chọn thư mục tự động.\n\nVideo sẽ được tải xuống vào thư mục Downloads với tên file đã cấu hình.');
        return;
      }
      
      this.folderHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      this.settings.folderName = this.folderHandle.name;
      this.saveSettings();
      this.showSettingsModal(); // Refresh modal
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting folder:', error);
        alert('Không thể chọn thư mục: ' + error.message);
      }
    }
  }
  
  async saveNewCamera() {
    const name = document.getElementById('camera-name').value.trim();
    const type = document.getElementById('camera-type').value;
    const url = document.getElementById('camera-url').value.trim();
    const username = document.getElementById('camera-username').value.trim();
    const password = document.getElementById('camera-password').value.trim();
    
    if (!name || !url) {
      alert('Vui lòng nhập tên camera và URL');
      return;
    }
    
    let finalUrl = url;
    let pathName = null;
    
    // If RTSP, add to MediaMTX and get WHEP URL
    if (type === 'rtsp') {
      try {
        this.showNotification('🔄 Đang thêm RTSP camera vào MediaMTX...');
        
        // Build RTSP URL with credentials if provided
        let rtspUrl = url;
        if (username && password) {
          try {
            // Validate URL first
            if (!url.startsWith('rtsp://')) {
              throw new Error('URL phải bắt đầu với rtsp://');
            }
            
            const urlObj = new URL(rtspUrl);
            urlObj.username = username;
            urlObj.password = password;
            rtspUrl = urlObj.toString();
          } catch (urlError) {
            throw new Error(`URL không hợp lệ: ${urlError.message}`);
          }
        } else {
          // Validate URL without credentials
          if (!url.startsWith('rtsp://')) {
            throw new Error('URL phải bắt đầu với rtsp://');
          }
        }
        
        console.log('Sending RTSP request:', { name, rtspUrl });
        
        const response = await fetch('http://localhost:3001/api/cameras/rtsp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name,
            rtspUrl: rtspUrl
          })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Response error:', errorText);
          throw new Error(`Lỗi server (${response.status}): ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Response result:', result);
        
        if (result.success) {
          finalUrl = result.whepUrl;
          pathName = result.pathName;
          this.showNotification(`✅ RTSP camera đã được thêm vào MediaMTX: ${pathName}`);
        } else {
          throw new Error(result.error || 'Không thể thêm RTSP camera');
        }
        
      } catch (error) {
        console.error('Error adding RTSP camera to MediaMTX:', error);
        
        let errorMsg = 'Lỗi không xác định';
        if (error.message.includes('fetch')) {
          errorMsg = 'Không thể kết nối tới server backend. Kiểm tra server có đang chạy?';
        } else if (error.message.includes('URL')) {
          errorMsg = error.message;
        } else {
          errorMsg = error.message || 'Lỗi thêm RTSP camera';
        }
        
        this.showNotification(`❌ ${errorMsg}`);
        return;
      }
    }
    
    const newCamera = {
      id: 'cam' + Date.now(),
      name,
      type: type === 'rtsp' ? 'whep' : type, // Convert RTSP to WHEP for player
      url: finalUrl,
      originalUrl: url, // Keep original URL for reference
      originalType: type, // Keep original type for reference
      username,
      password,
      pathName // Store MediaMTX path name for deletion
    };
    
    this.cameras.push(newCamera);
    this.saveCameras();
    
    // Update device list
    this.renderDeviceList();
    
    // Clear form
    document.getElementById('camera-name').value = '';
    document.getElementById('camera-url').value = '';
    document.getElementById('camera-username').value = '';
    document.getElementById('camera-password').value = '';
    
    // Close modal
    document.getElementById('add-camera-modal').style.display = 'none';
    
    this.showNotification(`✅ Đã thêm camera: ${name}`);
  }
  
  async deleteCamera(cameraId) {
    if (confirm('Bạn có chắc muốn xóa camera này?')) {
      // Find camera to get pathName for RTSP removal
      const camera = this.cameras.find(c => c.id === cameraId);
      
      // If RTSP camera, remove from MediaMTX
      if (camera && camera.originalType === 'rtsp' && camera.pathName) {
        try {
          this.showNotification('🔄 Đang xóa RTSP camera khỏi MediaMTX...');
          
          const response = await fetch(`http://localhost:3001/api/cameras/${camera.pathName}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();
          if (result.success) {
            this.showNotification(`✅ Đã xóa RTSP camera khỏi MediaMTX: ${camera.pathName}`);
          } else {
            console.warn('MediaMTX removal warning:', result.error);
          }
          
        } catch (error) {
          console.error('Error removing RTSP camera from MediaMTX:', error);
          this.showNotification(`⚠️ Cảnh báo: ${error.message}`);
          // Continue with local deletion even if MediaMTX removal fails
        }
      }
      
      // Remove from cameras list
      this.cameras = this.cameras.filter(c => c.id !== cameraId);
      this.saveCameras();
      
      // Remove from grid slots
      this.gridSlots = this.gridSlots.map(slotCameraId => 
        slotCameraId === cameraId ? null : slotCameraId
      );
      localStorage.setItem('gridAssignments', JSON.stringify(this.gridSlots));
      
      // Re-render
      this.renderGrid();
      this.renderDeviceList();
      this.showCameraListModal(); // Refresh modal
      
      this.showNotification('✅ Đã xóa camera');
    }
  }
}

// Initialize the camera manager
const cameraManager = new CameraManager();

// Make it globally accessible for onclick handlers
window.cameraManager = cameraManager;

// Check MediaRecorder support
if (!window.MediaRecorder) {
  alert('Trình duyệt của bạn không hỗ trợ chức năng quay video.');
  console.error('MediaRecorder không được hỗ trợ');
}