# [FD-AUTH-04] Đặt lại mật khẩu (Reset Password)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-AUTH-04 |
| Tên | Đặt lại mật khẩu (Reset Password) |
| Module | AUTH |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C |
| Task | (Could – Phase 4 nếu còn thời gian) |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho người dùng quên mật khẩu tự lấy lại quyền truy cập qua email.
- **Phạm vi:** yêu cầu link đặt lại, đặt mật khẩu mới bằng link.
- **Actor:** Guest.
- **Ưu tiên:** Could.
- **Tham chiếu:** C02 · NFR-01 · SCR-C03, SCR-C04 · FD-NTF-01, FD-AUTH-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Không.

### 2.2 Hậu điều kiện
- Mật khẩu mới được lưu; token đặt lại bị đánh dấu đã dùng; toàn bộ refresh token của user bị thu hồi.

### 2.3 Luồng chính
1. Người dùng nhập email trên SCR-C03 → **"Gửi link"**.
2. Hệ thống **luôn trả 200** với cùng thông báo (chống dò email).
3. Nếu email tồn tại và `enabled`: sinh token ngẫu nhiên 32 byte, lưu hash, hạn **30 phút**, gửi email chứa link `{FRONTEND_URL}/reset-password?token=...` (NTF-01).
4. Người dùng mở link → SCR-C04, nhập mật khẩu mới ×2 → **"Đặt lại"**.
5. Hệ thống kiểm tra token (tồn tại, chưa dùng, chưa hết hạn), cập nhật mật khẩu, đánh dấu token đã dùng, thu hồi refresh token.
6. FE thông báo thành công → SCR-C02.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 3 | Yêu cầu lại khi đã có token còn hạn | Vô hiệu token cũ, tạo token mới |
| E1 | 5 | Token sai / hết hạn / đã dùng | 400 `INVALID_TOKEN` – "Link không hợp lệ hoặc đã hết hạn" + nút gửi lại |
| E2 | 5 | Mật khẩu không đạt quy tắc | 400 `VALIDATION_ERROR` |

## 3. Giao diện

- **Màn hình:** SCR-C03, SCR-C04 – **Wireframe: TODO**

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|
| MSG-AUTH-05 | Bước 2 | "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu (hiệu lực 30 phút)." |
| MSG-AUTH-06 | Thành công | "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/v1/auth/forgot-password` | `{ "email": "..." }` → 200 |
| POST | `/api/v1/auth/reset-password` | `{ "token": "...", "newPassword": "..." }` → 204 |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| password_reset_tokens *(mới)* | ✓ | ✓ | ✓ | |
| users | | ✓ | ✓ | |
| refresh_tokens | | | ✓ | |

```sql
password_reset_tokens(id BIGSERIAL PK, user_id FK, token_hash VARCHAR UNIQUE,
                      expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ)
```

## 5. Bảo mật & phân quyền
- Không tiết lộ email có tồn tại hay không; lưu hash token; link dùng 1 lần.
- Giới hạn 3 yêu cầu / 15 phút / email (tùy chọn).

## 6. Yêu cầu phi chức năng
- Email gửi bất đồng bộ; API trả < 500ms bất kể email có tồn tại.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-AUTH-04-01 | Email tồn tại | Yêu cầu | 200 + nhận email có link |
| AC-AUTH-04-02 | Email không tồn tại | Yêu cầu | 200, cùng thông báo, không gửi email |
| AC-AUTH-04-03 | Link hợp lệ | Đặt mật khẩu mới | Đăng nhập bằng mật khẩu mới được; mật khẩu cũ không được |
| AC-AUTH-04-04 | Link đã dùng / quá 30' | Đặt lại | 400 |
| AC-AUTH-04-05 | Đang đăng nhập ở máy khác | Đặt lại thành công | Máy khác bị đăng xuất khi refresh |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Thêm bảng `password_reset_tokens` vào 02-architecture | Bổ sung | A | Đã cập nhật |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
