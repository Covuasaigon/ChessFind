# Cờ Vua Sài Gòn — ứng dụng tra cứu độc lập

Ứng dụng tiếng Việt, logo công ty do chủ sở hữu cung cấp. Phụ huynh tra cứu điểm, từng ván, màu quân, đối thủ, hệ số phụ và hạng. Quản trị đăng nhập username/password để thêm, sửa, xóa, ẩn/hiện và đồng bộ giải.

## Hai mục tiêu biên dịch

- `npm run build:portable`: tạo bản tự chạy Node.js 24 + SQLite tại `release/`; không cần dịch vụ ChatGPT/WordPress. Máy chủ bundle chỉ dùng module có sẵn của Node. Giao diện React đã build sẵn.
- `npm run build`: bản Cloudflare Worker/D1 dành cho Sites đang có trong dự án. Việc chỉnh sửa nguồn không tự cập nhật bản đã xuất bản.

Hướng dẫn bàn giao và cấu hình nằm trong `portable/HUONG-DAN.md`. Database của mỗi bản triển khai tách biệt. Không đưa database có dữ liệu thực vào gói ZIP.

## Kiến trúc

- `app/chess-app.tsx`, `app/admin.tsx`: giao diện phụ huynh và quản trị.
- `lib/api.ts`: backend chung, kiểm tra phiên đăng nhập/CSRF cho tất cả thao tác quản trị.
- `lib/default-admin.ts`: hash mật khẩu ban đầu ở phía máy chủ. Không import vào frontend.
- `lib/chess-source.ts`: kiểm tra URL, đọc Chess-Results, bảo vệ dữ liệu không khớp.
- `portable/database.ts`: SQLite adapter và chạy migrations một lần.
- `portable/server.ts`: HTTP, tài nguyên tĩnh, API, cookie và bảo vệ đường dẫn.
- `db/schema.ts`, `drizzle/`: schema và migrations.

Không còn dùng tài khoản ChatGPT để cấp quyền quản trị trong ứng dụng. Không lưu mật khẩu trong localStorage. Phiên phía server dùng token ngẫu nhiên và cookie HttpOnly. Mật khẩu dùng PBKDF2 SHA256 với salt.

## Kiểm thử

- `tests/chess.test.ts`: thống kê, đối xứng ván đấu, thắng khi cầm đen, loại trừ xử thắng và điểm không khớp, URL không hợp lệ.
- `tests/api.test.ts`: login/logout, mật khẩu sai, CSRF, thêm/sửa/ẩn/hiện/xóa, xác nhận xóa, lỗi nguồn giữ dữ liệu, SQLite khởi động lại, giới hạn đăng nhập sai. Biến TEST_ADMIN_PASSWORD chỉ cung cấp trong môi trường kiểm thử.
- `npx tsc --noEmit` kiểm tra TypeScript.

Bộ thử API dùng nguồn tổng hợp được kiểm soát. Chưa đối chiếu giải thật của khách hàng do chưa nhận link cụ thể. Đồng bộ hiện tại là thủ công. Chưa chạy kiểm thử giao diện bằng trình duyệt.
