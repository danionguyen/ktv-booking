# [FD-BRN-02] Quản lý chi nhánh (Manage Branches)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BRN-02 |
| Tên | Quản lý chi nhánh (Manage Branches) |
| Module | BRN |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-08, KTV-12 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin quản lý thông tin các chi nhánh: địa chỉ, liên hệ, giờ mở cửa.
- **Phạm vi:** danh sách, tạo, sửa, xóa chi nhánh. **Ngoài phạm vi:** sơ đồ mặt bằng (BRN-03).
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A01 · BR-02 · SCR-A02 · FD-BRN-01, FD-ROM-05, FD-USR-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- `branches` được cập nhật.

### 2.3 Luồng chính
1. Admin mở SCR-A02: bảng (tên, địa chỉ, SĐT, giờ mở cửa, số phòng, số nhân viên).
2. Thêm / sửa qua form; xóa qua nút + xác nhận.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Tên trùng | 409 `DUPLICATE_CODE` |
| E2 | 2 | Xóa chi nhánh còn phòng hoặc nhân viên | 409 `RESOURCE_IN_USE` |
| E3 | 2 | Đổi giờ mở cửa khi có đơn tương lai nằm ngoài giờ mới | Cho phép, trả `warnings.affectedBookings` |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `name` | 2–100 ký tự, unique |
| `address` | ≤ 255 ký tự |
| `phone` | Regex SĐT VN `^(0|\+84)\d{9,10}$` |
| `openTime`, `closeTime` | `HH:mm`, bội số 30'; `close < open` = mở qua đêm; `open ≠ close` |
| `mapWidth`, `mapHeight` | 400–2000, mặc định 1000×600 |

## 3. Giao diện

- **Màn hình:** SCR-A02 – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint |
|---|---|
| GET | `/api/v1/admin/branches` |
| POST | `/api/v1/admin/branches` |
| PUT | `/api/v1/admin/branches/{id}` |
| DELETE | `/api/v1/admin/branches/{id}` |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| branches | ✓ | ✓ | ✓ | ✓ |
| rooms, users, bookings | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`.

## 6. Yêu cầu phi chức năng
- Validate FE + BE.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BRN-02-01 | – | Tạo chi nhánh mở 09:00 đóng 02:00 | 201, được hiểu là mở qua đêm |
| AC-BRN-02-02 | Chi nhánh có 10 phòng | Xóa | 409 `RESOURCE_IN_USE` |
| AC-BRN-02-03 | – | SĐT "12345" | 400 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Không có trạng thái "tạm đóng cửa" chi nhánh | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
