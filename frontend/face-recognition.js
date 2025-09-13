// Face Recognition Page JavaScript
class FaceRecognitionApp {
  constructor() {
    this.settings = {
      recognitionThreshold: 0.7,
      detectionConfidence: 0.5
    };
    this.activeCameraMonitors = new Map();
    this.currentEditingUserId = null;
    this.autoRefreshInterval = null;
    this.lastLogTimestamp = null;
    this.isAutoRefreshEnabled = true;
    
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Face Recognition App...');
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initialize UI
    await this.initializeUI();
    
    // Load settings
    this.loadSettings();
    
    console.log('✅ Face Recognition App initialized');
  }

  setupEventListeners() {
    // Settings
    document.getElementById('recognition-threshold').addEventListener('input', (e) => {
      document.getElementById('threshold-value').textContent = parseFloat(e.target.value).toFixed(2);
    });
    
    document.getElementById('detection-confidence').addEventListener('input', (e) => {
      document.getElementById('confidence-value').textContent = parseFloat(e.target.value).toFixed(2);
    });
    
    document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());

    // Monitoring
    document.getElementById('start-monitoring-btn').addEventListener('click', () => this.startMonitoring());
    document.getElementById('stop-monitoring-btn').addEventListener('click', () => this.stopMonitoring());

