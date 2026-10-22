# [FD-PRC-02] Quản lý bảng giá và ngày lễ (Manage Price Rules)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-PRC-02 |
| Tên | Quản lý bảng giá và ngày lễ (Manage Price Rules) |
| Module | PRC |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-20, KTV-34 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin cấu hình đơn giá theo loại phòng × loại ngày × khung giờ, và danh sách ngày lễ.
- **Phạm vi:** CRUD `price_rules` (thao tác theo **cả bảng giá của 1 loại phòng**), CRUD `holidays`.
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A03 · BR-21, BR-22, BR-24 · SCR-A06 · FD-PRC-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`; đã có loại phòng (ROM-04).

### 2.2 Hậu điều kiện
- Bảng giá mới áp dụng cho **đơn tạo sau thời điểm lưu**; đơn cũ giữ giá đã chốt (BR-24). Cache giá bị xóa.

### 2.3 Luồng chính
1. Admin mở SCR-A06, chọn loại phòng → hệ thống hiển thị ma trận: hàng = khung giờ, cột = WEEKDAY / WEEKEND / HOLIDAY.
2. Admin thêm / sửa / xóa khung giờ và đơn giá trong ma trận.
3. Bấm **"Lưu bảng giá"** → gửi toàn bộ danh sách rule của loại phòng.
4. Hệ thống validate (bảng 2.6), thay thế toàn bộ rule cũ của loại phòng trong 1 transaction.
5. **Ngày lễ:** tab riêng, danh sách ngày + tên; thêm / xóa.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 4 | Các khung trong cùng loại ngày chồng nhau | 400 `VALIDATION_ERROR` `details.overlaps` |
| E2 | 4 | WEEKDAY hoặc WEEKEND không phủ hết giờ mở cửa của **mọi** chi nhánh | 400 `details.gaps` – "Thiếu giá 09:00–10:00 WEEKEND" |
| E3 | 4 | Giờ không phải bội số 30' / giá ≤ 0 | 400 |
| E4 | 5 | Ngày lễ trùng | 409 `DUPLICATE_CODE` |
| A1 | 4 | HOLIDAY trống | Cho phép (PRC-01 dùng WEEKEND) |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `dayType` | WEEKDAY / WEEKEND / HOLIDAY |
| `startHour`, `endHour` | `HH:mm`, bội số 30', `start ≠ end`; `end < start` = qua đêm |
| `pricePerHour` | ≥ 1.000, bội số 1.000 |

## 3. Giao diện

- **Màn hình:** SCR-A06 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Loại phòng | Select | |
| 2 | Ma trận giá | Editable table | Mỗi dòng: khung giờ (TimePicker range, bước 30') + giá cho từng loại ngày |
| 3 | Thanh phủ giờ | Visual bar 24h | Tô màu khung đã có giá – thấy ngay chỗ thiếu |
| 4 | Nút "Lưu bảng giá" | Button | |
| 5 | Tab Ngày lễ | Table + DatePicker | |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/admin/room-types/{id}/price-rules` | Bảng giá của loại phòng |
| PUT | `/api/v1/admin/room-types/{id}/price-rules` | Thay thế toàn bộ `[{ dayType, startHour, endHour, pricePerHour }]` |
| GET / POST / DELETE | `/api/v1/admin/holidays[/{date}]` | Ngày lễ |
| GET | `/api/v1/branches/{id}/price-table` | Public – dùng cho BRN-01 |

### 4.2 Các bước xử lý
```
PUT price-rules:
  validate từng rule; kiểm tra chồng lấn theo dayType; kiểm tra phủ giờ mở cửa (union các chi nhánh)
  DELETE FROM price_rules WHERE room_type_id=:id; INSERT all
  pricingCache.evictAll()
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| price_rules | ✓ | ✓ | | ✓ |
| holidays | ✓ | ✓ | | ✓ |
| branches | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`; endpoint price-table public chỉ đọc.

## 6. Yêu cầu phi chức năng
- Unit test thuật toán phát hiện chồng lấn / khoảng trống (có khung qua đêm).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-PRC-02-01 | – | Lưu WEEKDAY 09–17 120k, 17–02 180k; WEEKEND 09–02 220k | 200; báo giá PRC-01 đúng |
| AC-PRC-02-02 | – | WEEKDAY 09–17 và 16–20 | 400 chồng lấn |
| AC-PRC-02-03 | Chi nhánh mở 09:00 | WEEKEND bắt đầu 10:00 | 400 thiếu 09:00–10:00 |
| AC-PRC-02-04 | Đơn đã HOLD giá cũ | Đổi giá | Đơn cũ giữ `room_amount` |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Bảng giá dùng chung mọi chi nhánh (không có giá riêng theo chi nhánh) | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
