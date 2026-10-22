# [FD-ROM-05] Quản lý phòng (Manage Rooms)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-ROM-05 |
| Tên | Quản lý phòng (Manage Rooms) |
| Module | ROM |
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

- **Mục đích:** Cho admin quản lý danh sách phòng của từng chi nhánh và chuyển phòng sang bảo trì khi có sự cố.
- **Phạm vi:** danh sách, tạo, sửa, xóa phòng; bật/tắt bảo trì; upload ảnh. **Ngoài phạm vi:** vị trí trên sơ đồ (BRN-03).
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A02 · BR-08 · SCR-A05 · FD-ROM-04, FD-BRN-03, FD-ROM-03, FD-BKG-09.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`; có chi nhánh và loại phòng.

### 2.2 Hậu điều kiện
- `rooms` được cập nhật; đổi trạng thái bảo trì phát WS `MAINTENANCE_CHANGED`.

### 2.3 Luồng chính
1. Admin mở SCR-A05, lọc theo chi nhánh / loại / trạng thái.
2. **Tạo / sửa:** chi nhánh, loại phòng, mã phòng, ảnh (tối đa 5), trạng thái.
3. **Bảo trì:** bấm switch `ACTIVE ⇄ MAINTENANCE`.
4. Khi chuyển `MAINTENANCE`, hệ thống trả danh sách **đơn tương lai bị ảnh hưởng** (`CONFIRMED` / `HOLD`); admin xử lý thủ công qua BKG-09 (không tự hủy).
5. **Xóa:** chỉ khi phòng chưa từng có booking; nếu đã có → dùng bảo trì thay thế.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Mã phòng trùng trong chi nhánh | 409 `DUPLICATE_CODE` |
| E2 | 5 | Phòng đã có booking | 409 `RESOURCE_IN_USE` |
| E3 | 2 | Ảnh > 2MB hoặc không phải jpg/png/webp | 400 |
| A1 | 4 | Có đơn bị ảnh hưởng | Modal liệt kê đơn + link sang SCR-A10 lọc sẵn |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `code` | 1–10 ký tự `[A-Z0-9-]`, unique trong chi nhánh |
| `branchId`, `roomTypeId` | Tồn tại |
| `status` | `ACTIVE` / `MAINTENANCE` |
| `images` | ≤ 5 URL |

## 3. Giao diện

- **Màn hình:** SCR-A05 – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/v1/admin/rooms?branchId&roomTypeId&status&page&size` | |
| POST | `/api/v1/admin/rooms` | |
| PUT | `/api/v1/admin/rooms/{id}` | |
| PATCH | `/api/v1/admin/rooms/{id}/status` `{ "status": "MAINTENANCE" }` | → `{ affectedBookings: [...] }` |
| DELETE | `/api/v1/admin/rooms/{id}` | |
| POST | `/api/v1/admin/uploads/images` (multipart) | → `{ url }` (Cloudinary) |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| rooms | ✓ | ✓ | ✓ | ✓ |
| bookings | | ✓ | | |

### 4.5 Tích hợp
- WS `MAINTENANCE_CHANGED` → sơ đồ (ROM-03) đổi ⚫ / 🟢.
- Cloudinary upload (unsigned preset hoặc signed qua BE).

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`. Upload kiểm tra MIME thật (không chỉ đuôi file).

## 6. Yêu cầu phi chức năng
- Validate FE + BE.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-ROM-05-01 | Chi nhánh 1 có V02 | Tạo V02 ở chi nhánh 1 | 409; tạo V02 ở chi nhánh 2 → 201 |
| AC-ROM-05-02 | V02 có 2 đơn CONFIRMED tuần sau | Chuyển MAINTENANCE | 200 + `affectedBookings` 2 đơn; đơn vẫn CONFIRMED |
| AC-ROM-05-03 | V02 MAINTENANCE | Khách tìm phòng | Không thấy V02; sơ đồ hiện ⚫ |
| AC-ROM-05-04 | Phòng có lịch sử booking | Xóa | 409 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Ảnh dùng Cloudinary free tier; nếu không kịp → URL nhập tay | Giả định | B | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
