# File Upload và Quản lý File với Multer

Hệ thống đã được tích hợp thư viện **Multer** để hỗ trợ tải lên và quản lý file video và hình ảnh.

## ✨ Tính năng

### 📁 Tải File lên
- **Drag & Drop**: Kéo thả file trực tiếp vào khu vực upload
- **Chọn file**: Click để mở hộp thoại chọn file
- **Tải từng file**: Upload file một cách tuần tự
- **Tải nhiều file**: Upload tối đa 10 file cùng lúc
- **Hỗ trợ định dạng**:
  - **Video**: MP4, AVI, MOV, WMV, FLV, WebM, MKV
  - **Hình ảnh**: JPG, JPEG, PNG, GIF

### 🗂️ Quản lý File
- **Xem danh sách**: Hiển thị tất cả file đã tải lên
- **Lọc theo loại**: Video, Hình ảnh, hoặc Tất cả
- **Hai chế độ xem**: Lưới (Grid) và Danh sách (List)
- **Preview**: Xem trước hình ảnh và video
- **Thao tác file**: Xem, Tải về, Xóa

## 🚀 Cách sử dụng

### 1. Tải File lên
1. Nhấn nút **"📁 Tải File"** trên sidebar
2. Kéo thả file vào khu vực upload hoặc click để chọn
3. Chọn chế độ upload (từng file hoặc nhiều file)
4. Nhấn **"Bắt đầu tải lên"**

### 2. Quản lý File
1. Nhấn nút **"🗂️ Quản lý File"** trên sidebar
2. Sử dụng các nút lọc để chọn loại file
3. Chuyển đổi giữa chế độ xem Lưới và Danh sách
4. Sử dụng các nút thao tác trên mỗi file

## 🔧 Cấu hình

### Thư mục lưu trữ
- **Videos**: `uploads/videos/`
- **Images**: `uploads/images/`

### Giới hạn file
- **Kích thước tối đa**: 100MB mỗi file
- **Số lượng tối đa**: 10 file khi upload cùng lúc

### Tên file
File sẽ được đặt tên tự động theo format:
```
[tên-gốc]-[timestamp]-[random-number].[extension]
```

## 🛠️ API Endpoints

### Upload
- `POST /api/upload/single` - Tải lên 1 file
- `POST /api/upload/multiple` - Tải lên nhiều file

### Quản lý
- `GET /api/files` - Lấy danh sách tất cả file
- `GET /api/files/videos` - Lấy danh sách video
- `GET /api/files/images` - Lấy danh sách hình ảnh
- `DELETE /api/files/:type/:filename` - Xóa file

### Truy cập file
- `GET /uploads/videos/:filename` - Truy cập video
- `GET /uploads/images/:filename` - Truy cập hình ảnh

## 🔒 Bảo mật

- Chỉ cho phép các định dạng file được định nghĩa trước
- Kiểm tra MIME type và extension
- Giới hạn kích thước file
- Tên file được tạo tự động để tránh conflict

## 📱 Giao diện

### Tải File
- Khu vực drag & drop trực quan
- Thanh progress bar hiển thị tiến độ
- Thông báo kết quả upload

### Quản lý File
- Grid view: Hiển thị preview và thông tin cơ bản
- List view: Hiển thị chi tiết đầy đủ
- Các nút thao tác rõ ràng

## 🚨 Lưu ý

1. **Khởi động server**: Đảm bảo backend server đang chạy trên port 3001
2. **Thư mục uploads**: Sẽ được tạo tự động khi khởi động
3. **Trình duyệt**: Hỗ trợ tốt nhất trên Chrome, Firefox, Edge hiện đại
4. **Kết nối mạng**: Cần kết nối internet để tải file lên server

Hệ thống file upload đã sẵn sàng sử dụng! 🎉
