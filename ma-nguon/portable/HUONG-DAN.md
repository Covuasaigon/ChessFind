# CỜ VUA SÀI GÒN — HƯỚNG DẪN SỬ DỤNG

## 1. Chạy trên Windows

1. Giải nén toàn bộ ZIP ra một thư mục, ví dụ `D:\Co-Vua-Sai-Gon`.
2. Cài Node.js **24 LTS hoặc mới hơn** từ https://nodejs.org nếu máy chưa có.
3. Nhấp đúp **CHAY-WINDOWS.bat**. Giữ cửa sổ này mở trong lúc dùng ứng dụng.
4. Mở trình duyệt: **http://localhost:3000**.
5. Trang quản trị: **http://localhost:3000/admin**.

Bản chạy đã được biên dịch sẵn. Không cần cài WordPress, Python, MySQL hay chạy `npm install` để dùng bản này. Không mở trực tiếp file `web/index.html`: cần chạy máy chủ bằng file BAT.

Mac/Linux: chạy `sh CHAY-MAC-LINUX.sh` trong thư mục đã giải nén.

Nếu cổng 3000 đang được dùng, sửa `PORT=3001` trong `CAU-HINH.env`, chạy lại và mở http://localhost:3001.

## 2. Đăng nhập quản trị

- Tên đăng nhập: **admin**.
- Mật khẩu: mật khẩu đã thống nhất khi bàn giao trong cuộc trò chuyện.
- Nhập tài khoản tại `/admin`. Không cần tài khoản ChatGPT hoặc WordPress.
- Phiên đăng nhập có hiệu lực 8 giờ. Nút Đăng xuất hủy phiên ở máy chủ.
- Mật khẩu được kiểm tra bằng PBKDF2-SHA256 có salt; không nằm trong mã giao diện. Cookie phiên có HttpOnly, SameSite=Strict và Secure khi dùng HTTPS.
- Nếu đăng nhập sai quá nhiều lần, chờ 15 phút rồi thử lại.

## 3. Thêm giải và bảng đấu

1. Đăng nhập Quản trị.
2. Dán link Chess-Results của bảng đấu (dạng `https://chess-results.com/tnr123456.aspx?...`).
3. Có thể đặt tên giải hiển thị. Để trống nếu muốn lấy từ nguồn.
4. Nhập bảng đấu, ví dụ U8 Nữ.
5. Nhấn **Kiểm tra nguồn**: xem tên giải, số kỳ thủ và một số kết quả.
6. Nhấn **Thêm giải vào ứng dụng**. Giải được lưu ở trạng thái ẩn.
7. Đối chiếu số kỳ thủ và kết quả nguồn, rồi nhấn **Hiện giải**.

Mỗi link bảng đấu được quản lý riêng. Một sự kiện có U6/U8/U10 cần thêm từng link tương ứng. Không gộp xếp hạng của các bảng khác nhau.

## 4. Sửa, xóa, ẩn/hiện, đồng bộ

- **Sửa**: đổi tên, bảng đấu, link nguồn. Nếu đổi link sang mã bảng khác, hệ thống kiểm tra và tải nguồn mới trước khi thay thế. Lỗi nguồn không làm mất bản cũ.
- **Ẩn giải**: phụ huynh không tìm thấy giải/hồ sơ của giải, dữ liệu vẫn giữ trong quản trị.
- **Hiện giải**: đưa giải lên danh sách công khai của bản chạy độc lập.
- **Xóa**: cần nhập đúng tên giải để xác nhận; xóa cả dữ liệu kỳ thủ chi tiết của giải.
- **Đồng bộ**: tải lại bảng kết quả. Tên hiển thị đã chỉnh được giữ nguyên.
- **Nhật ký hoạt động**: ghi lại các thay đổi và lỗi nguồn.

Ứng dụng đồng bộ bằng thao tác của quản trị viên; chưa cấu hình tự động theo lịch. Thời gian trên hồ sơ là thời điểm đồng bộ bảng thành công gần nhất.

## 5. Phụ huynh tra cứu

