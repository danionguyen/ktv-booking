# [FD-ROM-01] Xem thông tin phòng (View Room Details)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-ROM-01 |
| Tên | Xem thông tin phòng (View Room Details) |
| Module | ROM |
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

- **Mục đích:** Cho khách xem chi tiết một phòng (ảnh, loại, sức chứa, tiện ích, bảng giá, đánh giá) trước khi đặt.
- **Phạm vi:** trang chi tiết phòng. **Ngoài phạm vi:** viết đánh giá (REV-01).
- **Actor:** Guest, Customer.
- **Ưu tiên:** Must.
- **Tham chiếu:** C04 · SCR-C08, SCR-C06 · FD-BRN-01, FD-PRC-02, FD-REV-01, FD-ROM-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Phòng tồn tại (kể cả `MAINTENANCE` – vẫn xem được nhưng không đặt được).

### 2.2 Hậu điều kiện
- Không đổi dữ liệu.

### 2.3 Luồng chính
1. Khách bấm vào phòng từ SCR-C06 / SCR-C07.
2. Hệ thống trả: thông tin phòng, loại phòng, chi nhánh, gallery ảnh, bảng giá của loại phòng, điểm đánh giá trung bình + 5 đánh giá mới nhất.
3. Nếu URL có tham số tìm kiếm → hiển thị trạng thái trống/bận và giá dự tính cho khung đó + nút **"Chọn phòng"** (BKG-01).
4. Khách bấm "Xem thêm đánh giá" → tải trang tiếp.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Phòng `MAINTENANCE` | Banner "Phòng đang bảo trì", ẩn nút đặt |
| A2 | 2 | Chưa có đánh giá | "Chưa có đánh giá" |
| E1 | 2 | Không tồn tại | 404 → trang Not Found |

## 3. Giao diện

- **Màn hình:** SCR-C08 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Gallery | Carousel | `rooms.images` |
| 2 | Tiêu đề | Text | "{code} – {type}" · chi nhánh |
| 3 | Sức chứa, mô tả | Text | `room_types` |
| 4 | Bảng giá | Table | WEEKDAY / WEEKEND / HOLIDAY × khung |
| 5 | Đánh giá | Rate + List | Trung bình (1 chữ số thập phân), số lượt |
| 6 | Nút "Chọn phòng" | Button | Khi có tham số tìm kiếm và phòng trống |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/v1/rooms/{id}` → `{ id, code, status, images, roomType{...}, branch{id,name,address}, priceRules[...], rating{avg,count} }` | Public |
| GET | `/api/v1/rooms/{id}/reviews?page&size=5` | Public |
| GET | `/api/v1/rooms/availability?...&roomId={id}` (tái sử dụng ROM-02) | Public |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| rooms, room_types, branches, price_rules, reviews, bookings | | ✓ | | |

## 5. Bảo mật & phân quyền
- Public; đánh giá chỉ hiển thị tên rút gọn khách ("Nguyễn V. A.").

## 6. Yêu cầu phi chức năng
- Ảnh lazy-load, kích thước ≤ 300KB (Cloudinary transform).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-ROM-01-01 | Phòng V02 có 3 ảnh, 12 đánh giá TB 4.3 | Mở trang | Đủ ảnh, "4.3 (12)" và 5 đánh giá mới nhất |
| AC-ROM-01-02 | Phòng MAINTENANCE | Mở trang | Có banner, không có nút đặt |
| AC-ROM-01-03 | URL có tham số khung giờ trống | Mở trang | Có giá dự tính + nút "Chọn phòng" |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Thêm `GET /rooms/{id}` vào 02-architecture §3.2 | Bổ sung | A | Đã cập nhật |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
