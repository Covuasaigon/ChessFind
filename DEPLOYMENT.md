# 🚀 Hướng Dẫn Deploy Production — Cờ Vua Sài Gòn App

Tài liệu này hướng dẫn chi tiết từng bước triển khai hệ thống **Cờ Vua Sài Gòn** lên môi trường Production với kiến trúc tách biệt:
- **Frontend (Giao diện ứng dụng):** Deploy trên **Vercel**
- **Backend (API Server & Database):** Deploy trên **Railway**

---

## 📐 1. Cấu Trúc Dự Án Production

```
Co-Vua-Sai-Gon/
├── frontend/                  # React + Vite (Web Application)
│   ├── app/                   # Components & Pages
│   ├── components/            # UI Design System
│   ├── lib/                   # API Client & Helpers
│   ├── public/                # Static Assets & Icons
│   ├── index.html
│   ├── main.tsx
│   ├── package.json
│   ├── vercel.json            # Cấu hình SPA Rewrite cho Vercel
│   └── vite.config.ts
│
├── backend/                   # Node.js HTTP Server & SQLite Database
│   ├── lib/                   # Business Logic & API Handlers
│   ├── migrations/            # Migration SQL Scripts
│   ├── data/                  # Thư mục chứa SQLite Database (chess.sqlite)
│   ├── uploads/               # Thư mục lưu trữ ảnh upload (/uploads/banner)
│   ├── database.ts            # Database Connector (node:sqlite)
│   ├── server.ts              # HTTP API Server with CORS & Health check
│   ├── server.mjs             # Standalone ESM Production Bundle
│   ├── build.mjs              # Standalone Build Script (esbuild)
│   └── package.json
│
├── .env.example               # Biến môi trường mẫu
├── package.json               # Root Script quản lý build tổng
└── DEPLOYMENT.md              # Hướng dẫn deploy (File này)
```

---

## 🛠️ 2. Danh Sách Biến Môi Trường (.env.example)

Sao chép `.env.example` để cấu hình biến môi trường tương ứng:

| Biến Môi Trường | Nơi Cấu Hình | Giá Trị Ví Dụ Production | Mô Tả |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Frontend (Vercel)** | `https://co-vua-sai-gon-api.up.railway.app` | URL domain Backend Server |
| `DATABASE_URL` | **Backend (Railway)** | `data/chess.sqlite` hoặc `/app/data/chess.sqlite` | Đường dẫn tới SQLite file |
| `PORT` | **Backend (Railway)** | `8080` (Railway tự cấp) | Cổng lắng nghe HTTP Server |
| `HOST` | **Backend (Railway)** | `0.0.0.0` | IP interface lắng nghe (Bắt buộc `0.0.0.0`) |
| `NODE_ENV` | **Backend (Railway)** | `production` | Môi trường ứng dụng |
| `PUBLIC_ORIGIN`| **Backend (Railway)** | `https://co-vua-sai-gon-api.up.railway.app` | URL domain chính của Backend |
| `FRONTEND_URL` | **Backend (Railway)** | `https://co-vua-sai-gon.vercel.app` | URL Frontend trên Vercel (Cho phép CORS) |

---

## 🚆 3. Hướng Dẫn Deploy Backend Trên Railway

