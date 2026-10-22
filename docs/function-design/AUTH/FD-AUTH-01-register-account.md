# [FD-AUTH-01] Đăng ký tài khoản (Register Account)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-AUTH-01 |
| Tên | Đăng ký tài khoản (Register Account) |
| Module | AUTH |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C |
| Task | KTV-07, KTV-10 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho khách tạo tài khoản để đặt phòng online và theo dõi lịch sử.
- **Phạm vi:** đăng ký bằng email + mật khẩu, tự đăng nhập sau khi đăng ký. **Ngoài phạm vi:** xác thực email, đăng nhập Google/Facebook, tạo tài khoản Staff/Admin (USR-02).
- **Actor:** Guest.
- **Ưu tiên:** Must.
- **Tham chiếu:** C01 · NFR-01, NFR-06 · SCR-C01 · FD-AUTH-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Chưa đăng nhập.

### 2.2 Hậu điều kiện
- **Thành công:** bản ghi `users` role `CUSTOMER`, mật khẩu băm BCrypt; khách được đăng nhập luôn (nhận token như AUTH-02).
- **Thất bại:** không tạo tài khoản.

### 2.3 Luồng chính
1. Khách mở SCR-C01, nhập họ tên, email, SĐT, mật khẩu, nhập lại mật khẩu, tích đồng ý điều khoản.
2. FE validate, gửi yêu cầu.
3. Hệ thống validate, chuẩn hóa email (trim + lowercase), kiểm tra email chưa tồn tại.
4. Băm mật khẩu (BCrypt cost 10), lưu user.
5. Cấp access + refresh token (như AUTH-02 bước 4–5).
6. FE lưu phiên, quay lại trang trước đó (`redirect` param) hoặc trang chủ.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 3 | Email đã tồn tại | 409 `EMAIL_ALREADY_EXISTS` – lỗi gắn vào field email |
| E2 | 3 | Dữ liệu không hợp lệ | 400 `VALIDATION_ERROR` |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `fullName` | 2–100 ký tự |
| `email` | Định dạng email, ≤ 255, unique |
| `phone` | `^(0|\+84)\d{9,10}$` |
| `password` | 8–64 ký tự, có chữ và số |
| `confirmPassword` | = `password` (chỉ FE) |

## 3. Giao diện

- **Màn hình:** SCR-C01 – **Wireframe: TODO**
- **Điều hướng:** link "Đã có tài khoản? Đăng nhập" → SCR-C02.

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|
| MSG-AUTH-01 | E1 | "Email đã được sử dụng" |
| MSG-AUTH-02 | Thành công | "Chào mừng {fullName}!" |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/auth/register` |
| Quyền | Public |

**Request**
```json
{ "fullName": "Nguyễn Văn A", "email": "a@example.com", "phone": "0912345678", "password": "secret123" }
```
**Response 201** – giống AUTH-02 (`accessToken`, `user`) + cookie refresh token.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| users | ✓ | ✓ | | |
| refresh_tokens | ✓ | | | |

## 5. Bảo mật & phân quyền
- Không bao giờ log mật khẩu; role luôn là `CUSTOMER` (bỏ qua field `role` nếu client gửi).

## 6. Yêu cầu phi chức năng
- NFR-01 (BCrypt).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-AUTH-01-01 | – | Đăng ký hợp lệ | 201, đã đăng nhập, role CUSTOMER |
| AC-AUTH-01-02 | Có `a@example.com` | Đăng ký `A@Example.com ` | 409 |
| AC-AUTH-01-03 | – | Mật khẩu "12345678" | 400 (thiếu chữ) |
| AC-AUTH-01-04 | – | Gửi kèm `"role":"ADMIN"` | Tài khoản vẫn là CUSTOMER |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Không xác thực email khi đăng ký | Giả định | PO | Open |
| 2 | Mã lỗi mới `EMAIL_ALREADY_EXISTS` (409) | Bổ sung | A | Đã thêm |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
