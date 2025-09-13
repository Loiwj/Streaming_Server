# Face Recognition System

Hệ thống nhận diện khuôn mặt sử dụng ONNX models với khả năng phát hiện, nhận diện và phân tích khuôn mặt.

## 🚀 Cài đặt nhanh

### 1. Tải các model cần thiết
```bash
# Chạy script tự động tải model (Windows)
download-models.bat

# Hoặc tải thủ công từ các link bên dưới
```

### 2. Khởi động hệ thống
```bash
npm run dev:full
```

## 📁 Cấu trúc thư mục

```
face-recognition/
├── models/                 # Thư mục chứa các file model (không được commit)
│   ├── 2d106det.onnx      # Face Detection Model (~5MB)
│   ├── det_10g.onnx       # Face Detection Model (~17MB)
│   ├── genderage.onnx     # Gender/Age Detection (~1MB)
│   ├── 1k3d68.onnx        # 3D Face Model (~144MB)
│   └── w600k_r50.onnx     # Face Recognition Model (~174MB)
├── known_faces.json       # Database khuôn mặt đã biết
├── FaceRecognitionService.js  # Service chính
├── download-models.bat    # Script tải model tự động
└── README.md             # File này
```

## 🔧 Các model được sử dụng

| Model | Kích thước | Chức năng | Nguồn |
|-------|------------|-----------|-------|
| `2d106det.onnx` | ~5MB | Phát hiện khuôn mặt 2D | ONNX Models |
| `det_10g.onnx` | ~17MB | Phát hiện khuôn mặt nâng cao | ONNX Models |
| `genderage.onnx` | ~1MB | Phân tích giới tính/tuổi | ONNX Models |
| `1k3d68.onnx` | ~144MB | Mô hình khuôn mặt 3D | ONNX Models |
| `w600k_r50.onnx` | ~174MB | Nhận diện khuôn mặt | ONNX Models |

**Tổng kích thước: ~340MB**

## 📥 Tải model thủ công

Nếu script tự động không hoạt động, bạn có thể tải thủ công:

### Option 1: Sử dụng wget/curl
```bash
# Tạo thư mục models
mkdir models

# Tải từng model
wget -O models/2d106det.onnx "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-640x640.onnx"
wget -O models/det_10g.onnx "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-320x320.onnx"
wget -O models/genderage.onnx "https://github.com/onnx/models/raw/main/vision/body_analysis/age_gender/models/age_net.onnx"
wget -O models/1k3d68.onnx "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-640x640.onnx"
wget -O models/w600k_r50.onnx "https://github.com/onnx/models/raw/main/vision/body_analysis/ultraface/models/ultraface-320x320.onnx"
```

### Option 2: Tải từ Google Drive/Dropbox
1. Tạo file ZIP chứa tất cả models
2. Upload lên Google Drive hoặc Dropbox
3. Chia sẻ link public
4. Tải về và giải nén vào thư mục `models/`

## ⚠️ Lưu ý quan trọng

- **Models không được commit vào Git** do kích thước quá lớn (~340MB)
- Thư mục `models/` đã được thêm vào `.gitignore`
- Khi clone project, cần chạy `download-models.bat` để tải models
- Models được lưu local và không ảnh hưởng đến repository size

## 🐛 Troubleshooting

### Lỗi "Model not found"
```bash
# Kiểm tra thư mục models
ls models/

# Nếu trống, chạy lại script tải
download-models.bat
```

### Lỗi download
```bash
# Kiểm tra kết nối internet
ping google.com

# Thử tải thủ công từ link trong script
```

### Performance issues
- Đảm bảo có đủ RAM (tối thiểu 4GB)
- Sử dụng GPU nếu có thể
- Giảm số lượng camera đồng thời

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy:
1. Kiểm tra log trong console
2. Đảm bảo đã tải đầy đủ models
3. Kiểm tra kết nối camera
4. Tạo issue trên GitHub repository
