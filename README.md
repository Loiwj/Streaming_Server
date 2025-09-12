# 🎯 Onxy VMS - Video Management System

A modern, web-based Video Management System built with WebRTC technology for real-time camera monitoring and recording.

## ✨ Features

- **Real-time Video Streaming**: WebRTC-based streaming for low latency
- **Multi-Camera Support**: Support for RTSP, WHEP, and HLS camera sources
- **Flexible Grid Layout**: 1x1, 2x2, 3x3, 4x4 camera grid layouts
- **Video Recording**: Record individual camera streams with auto-save
- **Snapshot Capture**: Take instant snapshots from any camera
- **Modern UI**: Dark-themed surveillance system interface
- **Camera Management**: Add, remove, and manage cameras easily
- **RTSP Integration**: Automatic RTSP to WHEP conversion via MediaMTX

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Windows/Linux/macOS
- Modern web browser (Chrome/Edge recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/onxy-vms.git
   cd onxy-vms
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env file with your settings
   ```

4. **Start all services**
   ```bash
   npm run dev:full
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📋 Available Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:backend` - Start backend API server
- `npm run dev:mediamtx` - Start MediaMTX media server
- `npm run dev:full` - Start all services concurrently
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🏗️ Project Structure

```
onxy-vms/
├── frontend/           # Frontend application
│   ├── index.html     # Main HTML file
│   ├── index.js       # Frontend JavaScript
│   └── index.css      # Styling
├── backend/           # Backend API server
│   └── server.js      # Express server
├── media-server/      # MediaMTX configuration
│   ├── mediamtx.exe   # MediaMTX binary
│   └── mediamtx.yml   # MediaMTX config
├── src/               # TypeScript source
│   └── index.ts       # WebRTC player library
└── package.json       # Dependencies and scripts
```

## 🎥 Camera Setup

### Adding RTSP Cameras

1. Click "Thêm Camera" button
2. Select "RTSP Stream" as connection type
3. Enter camera details:
   - **Name**: Camera identifier
   - **URL**: RTSP stream URL (e.g., `rtsp://192.168.1.100:554/stream`)
   - **Username/Password**: Camera credentials (optional)

### Adding WHEP Cameras

1. Click "Thêm Camera" button
2. Select "WHEP (WebRTC)" as connection type
3. Enter WHEP URL (e.g., `http://localhost:8889/cam1/whep`)

## 🎛️ Usage

### Grid Layout
- Use grid size buttons (1x1, 2x2, 3x3, 4x4) to change layout
- Click empty slots to assign cameras
- Drag cameras between slots (coming soon)

### Recording
- Click the record button (🔴) to start recording
- Click again to stop recording
- Videos are automatically saved with timestamp

### Snapshots
- Click the snapshot button (📷) to capture current frame
- Images are automatically downloaded as PNG files

## 🔧 Configuration

### MediaMTX Configuration

Edit `media-server/mediamtx.yml` for advanced MediaMTX settings:

```yaml
api: true
webrtc: true
rtsp: true
rtmp: true
hls: true
```

### Environment Variables

Copy `env.example` to `.env` and configure:

```env
PORT=3001
MEDIAMTX_CONFIG_PATH=./media-server/mediamtx.yml
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Development

### Frontend Development
```bash
npm run dev
```

### Backend Development
```bash
npm run dev:backend
```

### Full Stack Development
```bash
npm run dev:full
```

## 📦 Building for Production

```bash
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WebRTC Player](https://github.com/Eyevinn/webrtc-player) - WebRTC streaming library
- [MediaMTX](https://github.com/bluenviron/mediamtx) - Media server for RTSP conversion
- [Parcel](https://parceljs.org/) - Fast, zero-config build tool

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/onxy-vms/issues) page
2. Create a new issue with detailed description
3. Contact: your-email@example.com

---

**Onxy VMS** - Professional Video Management Made Simple 🎯