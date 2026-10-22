# [FD-USR-02] Quản lý tài khoản người dùng (Manage Users)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-USR-02 |
| Tên | Quản lý tài khoản người dùng (Manage Users) |
| Module | USR |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-51 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin tạo tài khoản nhân viên, phân quyền, gán chi nhánh và khóa tài khoản vi phạm.
- **Phạm vi:** danh sách, tạo Staff/Admin, sửa role/chi nhánh, khóa/mở khóa, đặt mật khẩu tạm.
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A06 · NFR-02 · SCR-A09 · FD-AUTH-03, FD-OPS-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- `users` cập nhật; khóa tài khoản → thu hồi refresh token (bị đăng xuất trong ≤ 15 phút).

### 2.3 Luồng chính
1. Admin mở SCR-A09: bảng (họ tên, email, SĐT, role, chi nhánh, trạng thái, ngày tạo) + lọc role / chi nhánh / trạng thái / từ khóa.
2. **Tạo:** nhập họ tên, email, SĐT, role (`STAFF`/`ADMIN`), chi nhánh (bắt buộc nếu STAFF), mật khẩu tạm.
3. **Sửa:** đổi role, chi nhánh, họ tên, SĐT.
4. **Khóa / mở khóa:** switch `enabled`.
5. **Đặt mật khẩu tạm:** nhập mật khẩu mới cho user (khi nhân viên quên).

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Email trùng | 409 `EMAIL_ALREADY_EXISTS` |
| E2 | 2, 3 | Role STAFF thiếu chi nhánh | 400 |
| E3 | 3, 4 | Admin tự hạ quyền / tự khóa chính mình | 422 `INVALID_STATE` |
| E4 | 3, 4 | Hạ quyền / khóa **admin cuối cùng** còn hoạt động | 422 `INVALID_STATE` |
| A1 | 3 | Đổi role sang CUSTOMER | Xóa `branch_id` |

## 3. Giao diện

- **Màn hình:** SCR-A09 – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Body |
|---|---|---|
| GET | `/api/v1/admin/users?role&branchId&enabled&q&page&size` | – |
| POST | `/api/v1/admin/users` | `{ fullName, email, phone, role, branchId, password }` |
| PUT | `/api/v1/admin/users/{id}` | `{ fullName, phone, role, branchId }` |
| PATCH | `/api/v1/admin/users/{id}/status` | `{ enabled }` |
| PUT | `/api/v1/admin/users/{id}/password` | `{ newPassword }` |

### 4.2 Các bước xử lý
- Khóa / đổi role / đặt mật khẩu → `refreshTokenRepo.revokeAllByUser(id)`.
- `JwtFilter` kiểm tra `enabled` **không** thực hiện mỗi request (chấp nhận trễ ≤ 15' theo hạn access token).

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| users | ✓ | ✓ | ✓ | |
| refresh_tokens | | | ✓ | |
| branches | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`; không trả `password_hash` trong mọi response.

## 6. Yêu cầu phi chức năng
- NFR-01, NFR-02.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-USR-02-01 | – | Tạo STAFF chi nhánh 1 | Đăng nhập được, vào `/staff`, chỉ thấy chi nhánh 1 |
| AC-USR-02-02 | – | Tạo STAFF không chọn chi nhánh | 400 |
| AC-USR-02-03 | Staff đang đăng nhập | Admin khóa | Sau khi access token hết hạn, staff bị đăng xuất |
| AC-USR-02-04 | Chỉ còn 1 admin | Admin tự khóa | 422 |
| AC-USR-02-05 | Đăng nhập CUSTOMER | Gọi `/admin/users` | 403 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Không xóa cứng user (giữ lịch sử booking) – chỉ khóa | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