    // Face management
    document.getElementById('face-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.currentEditingUserId) {
        this.updateKnownFace(this.currentEditingUserId);
      } else {
        this.addKnownFace();
      }
    });
    
    document.getElementById('cancel-face-btn').addEventListener('click', () => this.clearFaceForm());

    // Logs and snapshots
    document.getElementById('load-logs-btn').addEventListener('click', () => this.loadDetectionLogs());
    document.getElementById('auto-refresh-toggle').addEventListener('click', () => this.toggleAutoRefresh());
    document.getElementById('load-snapshots-btn').addEventListener('click', () => this.loadSnapshots());
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.stopAutoRefreshLogs();
    });

    // Tabs
    document.querySelectorAll('.fr-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });
  }

  async initializeUI() {
    try {
      // Check system status
      await this.checkSystemStatus();
      
      // Load cameras
      await this.loadCameras();
      
      // Load known faces
      await this.loadKnownFaces();
      
      // Set today's date
      document.getElementById('logs-date').value = new Date().toISOString().split('T')[0];
      
    } catch (error) {
      console.error('Error initializing UI:', error);
      this.showNotification('❌ Failed to initialize system', 'error');
    }
  }

  async checkSystemStatus() {
    try {
      const response = await fetch('http://localhost:3001/api/face-recognition/status');
      const data = await response.json();
      
      const statusIndicator = document.getElementById('status-indicator');
      const statusText = document.getElementById('status-text');
      
      if (data.initialized) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = `Online - ${data.knownFaces} known faces`;
        
        // Sync monitoring state with backend
        if (data.activeMonitoring && data.activeMonitoring.length > 0) {
          console.log('🔄 Syncing monitoring state from backend:', data.activeMonitoring);
          this.syncMonitoringState(data.activeMonitoring);
        } else {
          // No active monitoring, ensure UI is in stopped state
          this.updateMonitoringUI(false);
        }
      } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'System not initialized';
        this.updateMonitoringUI(false);
      }
    } catch (error) {
      console.error('Error checking system status:', error);
      const statusIndicator = document.getElementById('status-indicator');
      const statusText = document.getElementById('status-text');
      statusIndicator.className = 'status-indicator offline';
      statusText.textContent = 'Connection error';
      this.updateMonitoringUI(false);
    }
  }

  syncMonitoringState(activeMonitoring) {
    // Update internal state
    activeMonitoring.forEach(cameraName => {
      this.activeCameraMonitors.set(cameraName, true); // We don't have the actual interval ID, but mark as active
    });
    
    // Update UI to show monitoring is active
    this.updateMonitoringUI(true, activeMonitoring);
  }

  updateMonitoringUI(isActive, activeCameras = []) {
    const startBtn = document.getElementById('start-monitoring-btn');
    const stopBtn = document.getElementById('stop-monitoring-btn');
    
    if (isActive) {
      startBtn.disabled = true;
      startBtn.textContent = '🎥 Monitoring Active';
      stopBtn.disabled = false;
      stopBtn.textContent = '⏹️ Stop Monitoring';
      
      this.showNotification(`🎥 Monitoring active on: ${activeCameras.join(', ')}`, 'success');
    } else {
      startBtn.disabled = false;
      startBtn.textContent = '▶️ Start Monitoring';
      stopBtn.disabled = true;
      stopBtn.textContent = '⏹️ Stop Monitoring';
    }
  }

  async loadCameras() {
    try {
      console.log('🔄 Loading cameras from API...');
      const response = await fetch('http://localhost:3001/api/cameras/paths');
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📊 API Response data:', data);
      
      const monitorSelect = document.getElementById('monitor-camera');
      const logsSelect = document.getElementById('logs-camera');
      
      if (!monitorSelect || !logsSelect) {
        throw new Error('Camera select elements not found in DOM');
      }
      
      // Clear existing options (keep first option)
      monitorSelect.innerHTML = '<option value="">Choose a camera...</option>';
      logsSelect.innerHTML = '<option value="">All Cameras</option>';
      
      if (data.cameras && data.cameras.length > 0) {
        console.log(`✅ Found ${data.cameras.length} cameras`);
        data.cameras.forEach(camera => {
          // Create readable name from path name
          const displayName = camera.pathName.charAt(0).toUpperCase() + camera.pathName.slice(1);
          
          const option1 = new Option(displayName, camera.pathName);
          const option2 = new Option(displayName, camera.pathName);
          monitorSelect.add(option1);
          logsSelect.add(option2);
          
          console.log(`📹 Added camera: ${displayName} (${camera.pathName})`);
        });
        this.showNotification(`✅ Loaded ${data.cameras.length} cameras`, 'success');
      } else {
        console.warn('⚠️ No cameras found in API response');
        this.showNotification('⚠️ No cameras found', 'warning');
      }
    } catch (error) {
      console.error('❌ Error loading cameras:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      });
      this.showNotification(`❌ Failed to load cameras: ${error.message}`, 'error');
    }
  }

  async loadKnownFaces() {
    try {
      const response = await fetch('http://localhost:3001/api/face-recognition/faces');
      const data = await response.json();
      
      this.renderKnownFacesList(data.faces || []);
      document.getElementById('faces-count').textContent = (data.faces || []).length;
      
    } catch (error) {
      console.error('Error loading known faces:', error);
      document.getElementById('known-faces-list').innerHTML = '<div class="error">❌ Failed to load known faces</div>';
    }
  }

  renderKnownFacesList(faces) {
    const container = document.getElementById('known-faces-list');
    
    if (faces.length === 0) {
      container.innerHTML = '<div class="empty-state">No known faces registered yet</div>';
      return;
    }
    
    container.innerHTML = faces.map(face => {
      // Handle both old format (string) and new format (object)
      const faceData = typeof face === 'string' ? { id: face, name: face } : face;
      
      return `
        <div class="known-face-item">
          <div class="face-info">
            <div class="face-name">${faceData.name}</div>
            ${faceData.department ? `<div class="face-detail"><span class="label">Department:</span> ${faceData.department}</div>` : ''}
            ${faceData.position ? `<div class="face-detail"><span class="label">Position:</span> ${faceData.position}</div>` : ''}
            ${faceData.email ? `<div class="face-detail"><span class="label">Email:</span> ${faceData.email}</div>` : ''}
            ${faceData.phone ? `<div class="face-detail"><span class="label">Phone:</span> ${faceData.phone}</div>` : ''}
            ${faceData.createdAt ? `<div class="face-dates">Added: ${new Date(faceData.createdAt).toLocaleDateString()}</div>` : ''}
          </div>
          <div class="face-actions">
            <button class="edit-btn" onclick="app.editKnownFace('${faceData.id}')">Edit</button>
            <button class="cancel-btn" onclick="app.removeKnownFace('${faceData.id}')">Remove</button>
          </div>
        </div>
      `;
    }).join('');
  }

  loadSettings() {
    const saved = localStorage.getItem('fr-settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
    
    document.getElementById('recognition-threshold').value = this.settings.recognitionThreshold;
    document.getElementById('detection-confidence').value = this.settings.detectionConfidence;
    document.getElementById('threshold-value').textContent = this.settings.recognitionThreshold.toFixed(2);
    document.getElementById('confidence-value').textContent = this.settings.detectionConfidence.toFixed(2);
  }

  async saveSettings() {
    this.settings.recognitionThreshold = parseFloat(document.getElementById('recognition-threshold').value);
    this.settings.detectionConfidence = parseFloat(document.getElementById('detection-confidence').value);
    
    try {
      // Save to backend
      const response = await fetch('http://localhost:3001/api/face-recognition/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings)
      });
      
      if (response.ok) {
        localStorage.setItem('fr-settings', JSON.stringify(this.settings));
        this.showNotification('✅ Settings saved successfully', 'success');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('❌ Failed to save settings', 'error');
    }
  }

  async startMonitoring() {
    const cameraName = document.getElementById('monitor-camera').value;
    const interval = parseInt(document.getElementById('monitor-interval').value) * 1000;
    
    if (!cameraName) {
      this.showNotification('❌ Please select a camera', 'error');
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/face-recognition/start/${cameraName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: interval })
      });
      
      if (response.ok) {
        // Update internal state
        this.activeCameraMonitors.set(cameraName, true);
        
        // Update UI
        this.updateMonitoringUI(true, [cameraName]);
        
        this.showNotification('✅ Monitoring started successfully', 'success');
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      this.showNotification('❌ Failed to start monitoring: ' + error.message, 'error');
    }
  }

  async stopMonitoring() {
    try {
      // If we have active cameras from backend state, stop them all
      const camerasToStop = Array.from(this.activeCameraMonitors.keys());
      
      if (camerasToStop.length === 0) {
        // Try to get from selected camera if no active cameras
        const selectedCamera = document.getElementById('monitor-camera').value;
        if (selectedCamera) {
          camerasToStop.push(selectedCamera);
        } else {
          this.showNotification('❌ No active monitoring to stop', 'error');
          return;
        }
      }
      
      console.log('🛑 Stopping monitoring for cameras:', camerasToStop);
      
      // Stop all active cameras
      for (const cameraName of camerasToStop) {
        const response = await fetch(`http://localhost:3001/api/face-recognition/stop/${cameraName}`, {
          method: 'POST'
        });
        
        if (response.ok) {
          this.activeCameraMonitors.delete(cameraName);
          console.log(`✅ Stopped monitoring for ${cameraName}`);
        } else {
          const error = await response.json();
          console.warn(`❌ Failed to stop monitoring for ${cameraName}:`, error);
        }
      }
      
      // Update UI
      this.updateMonitoringUI(false);
      
      this.showNotification(`✅ Monitoring stopped for ${camerasToStop.length} camera(s)`, 'success');
      
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      this.showNotification('❌ Failed to stop monitoring: ' + error.message, 'error');
    }
  }

  async addKnownFace() {
    const formData = this.collectFormData();
    if (!formData) return;
    
    try {
      const response = await fetch('http://localhost:3001/api/face-recognition/faces', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        this.showNotification('✅ Known face added successfully', 'success');
        this.clearFaceForm();
        await this.loadKnownFaces();
        await this.checkSystemStatus();
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }
    } catch (error) {
      console.error('Error adding known face:', error);
      this.showNotification('❌ Failed to add known face: ' + error.message, 'error');
    }
  }

  async editKnownFace(userId) {
    try {
      const response = await fetch(`http://localhost:3001/api/face-recognition/faces/${userId}`);
      if (!response.ok) throw new Error('Failed to get user details');
      
      const result = await response.json();
      const user = result.user;
      
      // Populate form
      document.getElementById('face-name').value = user.name || '';
      document.getElementById('face-department').value = user.department || '';
      document.getElementById('face-position').value = user.position || '';
      document.getElementById('face-email').value = user.email || '';
      document.getElementById('face-phone').value = user.phone || '';
      
      // Switch to edit mode
      this.currentEditingUserId = userId;
      document.getElementById('add-face-btn').textContent = 'Update User';
      document.getElementById('cancel-face-btn').style.display = 'inline-block';
      
      // Remove required from image input (not needed for update)
      document.getElementById('face-image').required = false;
      
      // Scroll to form
      document.querySelector('.face-form-container').scrollIntoView({ behavior: 'smooth' });
      
    } catch (error) {
      console.error('Error loading user for edit:', error);
      this.showNotification('❌ Failed to load user details: ' + error.message, 'error');
    }
  }

  async updateKnownFace(userId) {
    const name = document.getElementById('face-name').value.trim();
    const department = document.getElementById('face-department').value.trim();
    const position = document.getElementById('face-position').value.trim();
    const email = document.getElementById('face-email').value.trim();
    const phone = document.getElementById('face-phone').value.trim();
    
    if (!name) {
      this.showNotification('❌ Name is required', 'error');
      return;
    }
    
    try {
      const updateData = { name, department, position, email, phone };
      
      const response = await fetch(`http://localhost:3001/api/face-recognition/faces/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        this.showNotification('✅ User updated successfully', 'success');
        this.clearFaceForm();
        await this.loadKnownFaces();
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      this.showNotification('❌ Failed to update user: ' + error.message, 'error');
    }
  }

  async removeKnownFace(userId) {
    if (!confirm('Are you sure you want to remove this person from known faces?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/face-recognition/faces/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.showNotification('✅ Known face removed successfully', 'success');
        await this.loadKnownFaces();
        await this.checkSystemStatus();
      } else {
        const error = await response.json();
        throw new Error(error.details || error.error);
      }
    } catch (error) {
      console.error('Error removing known face:', error);
      this.showNotification('❌ Failed to remove known face: ' + error.message, 'error');
    }
  }

  collectFormData() {
    const name = document.getElementById('face-name').value.trim();
    const department = document.getElementById('face-department').value.trim();
    const position = document.getElementById('face-position').value.trim();
    const email = document.getElementById('face-email').value.trim();
    const phone = document.getElementById('face-phone').value.trim();
    const imageFile = document.getElementById('face-image').files[0];
    
    if (!name || (!imageFile && !this.currentEditingUserId)) {
      this.showNotification('❌ Please enter a name and select an image', 'error');
      return null;
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('department', department);
    formData.append('position', position);
    formData.append('email', email);
    formData.append('phone', phone);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return formData;
  }

  clearFaceForm() {
    document.getElementById('face-form').reset();
    this.currentEditingUserId = null;
    document.getElementById('add-face-btn').textContent = 'Add Known Face';
    document.getElementById('cancel-face-btn').style.display = 'none';
    document.getElementById('face-image').required = true;
  }

  async loadDetectionLogs() {
    const camera = document.getElementById('logs-camera').value;
    const date = document.getElementById('logs-date').value;
    
    if (!date) {
      this.showNotification('❌ Please select a date', 'error');
      return;
    }
    
    try {
      let url = `http://localhost:3001/api/face-recognition/logs/${camera || 'all'}/${date}`;
      const response = await fetch(url);
      const data = await response.json();
      
      this.renderDetectionLogs(data.logs || []);
      
      // Start auto-refresh if enabled
      if (this.isAutoRefreshEnabled) {
        this.startAutoRefreshLogs();
      }
    } catch (error) {
      console.error('Error loading logs:', error);
      document.getElementById('detection-logs').innerHTML = '<div class="error">❌ Failed to load logs</div>';
    }
  }

  startAutoRefreshLogs() {
    // Clear existing interval
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }
    
    // Set up auto-refresh every 3 seconds
    this.autoRefreshInterval = setInterval(async () => {
      if (this.isAutoRefreshEnabled) {
        const camera = document.getElementById('logs-camera').value;
        const date = document.getElementById('logs-date').value;
        
        if (date) {
          try {
            let url = `http://localhost:3001/api/face-recognition/logs/${camera || 'all'}/${date}`;
            const response = await fetch(url);
            const data = await response.json();
            
            // Only update if there are new logs
            const logs = data.logs || [];
            if (logs.length > 0) {
              const latestTimestamp = logs[0]?.timestamp;
              
              if (!this.lastLogTimestamp) {
                // First time loading
                this.renderDetectionLogs(logs);
                this.lastLogTimestamp = latestTimestamp;
              } else if (latestTimestamp > this.lastLogTimestamp) {
                // New logs found
                const newLogsCount = logs.filter(log => 
                  log.timestamp > this.lastLogTimestamp
                ).length;
                
                this.renderDetectionLogs(logs);
                this.lastLogTimestamp = latestTimestamp;
                
                if (newLogsCount > 0) {
                  this.showNotification(`🔄 ${newLogsCount} new detection(s) found!`, 'success');
                }
              }
            }
          } catch (error) {
            console.warn('Auto-refresh failed:', error);
          }
        }
      }
    }, 3000); // Refresh every 3 seconds
  }

  stopAutoRefreshLogs() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  toggleAutoRefresh() {
    this.isAutoRefreshEnabled = !this.isAutoRefreshEnabled;
    
    const toggleBtn = document.getElementById('auto-refresh-toggle');
    const statusIndicator = document.getElementById('auto-refresh-status');
    
    if (this.isAutoRefreshEnabled) {
      toggleBtn.textContent = '⏸️ Pause Auto-Refresh';
      toggleBtn.classList.remove('btn-success');
      toggleBtn.classList.add('btn-warning');
      statusIndicator.textContent = '🔄 Auto-refresh: ON';
      statusIndicator.classList.remove('status-off');
      statusIndicator.classList.add('status-on');
      
      // Start auto-refresh if logs are already loaded
      const logsContainer = document.getElementById('detection-logs');
      if (logsContainer.children.length > 0) {
        this.startAutoRefreshLogs();
      }
    } else {
      toggleBtn.textContent = '▶️ Start Auto-Refresh';
      toggleBtn.classList.remove('btn-warning');
      toggleBtn.classList.add('btn-success');
      statusIndicator.textContent = '⏸️ Auto-refresh: OFF';
      statusIndicator.classList.remove('status-on');
      statusIndicator.classList.add('status-off');
      
      this.stopAutoRefreshLogs();
    }
  }

  renderDetectionLogs(logs) {
    const container = document.getElementById('detection-logs');
    
    if (logs.length === 0) {
      container.innerHTML = '<div class="empty-state">No detection logs found for the selected date</div>';
      return;
    }
    
    container.innerHTML = logs.map(log => {
      // Handle both old format and new format
      const identity = typeof log.identity === 'string' ? log.identity : (log.identity?.name || 'Unknown');
      const confidence = typeof log.confidence === 'number' ? log.confidence : (log.identity?.confidence || 0);
      
      // Check if this is a new log
      const isNew = this.lastLogTimestamp && log.timestamp > this.lastLogTimestamp;
      
      return `
        <div class="log-entry ${identity === 'Unknown' ? 'unknown' : 'recognized'} ${isNew ? 'new-log' : ''}">
          <div class="log-info">
            <strong>${identity}</strong>
            <small>${log.camera} - ${new Date(log.timestamp).toLocaleString()}</small>
            ${isNew ? '<span class="new-badge">NEW</span>' : ''}
          </div>
          <div class="log-confidence">
            ${(confidence * 100).toFixed(1)}%
          </div>
        </div>
      `;
    }).join('');
    
    // Scroll to top to show new logs
    container.scrollTop = 0;
  }

  async loadSnapshots() {
    try {
      const response = await fetch('http://localhost:3001/api/face-recognition/snapshots');
      const data = await response.json();
      
      this.renderSnapshots(data.snapshots || []);
    } catch (error) {
      console.error('Error loading snapshots:', error);
      document.getElementById('snapshots-gallery').innerHTML = '<div class="error">❌ Failed to load snapshots</div>';
    }
  }

  renderSnapshots(snapshots) {
    const container = document.getElementById('snapshots-gallery');
    
    if (snapshots.length === 0) {
      container.innerHTML = '<div class="empty-state">No snapshots available</div>';
      return;
    }
    
    container.innerHTML = snapshots.map(snapshot => `
      <div class="snapshot-item">
        <img src="http://localhost:3001/api/face-recognition/snapshots/${snapshot.filename}" 
             alt="Snapshot" loading="lazy">
        <div class="snapshot-info">
          <div class="name">${snapshot.name || 'Unknown'}</div>
          <div class="time">${new Date(snapshot.timestamp).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.fr-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.fr-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FaceRecognitionApp();
});
