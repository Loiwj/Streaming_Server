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
    
    // Record history system
    this.recordHistory = this.loadRecordHistory(); // Historical records
    
    this.loadCameras();
    this.initializeUI();
    this.setupEventListeners();
    this.renderGrid();
  }
  
  loadSettings() {
    const saved = localStorage.getItem('cameraSettings');
    return saved ? JSON.parse(saved) : {
      filenameFormat: 'datetime',
      folderName: null,
      recordStorage: 'download', // 'download', 'folder', 'upload'
      autoUploadRecordings: false
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
  
  loadRecordHistory() {
    const saved = localStorage.getItem('recordHistory');
    return saved ? JSON.parse(saved) : [];
  }
  
  saveRecordHistory() {
    localStorage.setItem('recordHistory', JSON.stringify(this.recordHistory));
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
    
    // Record history button
    document.getElementById('record-history-btn').addEventListener('click', () => {
      this.showRecordHistoryModal();
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
    
    // Record storage settings
    document.getElementById('record-storage').addEventListener('change', (e) => {
      this.settings.recordStorage = e.target.value;
      this.saveSettings();
    });
    
    document.getElementById('auto-upload-recordings').addEventListener('change', (e) => {
      this.settings.autoUploadRecordings = e.target.checked;
      this.saveSettings();
    });
    
    // Record management listeners
    this.setupRecordManagementListeners();
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
    const recordId = Date.now().toString();
    
    // Create record object and add to history
    const historyRecord = {
      id: recordId,
      filename: filename,
      cameraName: cameraName,
      blob: blob, // Keep blob for download
      size: blob.size,
      duration: this.calculateRecordDuration(slotIndex),
      createdAt: new Date().toISOString(),
      status: 'ready',
      blobUrl: URL.createObjectURL(blob) // Create URL for preview
    };
    
    this.recordHistory.unshift(historyRecord);
    this.saveRecordHistory();
    
    // Show notification
    this.showNotification(`📼 Video đã được ghi xong: ${filename}`);
    
    // Update UI counters
    this.updateRecordCounters();
    
    console.log('✅ Recording completed and stored:', historyRecord);
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
    const recordStorage = document.getElementById('record-storage');
    const autoUploadRecordings = document.getElementById('auto-upload-recordings');
    
    if (this.settings.folderName) {
      folderDisplay.textContent = `📁 ${this.settings.folderName}`;
      folderDisplay.className = 'folder-display selected';
    } else {
      folderDisplay.textContent = 'Chưa chọn thư mục';
      folderDisplay.className = 'folder-display';
    }
    
    filenameFormat.value = this.settings.filenameFormat;
    recordStorage.value = this.settings.recordStorage || 'download';
    autoUploadRecordings.checked = this.settings.autoUploadRecordings || false;
    
    document.getElementById('settings-modal').style.display = 'flex';
  }
  
  async selectFolder() {
    try {
      if (!window.showDirectoryPicker) {
        alert('Trình duyệt của bạn không hỗ trợ chọn thư mục tự động.\n\nVideo sẽ được tải xuống vào thư mục Downloads với tên file đã cấu hình.');
        return;
      }
      
      const folderHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Save both name and handle
      this.settings.folderName = folderHandle.name;
      this.settings.folderHandle = folderHandle;
      this.saveSettings();
      
      this.showNotification(`✅ Đã chọn thư mục: ${folderHandle.name}`);
      
      // Update all relevant UI
      this.showSettingsModal(); // Refresh settings modal
      this.updateHistoryFolderInfo(); // Update history info
      
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
  
  
  
  setupRecordManagementListeners() {
    // History listeners
    const selectFolderBtn = document.getElementById('select-folder-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const exportHistoryBtn = document.getElementById('export-history-btn');
    
    if (selectFolderBtn) {
      selectFolderBtn.addEventListener('click', () => {
        this.selectFolder();
      });
    }
    
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        this.clearRecordHistory();
      });
    }
    
    if (exportHistoryBtn) {
      exportHistoryBtn.addEventListener('click', () => {
        this.exportAllHistory();
      });
    }
  }
  
  async downloadAllRecords() {
    if (this.pendingRecords.size === 0) return;
    
    if (confirm(`Tải xuống tất cả ${this.pendingRecords.size} video?`)) {
      const records = Array.from(this.pendingRecords.values());
      let downloadCount = 0;
      let successCount = 0;
      
      // Show progress notification
      this.showNotification(`🔄 Đang tải xuống ${records.length} video...`);
      
      for (const record of records) {
        try {
          const saved = await this.saveRecordWithPicker(record.blob, record.filename);
          if (saved) {
            successCount++;
            record.status = 'downloaded';
            
            // Update history record status
            const historyRecord = this.recordHistory.find(r => r.id === record.id);
            if (historyRecord) {
              historyRecord.status = 'downloaded';
            }
          }
        } catch (error) {
          console.error('Batch download error:', error);
        }
        
        downloadCount++;
        
        // Small delay between downloads to prevent browser blocking
        if (downloadCount < records.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Update UI
      this.saveRecordHistory();
      this.showNotification(`✅ Đã tải xuống ${successCount}/${records.length} video`);
      
      // Clear pending after successful downloads
      if (successCount > 0) {
        setTimeout(() => {
          this.pendingRecords.clear();
          this.renderDownloadList();
          this.updateRecordCounters();
        }, 1000);
      }
    }
  }
  
  clearAllDownloads() {
    if (this.pendingRecords.size === 0) return;
    
    if (confirm(`Xóa tất cả ${this.pendingRecords.size} video khỏi danh sách tải xuống?`)) {
      // Revoke all blob URLs
      this.pendingRecords.forEach(record => {
        if (record.blob) {
          URL.revokeObjectURL(URL.createObjectURL(record.blob));
        }
      });
      
      this.pendingRecords.clear();
      this.renderDownloadList();
      this.updateRecordCounters();
      this.showNotification('✅ Đã xóa tất cả khỏi danh sách tải xuống');
    }
  }
  
  clearRecordHistory() {
    if (this.recordHistory.length === 0) return;
    
    if (confirm(`Xóa toàn bộ lịch sử ghi hình (${this.recordHistory.length} video)?`)) {
      // Revoke all blob URLs
      this.recordHistory.forEach(record => {
        if (record.blobUrl) {
          URL.revokeObjectURL(record.blobUrl);
        }
      });
      
      this.recordHistory = [];
      this.saveRecordHistory();
      this.renderHistoryList();
      this.updateRecordCounters();
      this.showNotification('✅ Đã xóa toàn bộ lịch sử ghi hình');
    }
  }
  
  async exportAllHistory() {
    if (this.recordHistory.length === 0) {
      this.showNotification('❌ Không có video nào để xuất');
      return;
    }
    
    if (confirm(`Xuất tất cả ${this.recordHistory.length} video từ lịch sử?`)) {
      let exportCount = 0;
      let successCount = 0;
      
      // Show progress notification
      this.showNotification(`🔄 Đang xuất ${this.recordHistory.length} video...`);
      
      for (const record of this.recordHistory) {
        if (record.blobUrl) {
          try {
            const response = await fetch(record.blobUrl);
            const blob = await response.blob();
            
            const saved = await this.saveRecordWithPicker(blob, record.filename);
            if (saved) {
              successCount++;
            }
          } catch (error) {
            console.error('Export error:', error);
          }
        }
        
        exportCount++;
        
        // Small delay between exports
        if (exportCount < this.recordHistory.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      this.showNotification(`✅ Đã xuất ${successCount}/${this.recordHistory.length} video`);
    }
  }
  
  showFileUploadModal() {
    const modal = document.getElementById('file-upload-modal');
    modal.style.display = 'flex';
    this.resetUploadModal();
  }
  
  showFileManagerModal() {
    const modal = document.getElementById('file-manager-modal');
    modal.style.display = 'flex';
    this.loadFileList();
  }
  
  resetUploadModal() {
    document.getElementById('file-input').value = '';
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-results').innerHTML = '';
    document.getElementById('start-upload-btn').disabled = true;
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('progress-text').textContent = 'Đang tải lên...';
  }
  
  updateFileSelection(files) {
    const startBtn = document.getElementById('start-upload-btn');
    const resultsDiv = document.getElementById('upload-results');
    
    if (files.length === 0) {
      startBtn.disabled = true;
      resultsDiv.innerHTML = '';
      return;
    }
    
    startBtn.disabled = false;
    
    // Show selected files
    resultsDiv.innerHTML = `
      <div class="upload-result-item">
        <div class="upload-result-info">
          <span class="upload-result-icon">📁</span>
          <div class="upload-result-details">
            <h4>Đã chọn ${files.length} file(s)</h4>
            <p>${files.map(f => f.name).join(', ')}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  async startFileUpload(files, uploadType) {
    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const resultsDiv = document.getElementById('upload-results');
    const startBtn = document.getElementById('start-upload-btn');
    
    progressDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    startBtn.disabled = true;
    
    try {
      if (uploadType === 'single') {
        // Upload files one by one
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const progress = ((i + 1) / files.length) * 100;
          
          progressFill.style.width = `${progress}%`;
          progressText.textContent = `Đang tải file ${i + 1}/${files.length}: ${file.name}`;
          
          try {
            const result = await this.uploadSingleFile(file);
            this.addUploadResult(file, result, true);
          } catch (error) {
            this.addUploadResult(file, error, false);
          }
        }
      } else {
        // Upload multiple files at once
        progressText.textContent = `Đang tải ${files.length} file(s) cùng lúc...`;
        progressFill.style.width = '50%';
        
        try {
          const result = await this.uploadMultipleFiles(files);
          progressFill.style.width = '100%';
          progressText.textContent = 'Hoàn thành!';
          
          if (result.files) {
            result.files.forEach((fileResult, index) => {
              this.addUploadResult(files[index], fileResult, true);
            });
          }
        } catch (error) {
          this.addUploadResult(null, error, false);
        }
      }
      
      progressText.textContent = 'Tải lên hoàn tất!';
      this.showNotification('✅ Tải file thành công!');
      
    } catch (error) {
      console.error('Upload error:', error);
      progressText.textContent = 'Có lỗi xảy ra!';
      this.showNotification('❌ Lỗi khi tải file: ' + error.message);
    } finally {
      startBtn.disabled = false;
    }
  }
  
  async uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('http://localhost:3001/api/upload/single', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async uploadMultipleFiles(files) {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    const response = await fetch('http://localhost:3001/api/upload/multiple', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
  
  addUploadResult(file, result, success) {
    const resultsDiv = document.getElementById('upload-results');
    const resultItem = document.createElement('div');
    resultItem.className = `upload-result-item ${success ? 'success' : 'error'}`;
    
    if (success) {
      const fileInfo = result.file || result;
      resultItem.innerHTML = `
        <div class="upload-result-info">
          <span class="upload-result-icon">✅</span>
          <div class="upload-result-details">
            <h4>${fileInfo.originalName || file?.name || 'File'}</h4>
            <p>Kích thước: ${this.formatFileSize(fileInfo.size || 0)} • Loại: ${fileInfo.mimetype || 'Unknown'}</p>
          </div>
        </div>
      `;
    } else {
      resultItem.innerHTML = `
        <div class="upload-result-info">
          <span class="upload-result-icon">❌</span>
          <div class="upload-result-details">
            <h4>${file?.name || 'File upload'}</h4>
            <p>Lỗi: ${result.message || result.error || result}</p>
          </div>
        </div>
      `;
    }
    
    resultsDiv.appendChild(resultItem);
  }
  
  async loadFileList(type = 'all') {
    const fileList = document.getElementById('file-list');
    const fileStats = document.getElementById('file-stats');
    
    try {
      fileList.innerHTML = '<div class="loading-spinner"></div>';
      
      const url = type === 'all' 
        ? 'http://localhost:3001/api/files'
        : `http://localhost:3001/api/files/${type}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      this.renderFileList(result.files || []);
      
      fileStats.innerHTML = `<span>Tổng: <strong>${result.count || 0}</strong> file</span>`;
      
    } catch (error) {
      console.error('Error loading files:', error);
      fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">❌</div>
          <p>Lỗi khi tải danh sách file: ${error.message}</p>
        </div>
      `;
    }
  }
  
  renderFileList(files) {
    const fileList = document.getElementById('file-list');
    const currentView = document.querySelector('.view-btn.active').dataset.view;
    
    fileList.className = `file-list ${currentView}-view`;
    
    if (files.length === 0) {
      fileList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p>Chưa có file nào được tải lên</p>
        </div>
      `;
      return;
    }
    
    fileList.innerHTML = files.map(file => this.renderFileItem(file, currentView)).join('');
  }
  
  renderFileItem(file, view) {
    const isVideo = file.type === 'video';
    const fileUrl = `http://localhost:3001${file.url}`;
    const createdDate = new Date(file.created).toLocaleString('vi-VN');
    const fileSize = this.formatFileSize(file.size);
    
    if (view === 'grid') {
      return `
        <div class="file-item grid" data-file="${file.name}" data-type="${file.type}">
          <div class="file-preview ${isVideo ? 'video' : 'image'}">
            ${isVideo 
              ? `<video preload="metadata" muted><source src="${fileUrl}" type="video/mp4"></video>`
              : `<img src="${fileUrl}" alt="${file.name}" loading="lazy">`
            }
          </div>
          <div class="file-info">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-meta">
              <span class="file-type ${file.type}">${file.type}</span>
              <span>${fileSize}</span>
            </div>
            <div class="file-actions">
              <button class="file-action-btn" onclick="window.open('${fileUrl}', '_blank')">Xem</button>
              <button class="file-action-btn" onclick="cameraManager.downloadFile('${fileUrl}', '${file.name}')">Tải về</button>
              <button class="file-action-btn delete" onclick="cameraManager.deleteFile('${file.type}s', '${file.name}')">Xóa</button>
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="file-item list" data-file="${file.name}" data-type="${file.type}">
          <div class="file-preview ${isVideo ? 'video' : 'image'}" style="width: 60px; height: 40px; min-width: 60px;">
            ${isVideo 
              ? `<video preload="metadata" muted><source src="${fileUrl}" type="video/mp4"></video>`
              : `<img src="${fileUrl}" alt="${file.name}" loading="lazy">`
            }
          </div>
          <div class="file-info list">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-meta">
              <span class="file-type ${file.type}">${file.type}</span>
              <span>${fileSize} • ${createdDate}</span>
            </div>
          </div>
          <div class="file-actions">
            <button class="file-action-btn" onclick="window.open('${fileUrl}', '_blank')">Xem</button>
            <button class="file-action-btn" onclick="cameraManager.downloadFile('${fileUrl}', '${file.name}')">Tải về</button>
            <button class="file-action-btn delete" onclick="cameraManager.deleteFile('${file.type}s', '${file.name}')">Xóa</button>
          </div>
        </div>
      `;
    }
  }
  
  filterFiles(type) {
    this.loadFileList(type === 'all' ? undefined : type);
  }
  
  changeFileView(view) {
    const fileList = document.getElementById('file-list');
    const items = fileList.querySelectorAll('.file-item');
    
    fileList.className = `file-list ${view}-view`;
    
    items.forEach(item => {
      item.className = `file-item ${view}`;
    });
  }
  
  async deleteFile(type, filename) {
    if (!confirm(`Bạn có chắc chắn muốn xóa file "${filename}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/files/${type}/${filename}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        this.showNotification('✅ Đã xóa file thành công');
        this.loadFileList(); // Reload the file list
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('Error deleting file:', error);
      this.showNotification('❌ Lỗi khi xóa file: ' + error.message);
    }
  }
  
  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // ---- RECORD VIDEO UPLOAD METHODS ----
  
  async uploadRecordedVideo(blob, filename) {
    try {
      // Convert blob to file
      const file = new File([blob], filename, { type: 'video/webm' });
      
      // Use the existing upload method
      const result = await this.uploadSingleFile(file);
      
      if (result.success) {
        this.showNotification('📤 Video đã được upload lên server thành công!');
        return result;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error uploading recorded video:', error);
      this.showNotification(`❌ Lỗi upload video: ${error.message}`);
      throw error;
    }
  }
  
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  async saveRecordWithPicker(blob, filename) {
    // Check if we have File System Access API support
    if ('showSaveFilePicker' in window) {
      try {
        // Show file save dialog
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'Video files',
            accept: {
              'video/webm': ['.webm'],
              'video/mp4': ['.mp4']
            }
          }]
        });
        
        // Create a writable stream
        const writable = await fileHandle.createWritable();
        
        // Write the blob to the file
        await writable.write(blob);
        await writable.close();
        
        return true;
        
      } catch (error) {
        if (error.name === 'AbortError') {
          // User cancelled the dialog
          this.showNotification('⚠️ Đã hủy lưu file');
          return false;
        }
        
        console.error('File System Access API error:', error);
        // Fallback to regular download
        return this.saveToFolderOrDownload(blob, filename);
      }
    } else {
      // Fallback for browsers without File System Access API
      return this.saveToFolderOrDownload(blob, filename);
    }
  }
  
  async saveToFolderOrDownload(blob, filename) {
    // Try to save to previously selected folder
    if (this.settings.folderHandle) {
      try {
        // Check if we still have permission
        const permission = await this.settings.folderHandle.queryPermission({ mode: 'readwrite' });
        
        if (permission === 'granted') {
          // Save to the selected folder
          const fileHandle = await this.settings.folderHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          return true;
        }
      } catch (error) {
        console.error('Folder save error:', error);
      }
    }
    
    // Fallback to regular download
    this.downloadBlob(blob, filename);
    return true;
  }
  
  // ---- NEW RECORD MANAGEMENT METHODS ----
  
  calculateRecordDuration(slotIndex) {
    const recorderInfo = this.activeRecorders.get(slotIndex);
    if (recorderInfo && recorderInfo.startTime) {
      return Math.floor((Date.now() - recorderInfo.startTime) / 1000);
    }
    return 0;
  }
  
  updateRecordCounters() {
    // Update history counters
    const historyCount = document.getElementById('history-count');
    const historySize = document.getElementById('history-size');
    if (historyCount && historySize) {
      historyCount.textContent = this.recordHistory.length;
      const totalSize = this.recordHistory.reduce((sum, record) => sum + (record.size || 0), 0);
      historySize.textContent = this.formatFileSize(totalSize);
    }
  }
  
  updateDownloadFolderInfo() {
    const folderInfo = document.getElementById('folder-info');
    if (!folderInfo) return;
    
    if (this.settings.folderName) {
      folderInfo.innerHTML = `📂 Thư mục đã chọn: <strong>${this.settings.folderName}</strong> • Nhấn "💾 Tải xuống" sẽ lưu vào thư mục này`;
    } else {
      folderInfo.innerHTML = `💡 Nhấn "📂 Chọn thư mục" để chọn nơi lưu file, hoặc nhấn "💾 Tải xuống" để chọn từng file`;
    }
  }
  
  updateHistoryFolderInfo() {
    const folderInfo = document.getElementById('folder-info-history');
    if (!folderInfo) return;
    
    if (this.settings.folderName) {
      folderInfo.innerHTML = `📂 Thư mục đã chọn: <strong>${this.settings.folderName}</strong> • Nhấn "💾 Tải xuống" sẽ lưu vào thư mục này`;
    } else {
      folderInfo.innerHTML = `💡 Nhấn "📂 Chọn thư mục" để chọn nơi lưu file, hoặc nhấn "💾 Tải xuống" để chọn từng file`;
    }
  }
  
  showDownloadCenterModal() {
    const modal = document.getElementById('download-center-modal');
    modal.style.display = 'flex';
    this.renderDownloadList();
    this.updateRecordCounters();
    this.updateDownloadFolderInfo();
  }
  
  showRecordHistoryModal() {
    const modal = document.getElementById('record-history-modal');
    modal.style.display = 'flex';
    this.renderHistoryList();
    this.updateRecordCounters();
    this.updateHistoryFolderInfo();
  }
  
  renderDownloadList() {
    const downloadList = document.getElementById('download-list');
    
    if (this.pendingRecords.size === 0) {
      downloadList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💾</div>
          <p>Chưa có video nào chờ tải xuống</p>
          <small>Ghi hình video và chúng sẽ xuất hiện ở đây</small>
        </div>
      `;
      return;
    }
    
    const records = Array.from(this.pendingRecords.values());
    downloadList.innerHTML = records.map(record => this.renderRecordItem(record, 'download')).join('');
  }
  
  renderHistoryList() {
    const historyList = document.getElementById('history-list');
    
    if (this.recordHistory.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📼</div>
          <p>Chưa có video nào trong lịch sử</p>
          <small>Các video đã ghi sẽ được lưu ở đây</small>
        </div>
      `;
      return;
    }
    
    historyList.innerHTML = this.recordHistory.map(record => this.renderRecordItem(record, 'history')).join('');
  }
  
  renderRecordItem(record, type) {
    const createdDate = new Date(record.createdAt).toLocaleString('vi-VN');
    const duration = record.duration ? `${record.duration}s` : 'N/A';
    const fileSize = this.formatFileSize(record.size || 0);
    
    // Create preview
    const previewHtml = record.blobUrl ? 
      `<video src="${record.blobUrl}" muted preload="metadata"></video>
       <div class="play-overlay">▶</div>` :
      `<div style="color: #a0aec0; font-size: 2rem;">📼</div>`;
    
    // Create actions for history
    const actionsHtml = `
      <button class="record-action-btn" onclick="cameraManager.playRecord('${record.id}')">
        ▶️ Phát
      </button>
      <button class="record-action-btn primary" onclick="cameraManager.downloadRecord('${record.id}')">
        💾 Tải xuống
      </button>
      <button class="record-action-btn danger" onclick="cameraManager.deleteFromHistory('${record.id}')">
        🗑️ Xóa
      </button>
    `;
    
    const statusHtml = `<span class="record-status downloaded">Sẵn sàng</span>`;
    
    return `
      <div class="record-item" data-record-id="${record.id}">
        <div class="record-preview">
          ${previewHtml}
        </div>
        <div class="record-content">
          <div class="record-title">${record.filename}</div>
          <div class="record-meta">
            📹 ${record.cameraName} • 📅 ${createdDate}
          </div>
          <div class="record-details">
            ⏱️ ${duration} • 📦 ${fileSize} • ${statusHtml}
          </div>
        </div>
        <div class="record-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }
  
  // ---- RECORD ACTION METHODS ----
  
  async downloadRecord(recordId) {
    const record = this.recordHistory.find(r => r.id === recordId);
    if (!record || !record.blob) return;
    
    try {
      // Try to save with file picker or use selected folder
      const saved = await this.saveRecordWithPicker(record.blob, record.filename);
      
      if (saved) {
        this.showNotification(`✅ Đã lưu: ${record.filename}`);
        
        // Update status
        record.status = 'downloaded';
        this.saveRecordHistory();
        this.renderHistoryList(); // Refresh the list to show updated status
      }
      
    } catch (error) {
      console.error('Download error:', error);
      this.showNotification(`❌ Lỗi tải xuống: ${error.message}`);
    }
  }
  
  async uploadRecord(recordId) {
    const record = this.pendingRecords.get(recordId);
    if (!record) return;
    
    try {
      await this.uploadRecordedVideo(record.blob, record.filename);
      
      // Update status
      record.status = 'uploaded';
      
      // Update history record status
      const historyRecord = this.recordHistory.find(r => r.id === recordId);
      if (historyRecord) {
        historyRecord.status = 'uploaded';
        this.saveRecordHistory();
      }
      
      // Re-render to show updated status
      this.renderDownloadList();
      this.renderHistoryList();
      
    } catch (error) {
      console.error('Upload error:', error);
      this.showNotification(`❌ Lỗi upload: ${error.message}`);
    }
  }
  
  removeFromDownloads(recordId) {
    if (confirm('Bạn có chắc muốn xóa video này khỏi danh sách tải xuống?')) {
      const record = this.pendingRecords.get(recordId);
      if (record && record.blob) {
        URL.revokeObjectURL(URL.createObjectURL(record.blob));
      }
      
      this.pendingRecords.delete(recordId);
      this.renderDownloadList();
      this.updateRecordCounters();
      this.showNotification('✅ Đã xóa khỏi danh sách tải xuống');
    }
  }
  
  playRecord(recordId) {
    const record = this.recordHistory.find(r => r.id === recordId);
    if (!record || !record.blobUrl) return;
    
    // Create a simple video player modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3>▶️ ${record.filename}</h3>
          <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <video controls style="width: 100%; max-height: 400px;" autoplay>
            <source src="${record.blobUrl}" type="video/webm">
            Trình duyệt không hỗ trợ video.
          </video>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Remove modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
  
  async redownloadRecord(recordId) {
    const record = this.recordHistory.find(r => r.id === recordId);
    if (!record || !record.blobUrl) return;
    
    try {
      // Convert blob URL back to blob
      const response = await fetch(record.blobUrl);
      const blob = await response.blob();
      
      // Save with picker
      const saved = await this.saveRecordWithPicker(blob, record.filename);
      
      if (saved) {
        this.showNotification(`✅ Đã tải lại: ${record.filename}`);
      }
    } catch (error) {
      console.error('Redownload error:', error);
      this.showNotification(`❌ Lỗi tải lại: ${error.message}`);
    }
  }
  
  deleteFromHistory(recordId) {
    if (confirm('Bạn có chắc muốn xóa video này khỏi lịch sử?')) {
      const recordIndex = this.recordHistory.findIndex(r => r.id === recordId);
      if (recordIndex >= 0) {
        const record = this.recordHistory[recordIndex];
        
        // Revoke blob URL to free memory
        if (record.blobUrl) {
          URL.revokeObjectURL(record.blobUrl);
        }
        
        // Remove from history
        this.recordHistory.splice(recordIndex, 1);
        this.saveRecordHistory();
        
        // Also remove from pending if exists
        this.pendingRecords.delete(recordId);
        
        // Re-render
        this.renderHistoryList();
        this.renderDownloadList();
        this.updateRecordCounters();
        
        this.showNotification('✅ Đã xóa khỏi lịch sử');
      }
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