# 📹 RTSP Camera Integration với MediaMTX

## 🎯 **Tính năng mới:**
- **Tự động thêm RTSP camera** vào MediaMTX config
- **Convert RTSP → WHEP** để phát trên WebRTC
- **Tự động xóa** camera khỏi config khi delete
- **Quản lý credentials** (username/password) cho RTSP

---

## ⚙️ **Setup & Cài đặt:**

### 1. **Install Dependencies:**
```bash
npm install
```

### 2. **Start Full System:**
```bash
# Chạy cả backend + frontend
npm run dev:full

# Hoặc chạy riêng lẻ:
npm run dev:backend  # Backend server (port 3001)
npm run dev          # Frontend (port 3000)
```

### 3. **Start MediaMTX:**
```bash
cd media-server
./mediamtx.exe
```

---

## 🔄 **Workflow khi thêm RTSP Camera:**

### **Frontend → Backend → MediaMTX:**
```
1. User nhập RTSP URL trong UI
2. Frontend gọi API: POST /api/cameras/rtsp
3. Backend tự động:
   - Tạo unique path name (vd: "camera1", "office2")
   - Thêm vào mediamtx.yml:
     ```yaml
     paths:
       camera1:
         source: rtsp://user:pass@192.168.1.10:554/stream
         sourceOnDemand: false
         rtspTransport: tcp
     ```
   - Return WHEP URL: ws://localhost:8889/camera1/whep
4. Frontend lưu camera với WHEP URL
5. Video player connect qua WebRTC
```

---

## 🗑️ **Workflow khi xóa RTSP Camera:**

### **Frontend → Backend → MediaMTX:**
```
1. User click xóa camera
2. Frontend gọi API: DELETE /api/cameras/{pathName}
3. Backend tự động:
   - Xóa path khỏi mediamtx.yml
   - MediaMTX auto-reload config
4. Frontend xóa camera khỏi UI
```

---

## 📡 **API Endpoints:**

### **POST /api/cameras/rtsp**
```javascript
// Request:
{
  "name": "Camera Office",
  "rtspUrl": "rtsp://admin:password@192.168.1.10:554/stream"
}

// Response:
{
  "success": true,
  "pathName": "cameraoffice",
  "whepUrl": "ws://localhost:8889/cameraoffice/whep",
  "message": "RTSP camera added to MediaMTX successfully"
}
```

### **DELETE /api/cameras/{pathName}**
```javascript
// Response:
{
  "success": true,
  "message": "Camera path 'cameraoffice' removed from MediaMTX successfully"
}
```

### **GET /api/cameras/paths**
```javascript
// Response:
{
  "cameras": [
    {
      "pathName": "cam1",
      "source": "rtsp://admin:@192.168.1.11:554/stream2",
      "whepUrl": "ws://localhost:8889/cam1/whep"
    }
  ]
}
```

---

## 🏗️ **Cấu trúc File:**

```
streaming-server/
├── backend/
│   └── server.js           # Express server quản lý MediaMTX
├── media-server/
│   ├── mediamtx.exe
│   └── mediamtx.yml        # Auto-updated config
├── frontend/
│   ├── index.html
│   └── index.js            # Camera management UI
└── package.json
```

---

## 🎮 **Sử dụng:**

### **1. Thêm RTSP Camera:**
1. Click **"Thêm Camera"**
2. Chọn type: **"RTSP"**
3. Nhập:
   - **Tên**: "Camera Office"
   - **URL**: "rtsp://192.168.1.10:554/stream"
   - **Username**: "admin" *(optional)*
   - **Password**: "password" *(optional)*
4. Click **"Lưu"**
5. ✅ Camera tự động được thêm vào MediaMTX config

### **2. Xóa RTSP Camera:**
1. Click **"Danh sách"** → Tìm camera RTSP
2. Click **"🗑️ Xóa"**
3. Confirm deletion
4. ✅ Camera tự động bị xóa khỏi MediaMTX config

---

## 🔧 **MediaMTX Config Example:**

### **Trước khi thêm:**
```yaml
api: yes
apiAddress: 0.0.0.0:9997

webrtc: yes
webrtcAddress: 0.0.0.0:8889

paths:
  cam1:
    source: rtsp://admin:@192.168.1.11:554/stream2
```

### **Sau khi thêm "Camera Office":**
```yaml
api: yes
apiAddress: 0.0.0.0:9997

webrtc: yes
webrtcAddress: 0.0.0.0:8889

paths:
  cam1:
    source: rtsp://admin:@192.168.1.11:554/stream2
  cameraoffice:          # ← Auto-added
    source: rtsp://admin:password@192.168.1.10:554/stream
    sourceOnDemand: false
    rtspTransport: tcp
```

---

## ⚡ **Ports:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MediaMTX WebRTC**: ws://localhost:8889
- **MediaMTX API**: http://localhost:9997

---

## 🚨 **Troubleshooting:**

### **Backend không kết nối được:**
```bash
# Check backend server
curl http://localhost:3001/api/health

# Expected response:
{"status":"OK","message":"Camera management server is running"}
```

### **MediaMTX config không update:**
- Kiểm tra file permissions của `mediamtx.yml`
- Restart MediaMTX sau khi thay đổi config
- Check backend logs cho error messages

### **RTSP stream không hoạt động:**
- Verify RTSP URL có thể access được
- Check credentials (username/password)
- Test RTSP URL bằng VLC hoặc ffplay

---

**🎉 Bây giờ bạn có thể thêm/xóa RTSP cameras và chúng sẽ tự động được cấu hình trong MediaMTX!**
