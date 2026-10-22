# [FD-USR-01] Xem và cập nhật hồ sơ cá nhân (Update Profile)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-USR-01 |
| Tên | Xem và cập nhật hồ sơ cá nhân (Update Profile) |
| Module | USR |
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

- **Mục đích:** Cho người dùng xem và cập nhật thông tin liên hệ, đổi mật khẩu.
- **Phạm vi:** họ tên, SĐT, đổi mật khẩu. **Không** cho đổi email, role, chi nhánh.
- **Actor:** Customer, Staff, Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** C03 · NFR-01 · SCR-C13 · FD-AUTH-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đã đăng nhập.

### 2.2 Hậu điều kiện
- Thông tin được cập nhật. Đổi mật khẩu → thu hồi refresh token của **các phiên khác**.

### 2.3 Luồng chính
1. Người dùng mở SCR-C13: tab **Thông tin** (email chỉ đọc, họ tên, SĐT) và tab **Đổi mật khẩu**.
2. **Cập nhật thông tin:** sửa → "Lưu" → hệ thống validate, lưu.
3. **Đổi mật khẩu:** nhập mật khẩu hiện tại, mật khẩu mới ×2 → hệ thống kiểm tra mật khẩu hiện tại, lưu mật khẩu mới, thu hồi refresh token khác.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 3 | Mật khẩu hiện tại sai | 400 `VALIDATION_ERROR` field `currentPassword` |
| E2 | 3 | Mật khẩu mới trùng mật khẩu cũ | 400 |
| E3 | 2 | Dữ liệu không hợp lệ | 400 |

## 3. Giao diện

- **Màn hình:** SCR-C13 (dùng chung mọi role) – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Body |
|---|---|---|
| GET | `/api/v1/users/me` | – → `{ id, email, fullName, phone, role, branch }` |
| PUT | `/api/v1/users/me` | `{ fullName, phone }` |
| PUT | `/api/v1/users/me/password` | `{ currentPassword, newPassword }` → 204 |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| users | | ✓ | ✓ | |
| refresh_tokens | | | ✓ | |

## 5. Bảo mật & phân quyền
- Luôn thao tác trên user từ JWT; bỏ qua `email`, `role`, `branchId` trong body.

## 6. Yêu cầu phi chức năng
- Validate như AUTH-01.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-USR-01-01 | – | Sửa họ tên, SĐT | 200, hiển thị mới |
| AC-USR-01-02 | – | Gửi kèm `role: ADMIN` | Role không đổi |
| AC-USR-01-03 | – | Đổi mật khẩu, sai mật khẩu hiện tại | 400 |
| AC-USR-01-04 | Đăng nhập ở 2 máy | Đổi mật khẩu ở máy 1 | Máy 2 bị đăng xuất khi refresh; máy 1 vẫn dùng được |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Ảnh đại diện – ngoài phạm vi | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