- Tìm tên có dấu hoặc không dấu, hoặc số báo danh trong giải.
- Lọc giải để phân biệt kỳ thủ trùng tên.
- Mở hồ sơ để xem điểm, thứ hạng, hệ số nguồn và kết quả từng vòng.
- Chi tiết kỳ thủ được đọc lần đầu rồi lưu theo phiên kết quả của bảng. Khi đồng bộ lại, dữ liệu chi tiết cũ được làm mới.
- Lưu kỳ thủ chỉ lưu trên thiết bị hiện tại; không tạo tài khoản phụ huynh.
- Chia sẻ hồ sơ bằng liên kết. In/Lưu PDF qua hộp thoại in của trình duyệt.
- Nút Thử tra cứu mở dữ liệu minh họa có nhãn rõ; không tự đưa dữ liệu minh họa vào database giải thật.

## 6. Dữ liệu và sao lưu

Database tự tạo tại `data/chess.sqlite`. Nội dung tồn tại sau khi đóng và mở lại chương trình.

Để sao lưu đơn giản: dừng máy chủ bằng Ctrl+C, sao chép cả thư mục `data/`. Để khôi phục, dừng ứng dụng rồi thay bằng bản sao lưu. Không đặt thư mục `data/` trong thư mục `web/`.

Khi nâng cấp: sao lưu data, giữ nguyên `data/` và `CAU-HINH.env`, thay các file ứng dụng còn lại. Migrations sẽ chạy khi khởi động; phiên bản đã áp dụng được ghi nhận để tránh chạy lặp.

## 7. Đưa lên máy chủ / tên miền để phụ huynh sử dụng

`localhost` chỉ dùng trên chính máy đang chạy ứng dụng. Để phụ huynh truy cập từ ngoài, triển khai trên máy chủ hỗ trợ Node.js 24 và ổ đĩa lưu dữ liệu lâu dài.

- Chép thư mục bản chạy lên máy chủ.
- Sửa `HOST=0.0.0.0` và `PUBLIC_ORIGIN=https://tenmien-cua-ban` trong CAU-HINH.env.
- Cấu hình reverse proxy HTTPS (ví dụ Nginx) tới cổng PORT, giữ nguyên Host theo tên miền.
- Chạy `node --env-file-if-exists=CAU-HINH.env server/server.mjs` bằng dịch vụ tự khởi động của máy chủ.
- Gắn ổ đĩa lưu lâu dài cho DATA_DIR và sao lưu thường xuyên.
- Chỉ cần một tiến trình ứng dụng cho database SQLite của bản này.

Đây là web app độc lập/PWA, không phải APK hay ứng dụng App Store. Khả năng thêm vào màn hình chính phụ thuộc trình duyệt và HTTPS. Cần Internet để đồng bộ Chess-Results và xem dữ liệu mới. Không lưu trang quản trị trong bộ nhớ cache của service worker.

## 8. Kết nối Chess-Results

- Chỉ nhận link của các hostname Chess-Results được cho phép.
- Giữ hạng và hệ số theo nguồn, không suy đoán TB1/TB2 là BH/SB.
- Tách ván thực đấu, bye, xử kết quả và ván chưa có kết quả.
- Nếu điểm chi tiết khác bảng đã lưu, yêu cầu quản trị đồng bộ lại thay vì hiển thị dữ liệu không khớp.
- Khi nguồn chặn truy cập, giới hạn tốc độ hoặc thay đổi cấu trúc HTML, ứng dụng báo lỗi và giữ dữ liệu cũ.
- Không thể đảm bảo mọi mẫu giải Chess-Results được hỗ trợ khi chưa đối chiếu link thực tế. Hãy kiểm tra giải đầu tiên trước khi gửi link cho phụ huynh.

## 9. Mã nguồn

Thư mục `ma-nguon/` chứa mã nguồn để chỉnh sửa. Để xây dựng lại:

```
npm ci
npm run build:portable
```

Kết quả trong `release/web/`, `release/server/`, `release/migrations/`. Có bản tích hợp Sites trong nguồn nhưng bản chạy độc lập không phụ thuộc dịch vụ đó. Không cần triển khai Sites để chạy gói bàn giao.
