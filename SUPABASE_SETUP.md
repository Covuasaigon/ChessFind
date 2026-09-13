# 🐘 Hướng Dẫn Cấu Hình & Kết Nối Supabase PostgreSQL — ChessFind

Tài liệu này hướng dẫn chi tiết cách cấu hình, xử lý lỗi kết nối và chạy Migration từ SQLite local lên **Supabase PostgreSQL**.

---

## 🔑 1. Cách Lấy Đường Dẫn Connection String `DATABASE_URL` Trên Supabase

Supabase cung cấp 2 dạng đường dẫn kết nối:

### Dạng 1: Connection Pooler (Khuyên dùng cho mạng Local IPv4 & Render Free)
> 💡 **Lưu ý quan trọng:** Kết nối trực tiếp (Direct Connection) qua port `5432` của Supabase yêu cầu mạng hỗ trợ **IPv6**. Nếu mạng nhà mạng/WiFi của bạn là IPv4, kết nối port `5432` sẽ bị lỗi `Connection terminated due to connection timeout`. Hãy sử dụng **Connection Pooler** (port `6543`).

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn dự án **ChessFind** của bạn.
3. Vào **Project Settings** (Biểu tượng Bánh răng ⚙️) ➔ Chọn mục **Database**.
4. Cuộn xuống phần **Connection string** ➔ Chọn tab **URI**.
5. Chọn chế độ **Transaction** (hoặc Session Pooler) ➔ Sao chép URL:
   ```env
   postgresql://postgres.plhwqodltxhwlrfwiopu:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
   *(Thay `[YOUR-PASSWORD]` bằng mật khẩu thực tế của bạn. Lưu ý username khi dùng Pooler có dạng `postgres.YOUR_PROJECT_REF`)*.

### Dạng 2: Direct Connection (Dành cho mạng có IPv6)
```env
postgresql://postgres:[YOUR-PASSWORD]@db.plhwqodltxhwlrfwiopu.supabase.co:5432/postgres
```

---

## 🔐 2. Cách Reset Mật Khẩu Database Password Trực Tiếp Trên Supabase

Nếu bạn quên mật khẩu database đã đặt khi khởi tạo project:
1. Vào [Supabase Dashboard](https://supabase.com/dashboard) ➔ **Project Settings** ➔ **Database**.
2. Cuộn xuống mục **Database Password**.
3. Nhấn **Reset password** ➔ Nhập mật khẩu mới ➔ Nhấn **Save**.
4. Cập nhật mật khẩu mới vào đường dẫn `DATABASE_URL`.

---

## 💻 3. Hướng Dẫn Chạy Migration Dữ Liệu Local SQLite ➔ Supabase

Mở Terminal tại máy máy tính của bạn và thực hiện:

### Bước 3.1: Đặt Biến Môi Trường DATABASE_URL
**Trên Windows (PowerShell):**
```powershell
$env:DATABASE_URL="postgresql://postgres.plhwqodltxhwlrfwiopu:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

**Trên Mac / Linux:**
```bash
export DATABASE_URL="postgresql://postgres.plhwqodltxhwlrfwiopu:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### Bước 3.2: Thực Thi Lệnh Migrate
```bash
npm run migrate:db
```

### Kết Quả Kỳ Vọng Khi Chạy Thành Công:
```text
🚀 Connecting to PostgreSQL (postgresql://postgres.plhwqodltxhwlrfwiopu:****@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres)...
✅ Connection successful

Creating schema...
✅ Schema created successfully.

Migrating sgc_migrations: 7 rows
Migrating tournaments: 2 rows
Migrating categories: 0 rows
Migrating players: 0 rows
Migrating rankings: 0 rows
Migrating matches: 0 rows
Migrating admin_sessions: 1 rows
Migrating auth_attempts: 0 rows
Migrating settings: 1 rows
Migrating home_banners: 2 rows
Migrating tournament_slides: 0 rows
Migrating prizes: 0 rows
Migrating details: 0 rows
Migrating locks: 0 rows
Migrating logs: 5 rows
Migrating sync_logs: 0 rows
Migrating previews: 0 rows

Migration completed successfully
```

---

## 🌐 4. Cấu Hình Trên Render Environment Variables

Vào **Render.com** ➔ Dashboard ➔ Service **co-vua-sai-gon-backend** ➔ **Environment**:

| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.plhwqodltxhwlrfwiopu:YOUR_ACTUAL_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://chess-find-cvsg.vercel.app` |
| `PUBLIC_ORIGIN` | `https://co-vua-sai-gon-backend.onrender.com` |
| `PORT` | `10000` |
| `HOST` | `0.0.0.0` |
