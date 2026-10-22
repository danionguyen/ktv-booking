# [FD-BRN-01] Xem danh sách và chi tiết chi nhánh (View Branches)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BRN-01 |
| Tên | Xem danh sách và chi tiết chi nhánh (View Branches) |
| Module | BRN |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: C |
| Task | KTV-08, KTV-30 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Trang chủ giới thiệu các chi nhánh và là điểm bắt đầu hành trình đặt phòng.
- **Phạm vi:** danh sách chi nhánh, chi tiết chi nhánh (giờ mở cửa, loại phòng, bảng giá tóm tắt), form tìm nhanh.
- **Actor:** Guest, Customer.
- **Ưu tiên:** Must.
- **Tham chiếu:** C04 · SCR-C05, SCR-C06 · FD-ROM-01, FD-ROM-02, FD-PRC-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Không.

### 2.2 Hậu điều kiện
- Không đổi dữ liệu.

### 2.3 Luồng chính
1. Khách mở trang chủ (SCR-C05): banner + **form tìm nhanh** (chi nhánh, ngày, giờ, số giờ, số người) + danh sách chi nhánh.
2. Khách bấm một chi nhánh → SCR-C06: địa chỉ, số điện thoại, giờ mở cửa, bản đồ (link Google Maps), các loại phòng có tại chi nhánh (ảnh đại diện, sức chứa, giá từ), bảng giá.
3. Khách bấm "Đặt phòng tại đây" → SCR-C07 với chi nhánh chọn sẵn; hoặc bấm loại phòng → danh sách phòng thuộc loại đó.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 1 | Chưa có chi nhánh | Empty state |
| E1 | 2 | Chi nhánh không tồn tại | 404 |

## 3. Giao diện

- **Màn hình:** SCR-C05, SCR-C06 – **Wireframe: TODO**

### 3.1 Danh sách item (SCR-C06)

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Thông tin chi nhánh | Descriptions | Tên, địa chỉ, SĐT (click-to-call), giờ mở cửa |
| 2 | Link bản đồ | Link | `https://maps.google.com/?q={address}` |
| 3 | Loại phòng | Card list | Ảnh, tên, sức chứa, "Giá từ {min}đ/giờ", số phòng |
| 4 | Bảng giá | Table | Từ `/branches/{id}/price-table` |
| 5 | Nút "Đặt phòng tại đây" | Button | |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Response |
|---|---|---|
| GET | `/api/v1/branches` | `[ { id, name, address, phone, openTime, closeTime, thumbnail, roomCount } ]` |
| GET | `/api/v1/branches/{id}` | Thông tin + `roomTypes: [ { id, name, capacity, roomCount, minPrice, thumbnail } ]` |
| GET | `/api/v1/branches/{id}/price-table` | Ma trận giá theo loại phòng (PRC-02) |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| branches, rooms, room_types, price_rules | | ✓ | | |

## 5. Bảo mật & phân quyền
- Public.

## 6. Yêu cầu phi chức năng
- Cache HTTP `Cache-Control: max-age=60` cho danh sách chi nhánh.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BRN-01-01 | 2 chi nhánh | Mở trang chủ | Thấy 2 thẻ chi nhánh + form tìm nhanh |
| AC-BRN-01-02 | Chi nhánh 1 có Standard (8), VIP (4) | Mở chi tiết | Thấy 2 loại, số phòng và "giá từ" đúng |
| AC-BRN-01-03 | – | Bấm "Đặt phòng tại đây" | SCR-C07 có chi nhánh chọn sẵn |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | `branches` chưa có cột ảnh đại diện – thêm `thumbnail VARCHAR` | Bổ sung | A | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
