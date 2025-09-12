# 🎥 Cài đặt Record Video - Chọn nơi lưu trữ

Hệ thống đã được cải thiện để cho phép bạn **chọn nơi lưu trữ video record** thay vì chỉ tải về thư mục Downloads mặc định.

## ✨ Tính năng mới

### 📁 3 Tùy chọn lưu trữ video record:

1. **📥 Tải về thư mục Downloads** (mặc định)
   - Video sẽ được tải xuống thư mục Downloads của trình duyệt
   - Hoạt động trên tất cả trình duyệt

2. **📂 Lưu vào thư mục đã chọn**
   - Chọn thư mục cụ thể trên máy tính
   - Chỉ hỗ trợ trên Chrome/Edge hiện đại
   - Sử dụng File System Access API

3. **☁️ Tự động upload lên server**
   - Video được upload trực tiếp lên server
   - Có thể quản lý qua "Quản lý File"
   - Truy cập từ bất kỳ đâu

### 🔄 Tự động upload
- Tùy chọn tự động upload video lên server sau khi record
- Hoạt động song song với việc lưu local
- Backup tự động cho video quan trọng

## 🚀 Cách sử dụng

### 1. Cấu hình cài đặt
1. Nhấn nút **"⚙️ Cài đặt"** trên sidebar
2. Tìm phần **"🎥 Cài đặt Record Video"**
3. Chọn **"Nơi lưu video record"**:
   - **Tải về thư mục Downloads**: Lưu vào Downloads
   - **Lưu vào thư mục đã chọn**: Chọn thư mục cụ thể
   - **Tự động upload lên server**: Upload trực tiếp
4. Tùy chọn: Bật **"Tự động upload video record lên server"**

### 2. Chọn thư mục lưu trữ (Chrome/Edge)
1. Trong cài đặt, nhấn **"Chọn thư mục"**
2. Chọn thư mục trên máy tính
3. Cấp quyền truy cập cho trình duyệt
4. Thư mục sẽ được nhớ cho lần sau

### 3. Record video
1. Chọn camera để record
2. Nhấn nút **🔴 Quay** để bắt đầu
3. Nhấn **⏹️ Dừng** để kết thúc
4. Video sẽ được xử lý theo cài đặt đã chọn

## 📋 Chi tiết từng tùy chọn

### 📥 Tải về Downloads
```
✅ Ưu điểm:
- Hoạt động trên mọi trình duyệt
- Đơn giản, không cần cấu hình
- Tốc độ nhanh

❌ Nhược điểm:  
- Không thể chọn thư mục cụ thể
- Có thể làm lộn xộn thư mục Downloads
```

### 📂 Lưu vào thư mục chọn
```
✅ Ưu điểm:
- Chọn chính xác thư mục muốn lưu
- Tổ chức file tốt hơn
- Tự động ghi đè file cùng tên

❌ Nhược điểm:
- Chỉ hỗ trợ Chrome/Edge hiện đại
- Cần cấp quyền truy cập
- Có thể không hoạt động trên một số hệ thống
```

### ☁️ Upload lên server
```
✅ Ưu điểm:
- Truy cập từ bất kỳ đâu
- Quản lý tập trung
- Backup tự động
- Chia sẻ dễ dàng

❌ Nhược điểm:
- Cần kết nối internet
- Tốn thời gian upload
- Giới hạn dung lượng server
```

## ⚙️ Cài đặt nâng cao

### Tự động upload
- Bật tùy chọn **"Tự động upload video record lên server"**
- Video sẽ được lưu local VÀ upload lên server
- Đảm bảo có backup cho mọi video record

### Format file
- Video record luôn ở định dạng **WebM**
- Tên file theo format: `camera-name-YYYY-MM-DD-HH-mm-ss.webm`
- Có thể thay đổi format tên trong cài đặt chung

## 🔧 Xử lý sự cố

### Không thể chọn thư mục
```
Nguyên nhân: Trình duyệt không hỗ trợ File System Access API
Giải pháp: 
- Sử dụng Chrome/Edge phiên bản mới nhất
- Chọn "Tải về Downloads" hoặc "Upload lên server"
```

### Upload lên server thất bại
```
Nguyên nhân: Lỗi kết nối hoặc server không hoạt động
Giải pháp:
- Kiểm tra kết nối internet
- Đảm bảo backend server đang chạy (port 3001)
- Video vẫn được lưu local như fallback
```

### Không thể ghi vào thư mục đã chọn
```
Nguyên nhân: Mất quyền truy cập hoặc thư mục bị xóa
Giải pháp:
- Chọn lại thư mục trong cài đặt
- Cấp lại quyền truy cập
- Hệ thống sẽ fallback về Downloads
```

## 💡 Khuyến nghị

### Cho sử dụng cá nhân:
- **Chọn thư mục cụ thể** để tổ chức file tốt
- Bật **tự động upload** để backup

### Cho doanh nghiệp:
- **Upload lên server** để quản lý tập trung
- Tự động upload để đảm bảo không mất dữ liệu

### Cho demo/test:
- **Tải về Downloads** để đơn giản và nhanh chóng

Hệ thống record video đã linh hoạt hơn rất nhiều! 🎉

## 🎯 Tóm tắt workflow mới:

1. **Cài đặt** → Chọn nơi lưu video record
2. **Record** → Video được xử lý theo cài đặt
3. **Quản lý** → Xem video qua "Quản lý File" (nếu upload)
4. **Backup** → Tự động upload để đảm bảo an toàn

Bây giờ bạn có toàn quyền kiểm soát nơi lưu trữ video record! 🚀
