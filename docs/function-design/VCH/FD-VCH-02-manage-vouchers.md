# [FD-VCH-02] Quản lý voucher (Manage Vouchers)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-VCH-02 |
| Tên | Quản lý voucher (Manage Vouchers) |
| Module | VCH |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-44, KTV-51 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin tạo và quản lý mã giảm giá cho các chương trình khuyến mãi.
- **Phạm vi:** danh sách, tạo, sửa, vô hiệu hóa/xóa voucher.
- **Actor:** Admin.
- **Ưu tiên:** Should.
- **Tham chiếu:** A05 · BR-30, BR-31 · SCR-A08 · FD-VCH-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- Voucher được tạo / cập nhật / xóa trong bảng `vouchers`.

### 2.3 Luồng chính
1. Admin mở SCR-A08: bảng voucher (mã, loại, giá trị, thời hạn, đã dùng / giới hạn, trạng thái hiển thị *Sắp diễn ra / Đang chạy / Hết hạn / Hết lượt*).
2. **Tạo:** bấm "Thêm", nhập form, lưu.
3. **Sửa:** bấm "Sửa", chỉnh, lưu.
4. **Xóa:** bấm "Xóa", xác nhận.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Mã trùng | 409 `DUPLICATE_CODE` |
| E2 | 3 | Voucher đã có lượt dùng (`used_count > 0`) | Chỉ cho sửa `end_at`, `usage_limit` (≥ `used_count`); các field khác khóa |
| E3 | 4 | Voucher đã được dùng | Không xóa; thay bằng **kết thúc ngay** (`end_at = now`) – 409 `RESOURCE_IN_USE` nếu cố xóa |

### 2.6 Quy tắc / Validate

| Field | Quy tắc |
|---|---|
| `code` | 3–30 ký tự `[A-Z0-9]`, unique |
| `type` | `PERCENT` / `FIXED` |
| `value` | PERCENT: 1–100 · FIXED: ≥ 1.000, bội số 1.000 |
| `max_discount` | Bắt buộc với PERCENT, ≥ 1.000 |
| `min_order` | ≥ 0 |
| `start_at < end_at` | Bắt buộc |
| `usage_limit` | ≥ 1 |

## 3. Giao diện

- **Màn hình:** SCR-A08 (bảng + modal form) – **Wireframe: TODO**

### 3.1 Danh sách item (form)

| No | Item | Loại | Bắt buộc | Mặc định |
|---|---|---|---|---|
| 1 | Mã | Input | ✓ | – |
| 2 | Loại | Radio | ✓ | PERCENT |
| 3 | Giá trị | InputNumber | ✓ | – (hậu tố % hoặc đ theo loại) |
| 4 | Giảm tối đa | InputNumber | Khi PERCENT | – |
| 5 | Đơn tối thiểu | InputNumber | ✓ | 0 |
| 6 | Thời gian áp dụng | RangePicker (có giờ) | ✓ | – |
| 7 | Số lượt | InputNumber | ✓ | 100 |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/vouchers?q&status&page&size` | Danh sách |
| POST | `/api/v1/admin/vouchers` | Tạo |
| PUT | `/api/v1/admin/vouchers/{id}` | Sửa |
| DELETE | `/api/v1/admin/vouchers/{id}` | Xóa (chỉ khi `used_count = 0`) |

Quyền `ADMIN`. Lỗi: 400 `VALIDATION_ERROR`, 409 `DUPLICATE_CODE`, 409 `RESOURCE_IN_USE`.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| vouchers | ✓ | ✓ | ✓ | ✓ |
| bookings | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`.

## 6. Yêu cầu phi chức năng
- Validate ở cả FE và BE (NFR-06).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-VCH-02-01 | – | Tạo voucher PERCENT không có `max_discount` | 400 |
| AC-VCH-02-02 | Đã có KTV10 | Tạo KTV10 | 409 `DUPLICATE_CODE` |
| AC-VCH-02-03 | KTV10 đã dùng 5 lượt | Sửa `value` | 422 / field bị khóa trên FE |
| AC-VCH-02-04 | KTV10 đã dùng | Xóa | 409 `RESOURCE_IN_USE` |
| AC-VCH-02-05 | Voucher chưa dùng | Xóa | 204 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Mã lỗi mới `DUPLICATE_CODE`, `RESOURCE_IN_USE` (409) – dùng chung cho các màn CRUD | Bổ sung | A | Đã thêm |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
