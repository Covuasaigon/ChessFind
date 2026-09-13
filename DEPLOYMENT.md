# 🚀 Hướng Dẫn Deploy Production (Render Free + Vercel) — Cờ Vua Sài Gòn App

Tài liệu này hướng dẫn chi tiết từng bước triển khai hệ thống **Cờ Vua Sài Gòn (ChessFind)** lên môi trường Production với kiến trúc chuẩn:
- **Frontend (Web App):** Deploy trên **Vercel** (`https://chess-find-cvsg.vercel.app`)
- **Backend (Node.js API):** Deploy trên **Render Free**
- **Database (Production):** **Supabase PostgreSQL** (`postgresql://postgres:[YOUR-PASSWORD]@db.plhwqodltxhwlrfwiopu.supabase.co:5432/postgres`)

---

## 🛠️ 1. Cấu Hình Biến Môi Trường (Environment Variables)

### A. Backend (Render Free)
Vào **Render.com** ➔ Dashboard ➔ Dịch vụ Backend ➔ Tab **Environment**:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.plhwqodltxhwlrfwiopu.supabase.co:5432/postgres
NODE_ENV=production
FRONTEND_URL=https://chess-find-cvsg.vercel.app
PUBLIC_ORIGIN=https://co-vua-sai-gon-backend.onrender.com
PORT=10000
HOST=0.0.0.0
```

### B. Frontend (Vercel)
Vào **Vercel.com** ➔ Project Settings ➔ **Environment Variables**:

```env
VITE_API_URL=https://co-vua-sai-gon-backend.onrender.com
```

---

## 🚆 2. Hướng Dẫn Deploy Backend Trên Render

1. Đăng nhập [Render.com](https://render.com) ➔ Chọn **New +** ➔ **Web Service**.
2. Kết nối với repository GitHub **Co-Vua-Sai-Gon**.
3. Cấu hình dịch vụ:
   - **Name:** `co-vua-sai-gon-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start` (hoặc `node server.mjs`)
4. Điền các biến môi trường ở Mục 1.A.
5. Nhấn **Create Web Service**.

---

## 📦 3. Lệnh Chạy Migration Dữ Liệu Local SQLite ➔ Supabase

Khi đã điền password thật vào `DATABASE_URL`, chạy lệnh sau tại máy local:

```bash
# Set DATABASE_URL tới Supabase PostgreSQL
$env:DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.plhwqodltxhwlrfwiopu.supabase.co:5432/postgres"

# Chạy migrate cơ sở dữ liệu
npm run migrate:db

# Chạy migrate hình ảnh sang Data URLs
npm run migrate:images
```
