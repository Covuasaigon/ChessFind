# Kết quả kiểm tra bản bàn giao

Đã kiểm tra:

- Biên dịch bản Node/SQLite và bản Worker/D1 thành công.
- TypeScript không có lỗi.
- Đăng nhập đúng/sai mật khẩu, cookie HttpOnly, đăng xuất hủy phiên.
- Từ chối yêu cầu quản trị khi chưa đăng nhập, thiếu CSRF hoặc sai origin.
- Thêm giải từ nguồn kiểm thử, lưu ẩn, hiện giải, sửa, ẩn lại, xác nhận xóa và xóa.
- Lỗi nguồn khi sửa giữ nguyên dữ liệu đang có.
- Database và phiên đăng nhập còn nguyên khi đóng/mở lại SQLite.
- Giới hạn đăng nhập sai nhiều lần.
- Bản máy chủ đã biên dịch thực sự phục vụ trang /admin, JS/CSS, logo và API đăng nhập qua HTTP.
- Logo phục vụ qua HTTP trùng SHA-256 với file người dùng gửi.
- Không có mật khẩu mặc định trong các file JS/CSS đưa xuống trình duyệt.
- Bộ kiểm tra điểm và màu quân dùng các fixture được kiểm soát.

Chưa kiểm tra:

- Chưa đối chiếu một link giải Chess-Results thực tế của người dùng, vì chưa nhận link đó. Bộ thử CRUD dùng nguồn tổng hợp, không chứng minh mọi mẫu giải ngoài thực tế đều đọc được.
- Chưa kiểm thử giao diện bằng trình duyệt trên thiết bị thực.
- Chưa đưa gói này lên hosting/tên miền của người dùng. Link bản dùng thử cũ không tự cập nhật khi bàn giao ZIP.

Dữ liệu thử, database thử, token đăng nhập thử và mã nguồn dependency không được đưa vào bản chạy.
