// Settings Page JavaScript
class SettingsManager {
    constructor() {
        this.settings = {
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
        
        this.motionDetectionActive = false;
        this.recordingActive = false;
        this.activeRecordings = new Map();
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Settings Manager...');
        
        this.setupEventListeners();
        this.loadSettings();
        this.updateUI();
        this.checkSystemStatus();
        
        // Load storage stats
        this.loadStorageStats();
        
        console.log('✅ Settings Manager initialized');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Recording mode changes
        document.querySelectorAll('input[name="recording-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.onRecordingModeChange(e.target.value));
        });

        // Slider updates
        document.getElementById('motion-sensitivity').addEventListener('input', (e) => {
            document.getElementById('sensitivity-value').textContent = e.target.value + '%';
        });

        document.getElementById('motion-threshold').addEventListener('input', (e) => {
            document.getElementById('threshold-value').textContent = e.target.value + '%';
        });

        document.getElementById('cpu-usage').addEventListener('input', (e) => {
            document.getElementById('cpu-value').textContent = e.target.value + '%';
        });

        // Motion zone controls
        document.getElementById('add-zone-btn').addEventListener('click', () => this.addMotionZone());
        document.getElementById('clear-zones-btn').addEventListener('click', () => this.clearMotionZones());

        // Action buttons
        document.getElementById('save-settings-btn').addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings-btn').addEventListener('click', () => this.resetSettings());
        document.getElementById('test-settings-btn').addEventListener('click', () => this.testSettings());

        // Browse path button
        document.getElementById('browse-path-btn').addEventListener('click', () => this.browseStoragePath());
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    onRecordingModeChange(mode) {
        console.log('📹 Recording mode changed to:', mode);
        
        // Update UI based on mode
        const motionSettings = document.getElementById('motion-tab');
        const motionTab = document.querySelector('[data-tab="motion"]');
        
        if (mode === 'motion') {
            motionTab.style.display = 'block';
            this.showNotification('🎯 Motion detection mode enabled. Configure motion settings in the Motion tab.', 'success');
        } else {
            // Hide motion-specific settings for other modes
            this.showNotification(`📹 Recording mode set to: ${mode}`, 'success');
        }
    }

    addMotionZone() {
        const zoneName = prompt('Enter zone name:');
        if (!zoneName) return;

        const newZone = {
            id: Date.now(),
            name: zoneName,
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: 20,
            height: 20,
            enabled: true
        };

        this.settings.motion.zones.push(newZone);
        this.updateMotionZonesList();
        this.showNotification(`✅ Added motion zone: ${zoneName}`, 'success');
    }

    clearMotionZones() {
        if (confirm('Are you sure you want to clear all motion zones?')) {
            this.settings.motion.zones = [];
            this.updateMotionZonesList();
            this.showNotification('🗑️ All motion zones cleared', 'success');
        }
    }

    updateMotionZonesList() {
        const container = document.getElementById('motion-zones-list');
        
        if (this.settings.motion.zones.length === 0) {
            container.innerHTML = '<div class="empty-state">No motion zones configured</div>';
            return;
        }

        container.innerHTML = this.settings.motion.zones.map(zone => `
            <div class="zone-item">
                <div class="zone-info">
                    <div class="zone-name">${zone.name}</div>
                    <div class="zone-coords">Position: ${zone.x.toFixed(1)}%, ${zone.y.toFixed(1)}% | Size: ${zone.width}% x ${zone.height}%</div>
                </div>
                <div class="zone-controls">
                    <button class="btn-secondary" onclick="settingsManager.editMotionZone(${zone.id})">Edit</button>
                    <button class="btn-secondary" onclick="settingsManager.deleteMotionZone(${zone.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    editMotionZone(zoneId) {
        const zone = this.settings.motion.zones.find(z => z.id === zoneId);
        if (!zone) return;

        const newName = prompt('Enter new zone name:', zone.name);
        if (newName && newName !== zone.name) {
            zone.name = newName;
            this.updateMotionZonesList();
            this.showNotification(`✅ Updated zone: ${newName}`, 'success');
        }
    }

    deleteMotionZone(zoneId) {
        const zone = this.settings.motion.zones.find(z => z.id === zoneId);
        if (!zone) return;

        if (confirm(`Delete zone "${zone.name}"?`)) {
            this.settings.motion.zones = this.settings.motion.zones.filter(z => z.id !== zoneId);
            this.updateMotionZonesList();
            this.showNotification(`🗑️ Deleted zone: ${zone.name}`, 'success');
        }
    }

    async saveSettings() {
        try {
            // Collect all settings from UI
            this.collectSettingsFromUI();
            
            // Save to backend
            const response = await fetch('http://localhost:3001/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.settings)
            });

            if (response.ok) {
                this.showNotification('✅ Settings saved successfully!', 'success');
                
                // Apply motion detection if enabled
                if (this.settings.recording.mode === 'motion') {
                    await this.startMotionDetection();
                } else {
                    await this.stopMotionDetection();
                }
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('❌ Failed to save settings: ' + error.message, 'error');
        }
    }

    collectSettingsFromUI() {
        // Recording settings
        const recordingMode = document.querySelector('input[name="recording-mode"]:checked').value;
        this.settings.recording.mode = recordingMode;
        this.settings.recording.quality = document.getElementById('video-quality').value;
        this.settings.recording.frameRate = parseInt(document.getElementById('frame-rate').value);
        this.settings.recording.maxRecordingTime = parseInt(document.getElementById('max-recording-time').value);
        this.settings.recording.preMotionBuffer = parseInt(document.getElementById('pre-motion-buffer').value);
        this.settings.recording.postMotionBuffer = parseInt(document.getElementById('post-motion-buffer').value);

        // Motion settings
        this.settings.motion.sensitivity = parseInt(document.getElementById('motion-sensitivity').value);
        this.settings.motion.threshold = parseInt(document.getElementById('motion-threshold').value);
        this.settings.motion.ignoreSmallMovements = document.getElementById('ignore-small-movements').checked;
        this.settings.motion.ignoreShadows = document.getElementById('ignore-shadows').checked;
        this.settings.motion.ignoreWeather = document.getElementById('ignore-weather').checked;

        // Storage settings
        this.settings.storage.path = document.getElementById('storage-path').value;
        this.settings.storage.maxSize = parseInt(document.getElementById('max-storage-size').value);
        this.settings.storage.autoDeleteDays = parseInt(document.getElementById('auto-delete-days').value);
        this.settings.storage.autoCleanup = document.getElementById('auto-cleanup').checked;

        // System settings
        this.settings.system.cpuUsage = parseInt(document.getElementById('cpu-usage').value);
        this.settings.system.memoryUsage = parseInt(document.getElementById('memory-usage').value);
        this.settings.system.streamQuality = document.getElementById('stream-quality').value;
        this.settings.system.maxConnections = parseInt(document.getElementById('max-connections').value);
        this.settings.system.enableAuth = document.getElementById('enable-auth').checked;
        this.settings.system.enableSSL = document.getElementById('enable-ssl').checked;
    }

    updateUI() {
        // Update recording mode
        document.querySelector(`input[name="recording-mode"][value="${this.settings.recording.mode}"]`).checked = true;

        // Update form values
        document.getElementById('video-quality').value = this.settings.recording.quality;
        document.getElementById('frame-rate').value = this.settings.recording.frameRate;
        document.getElementById('max-recording-time').value = this.settings.recording.maxRecordingTime;
        document.getElementById('pre-motion-buffer').value = this.settings.recording.preMotionBuffer;
        document.getElementById('post-motion-buffer').value = this.settings.recording.postMotionBuffer;

        // Update motion settings
        document.getElementById('motion-sensitivity').value = this.settings.motion.sensitivity;
        document.getElementById('sensitivity-value').textContent = this.settings.motion.sensitivity + '%';
        document.getElementById('motion-threshold').value = this.settings.motion.threshold;
        document.getElementById('threshold-value').textContent = this.settings.motion.threshold + '%';
        document.getElementById('ignore-small-movements').checked = this.settings.motion.ignoreSmallMovements;
        document.getElementById('ignore-shadows').checked = this.settings.motion.ignoreShadows;
        document.getElementById('ignore-weather').checked = this.settings.motion.ignoreWeather;

        // Update storage settings
        document.getElementById('storage-path').value = this.settings.storage.path;
        document.getElementById('max-storage-size').value = this.settings.storage.maxSize;
        document.getElementById('auto-delete-days').value = this.settings.storage.autoDeleteDays;
        document.getElementById('auto-cleanup').checked = this.settings.storage.autoCleanup;

        // Update system settings
        document.getElementById('cpu-usage').value = this.settings.system.cpuUsage;
        document.getElementById('cpu-value').textContent = this.settings.system.cpuUsage + '%';
        document.getElementById('memory-usage').value = this.settings.system.memoryUsage;
        document.getElementById('stream-quality').value = this.settings.system.streamQuality;
        document.getElementById('max-connections').value = this.settings.system.maxConnections;
        document.getElementById('enable-auth').checked = this.settings.system.enableAuth;
        document.getElementById('enable-ssl').checked = this.settings.system.enableSSL;

        // Update motion zones
        this.updateMotionZonesList();
    }

    async loadSettings() {
        try {
            const response = await fetch('http://localhost:3001/api/settings');
            if (response.ok) {
                const data = await response.json();
                this.settings = { ...this.settings, ...data };
                this.updateUI();
            }
        } catch (error) {
            console.warn('Could not load settings from server, using defaults:', error);
        }
    }

    async startMotionDetection() {
        try {
            const response = await fetch('http://localhost:3001/api/motion-detection/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sensitivity: this.settings.motion.sensitivity,
                    threshold: this.settings.motion.threshold,
                    zones: this.settings.motion.zones,
                    recordingSettings: this.settings.recording
                })
            });

            if (response.ok) {
                this.motionDetectionActive = true;
                this.showNotification('🎯 Motion detection started!', 'success');
            } else {
                throw new Error('Failed to start motion detection');
            }
        } catch (error) {
            console.error('Error starting motion detection:', error);
            this.showNotification('❌ Failed to start motion detection: ' + error.message, 'error');
        }
    }

    async stopMotionDetection() {
        try {
            const response = await fetch('http://localhost:3001/api/motion-detection/stop', {
                method: 'POST'
            });

            if (response.ok) {
                this.motionDetectionActive = false;
                this.showNotification('⏹️ Motion detection stopped', 'success');
            }
        } catch (error) {
            console.error('Error stopping motion detection:', error);
        }
    }

    async loadStorageStats() {
        try {
            const response = await fetch('http://localhost:3001/api/storage/stats');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('used-storage').textContent = stats.used + ' GB';
                document.getElementById('free-storage').textContent = stats.free + ' GB';
                document.getElementById('recording-count').textContent = stats.recordingCount;
            }
        } catch (error) {
            console.warn('Could not load storage stats:', error);
        }
    }

    async checkSystemStatus() {
        try {
            const response = await fetch('http://localhost:3001/api/status');
            const status = await response.json();
            
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            if (status.online) {
                statusIndicator.className = 'status-indicator online';
                statusText.textContent = 'Hệ thống hoạt động bình thường';
            } else {
                statusIndicator.className = 'status-indicator offline';
                statusText.textContent = 'Hệ thống offline';
            }
        } catch (error) {
            console.error('Error checking system status:', error);
            const statusIndicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Lỗi kết nối';
        }
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            // Reset to default settings
            this.settings = {
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
            
            this.updateUI();
            this.showNotification('🔄 Settings reset to defaults', 'success');
        }
    }

    async testSettings() {
        this.showNotification('🧪 Testing settings...', 'warning');
        
        try {
            // Test motion detection
            if (this.settings.recording.mode === 'motion') {
                await this.startMotionDetection();
                setTimeout(() => this.stopMotionDetection(), 5000);
            }
            
            // Test storage
            await this.loadStorageStats();
            
            this.showNotification('✅ Settings test completed successfully!', 'success');
        } catch (error) {
            console.error('Settings test failed:', error);
            this.showNotification('❌ Settings test failed: ' + error.message, 'error');
        }
    }

    browseStoragePath() {
        // In a real implementation, this would open a file dialog
        const newPath = prompt('Enter storage path:', this.settings.storage.path);
        if (newPath) {
            document.getElementById('storage-path').value = newPath;
            this.showNotification('📁 Storage path updated', 'success');
        }
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('status-messages');
        const notification = document.createElement('div');
        notification.className = `status-message ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize settings manager when page loads
let settingsManager;
document.addEventListener('DOMContentLoaded', () => {
    settingsManager = new SettingsManager();
});