### Bước 3.1: Tạo Project Trên Railway
1. Đăng nhập vào [Railway.app](https://railway.app).
2. Nhấn **New Project** ➔ Chọn **Deploy from GitHub repo**.
3. Chọn repository **Co-Vua-Sai-Gon**.

### Bước 3.2: Cấu Hình Root Directory & Build Command
1. Vào mục **Settings** của Service trên Railway.
2. Tìm **Root Directory** ➔ Nhập `backend`.
3. Tìm **Build Command** ➔ Nhập `npm run build`.
4. Tìm **Start Command** ➔ Nhập `npm run start` (hoặc `node server.mjs`).
5. Tại mục **Healthcheck Path**, nhập `/health`.

### Bước 3.3: Thêm Persistent Volume (Lưu Cơ Sở Dữ Liệu & Ảnh Upload)
> ⚠️ **Rất quan trọng:** SQLite và ảnh upload cần lưu trên đĩa cứng cố định để không bị mất dữ liệu khi Railway restart hoặc redeploy.

1. Tại giao diện dự án Railway, nhấn **+ New** ➔ Chọn **Volume**.
2. Mount Volume vào dịch vụ Backend với đường dẫn:
   - Volume 1: `/app/data` (Gắn với thư mục Cơ sở dữ liệu)
   - Volume 2: `/app/uploads` (Gắn với thư mục Ảnh banner upload)

### Bước 3.4: Khai Báo Variable Trên Railway
Vào tab **Variables** và thêm các dòng sau:
```env
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
DATABASE_URL=data/chess.sqlite
PUBLIC_ORIGIN=https://co-vua-sai-gon-api.up.railway.app
FRONTEND_URL=https://co-vua-sai-gon.vercel.app
```

### Bước 3.5: Lấy URL Domain Public
1. Tại tab **Settings**, tìm mục **Networking** ➔ Nhấn **Generate Domain**.
2. Sao chép URL nhận được (ví dụ: `https://co-vua-sai-gon-api.up.railway.app`).

---

## 📐 4. Hướng Dẫn Deploy Frontend Trên Vercel

### Bước 4.1: Import Dự Án Vào Vercel
1. Đăng nhập vào [Vercel.com](https://vercel.com).
2. Nhấn **Add New...** ➔ Chọn **Project**.
3. Chọn repository **Co-Vua-Sai-Gon** từ GitHub.

### Bước 4.2: Cấu Hình Build & Environment Variables
1. Tại mục **Root Directory**, chọn `frontend`.
2. Vercel tự động nhận diện **Framework Preset: Vite**.
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Tại mục **Environment Variables**, thêm biến:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://co-vua-sai-gon-api.up.railway.app` (URL domain Railway thu được ở Bước 3.5)

### Bước 4.3: Deploy & Kiểm Tra
1. Nhấn **Deploy**.
2. Vercel sẽ tự động cài đặt dependency, build bundle và cấp domain SSL miễn phí (ví dụ: `https://co-vua-sai-gon.vercel.app`).

---

## 🔍 5. Kiểm Tra & Xử Lý Lỗi Thường Gặp (Troubleshooting)

### 1. Lỗi CORS (Cross-Origin Resource Sharing)
- **Triệu chứng:** Console trình duyệt báo lỗi `Access to fetch at ... from origin ... has been blocked by CORS policy`.
- **Cách xử lý:** Kiểm tra xem biến `FRONTEND_URL` trên Railway đã điền chính xác URL trang Vercel (ví dụ `https://co-vua-sai-gon.vercel.app`) hay chưa. Backend đã có bộ lọc CORS tự động cấp phép credentials cho `FRONTEND_URL`.

### 2. Lỗi Cookie Phiên Đăng Nhập Admin Mất Sau Khi Refresh
- **Triệu chứng:** Đăng nhập thành công nhưng khi tải lại trang bị đăng xuất.
- **Cách xử lý:** Đảm bảo Backend chạy trên môi trường `NODE_ENV=production` và cả Frontend lẫn Backend đều truy cập qua HTTPS. Cookie `sgc_session` sử dụng thuộc tính `SameSite=None; Secure` để gửi cookie qua các domain khác nhau.

### 3. Build Thất Bại Khi Run Command
- Chạy lệnh kiểm tra tại máy cục bộ trước khi push code lên GitHub:
  ```bash
  npm run build
  ```
- Kết quả xuất hiện thông báo:
  `✅ ALL PRODUCTION BUILDS COMPLETED WITH 0 ERRORS!`
  là dự án hoàn toàn sẵn sàng deploy.

---

## 🌟 Chúc Bạn Triển Khai Ứng Dụng Thành Công!
