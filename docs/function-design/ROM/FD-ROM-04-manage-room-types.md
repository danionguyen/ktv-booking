# [FD-ROM-04] Quản lý loại phòng (Manage Room Types)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-ROM-04 |
| Tên | Quản lý loại phòng (Manage Room Types) |
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

- **Mục đích:** Cho admin định nghĩa các loại phòng (Standard, VIP, Party…) với sức chứa và mô tả – là đơn vị để gắn bảng giá.
- **Phạm vi:** danh sách, tạo, sửa, xóa loại phòng.
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A02 · BR-04, BR-22 · SCR-A04 · FD-ROM-05, FD-PRC-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- Bảng `room_types` được cập nhật.

### 2.3 Luồng chính
1. Admin mở SCR-A04: bảng (tên, sức chứa, số phòng đang dùng, đã có bảng giá ✓/✗).
2. Thêm / sửa qua modal form; xóa qua nút xóa + xác nhận.
3. Sau khi tạo mới, FE gợi ý **"Thiết lập bảng giá ngay"** → SCR-A06.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Tên trùng | 409 `DUPLICATE_CODE` |
| E2 | 2 | Xóa loại đang có phòng | 409 `RESOURCE_IN_USE` – "Còn {n} phòng thuộc loại này" |
| E3 | 2 | Giảm sức chứa khi có đơn tương lai vượt sức chứa mới | Cho phép, trả cảnh báo `warnings.affectedBookings` (đơn cũ giữ nguyên) |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `name` | 2–50 ký tự, unique |
| `capacity` | 1–50 |
| `description` | ≤ 1000 ký tự |

## 3. Giao diện

- **Màn hình:** SCR-A04 – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint |
|---|---|
| GET | `/api/v1/admin/room-types` |
| POST | `/api/v1/admin/room-types` |
| PUT | `/api/v1/admin/room-types/{id}` |
| DELETE | `/api/v1/admin/room-types/{id}` (xóa cả `price_rules` của loại) |
| GET | `/api/v1/room-types` (public, dùng cho bộ lọc) |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| room_types | ✓ | ✓ | ✓ | ✓ |
| rooms | | ✓ | | |
| price_rules | | ✓ | | ✓ |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')` cho `/admin/**`.

## 6. Yêu cầu phi chức năng
- Validate FE + BE (NFR-06).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-ROM-04-01 | – | Tạo "VIP", sức chứa 10 | 201 |
| AC-ROM-04-02 | Có "VIP" | Tạo "VIP" | 409 |
| AC-ROM-04-03 | "VIP" có 5 phòng | Xóa | 409 `RESOURCE_IN_USE` |
| AC-ROM-04-04 | – | Sức chứa 0 | 400 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Loại phòng dùng chung toàn chuỗi (không theo chi nhánh) | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
