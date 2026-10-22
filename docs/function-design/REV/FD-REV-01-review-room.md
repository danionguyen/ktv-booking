# [FD-REV-01] Đánh giá phòng (Review Room)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-REV-01 |
| Tên | Đánh giá phòng (Review Room) |
| Module | REV |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: C |
| Task | KTV-62 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Thu thập phản hồi của khách sau khi hát để nâng chất lượng và giúp khách khác lựa chọn.
- **Phạm vi:** khách viết đánh giá cho đơn đã hoàn thành; hiển thị ở ROM-01. **Ngoài phạm vi:** sửa / xóa đánh giá, admin kiểm duyệt.
- **Actor:** Customer.
- **Ưu tiên:** Could.
- **Tham chiếu:** C13 · BR-70 · SCR-C12, SCR-C08 · FD-BKG-06, FD-ROM-01, FD-OPS-06.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đơn `COMPLETED` của chính khách, `checked_out_at ≥ now − 7 ngày`, chưa có đánh giá.

### 2.2 Hậu điều kiện
- 1 bản ghi `reviews` gắn với đơn; điểm trung bình phòng cập nhật.

### 2.3 Luồng chính
1. Khách mở SCR-C12 của đơn đã hoàn thành → bấm **"Đánh giá"**.
2. Chọn số sao (1–5), viết nhận xét (tùy chọn) → **"Gửi"**.
3. Hệ thống kiểm tra BR-70, lưu đánh giá.
4. FE hiển thị đánh giá đã gửi (chỉ đọc).

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 3 | Đơn chưa COMPLETED / quá 7 ngày / không phải chủ | 422 `REVIEW_NOT_ALLOWED` |
| E2 | 3 | Đã đánh giá | 409 `REVIEW_NOT_ALLOWED` (unique `booking_id`) |
| E3 | 3 | Rating ngoài 1–5 / comment > 1000 ký tự | 400 |

## 3. Giao diện

- **Màn hình:** SCR-C12 (form), SCR-C08 (hiển thị) – **Wireframe: TODO**

| No | Item | Loại | Bắt buộc | Validate |
|---|---|---|---|---|
| 1 | Số sao | Rate | ✓ | 1–5 |
| 2 | Nhận xét | TextArea | ✗ | ≤ 1000, đếm ký tự |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Quyền |
|---|---|---|
| POST | `/api/v1/reviews` `{ "bookingId": 1024, "rating": 5, "comment": "Âm thanh tốt" }` | `CUSTOMER` |
| GET | `/api/v1/rooms/{id}/reviews?page&size` | Public |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| reviews | ✓ | ✓ | | |
| bookings | | ✓ | | |

## 5. Bảo mật & phân quyền
- Escape nội dung khi hiển thị (React mặc định); tên khách hiển thị rút gọn.

## 6. Yêu cầu phi chức năng
- Điểm trung bình tính bằng truy vấn `AVG` (không cache) – đủ nhanh với quy mô dự án.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-REV-01-01 | Đơn COMPLETED 2 ngày trước | Đánh giá 5 sao | 201; hiển thị ở SCR-C08 |
| AC-REV-01-02 | Đã đánh giá | Gửi lại | 409 |
| AC-REV-01-03 | COMPLETED 8 ngày trước | Đánh giá | 422 |
| AC-REV-01-04 | Đơn CANCELLED | Đánh giá | 422 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Mã lỗi mới `REVIEW_NOT_ALLOWED` | Bổ sung | A | Đã thêm |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
