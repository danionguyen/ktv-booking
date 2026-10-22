# [FD-BKG-06] Xem lịch sử và chi tiết đặt phòng (View My Bookings)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-06 |
| Tên | Xem lịch sử và chi tiết đặt phòng (View My Bookings) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C |
| Task | KTV-27, KTV-33 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho khách tra cứu các đơn đã đặt, theo dõi trạng thái và thực hiện thao tác tiếp theo (thanh toán tiếp, hủy, đánh giá).
- **Phạm vi:** danh sách có phân trang + bộ lọc, chi tiết một đơn. Chỉ đơn của chính khách.
- **Actor:** Customer.
- **Ưu tiên:** Must.
- **Tham chiếu:** C10 · BR-70 · SCR-C11, SCR-C12 · FD-BKG-05, FD-BKG-07, FD-PAY-01, FD-REV-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Khách đã đăng nhập.

### 2.2 Hậu điều kiện
- Không thay đổi dữ liệu (chỉ đọc).

### 2.3 Luồng chính
1. Khách mở **"Đặt phòng của tôi"** (SCR-C11).
2. Hệ thống trả danh sách đơn của khách, mặc định tab **Sắp tới**, sắp xếp theo `start_time` tăng dần.
3. Khách đổi tab / lọc; hệ thống trả kết quả tương ứng.
4. Khách bấm một đơn → SCR-C12 hiển thị chi tiết: phòng, thời gian, món, tiền, thanh toán, lịch sử trạng thái, các nút hành động khả dụng.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Chưa có đơn nào | Empty state + nút "Đặt phòng ngay" |
| E1 | 4 | Đơn không thuộc khách | 404 `NOT_FOUND` (không lộ sự tồn tại) |

### 2.5 Activity diagram
Không cần.

### 2.6 Quy tắc hiển thị nút hành động

| Trạng thái | Nút hiển thị |
|---|---|
| `HOLD` | "Tiếp tục đặt" (→ SCR-C09), "Bỏ giữ chỗ" |
| `PENDING_PAYMENT` | "Thanh toán lại" (PAY-01) |
| `CONFIRMED` | "Hủy đặt phòng" nếu còn ≥ 2 giờ (BKG-07) |
| `COMPLETED` | "Đánh giá" nếu chưa đánh giá và ≤ 7 ngày (BR-70) |
| `CHECKED_IN`, `CANCELLED`, `EXPIRED` | Không có |

Backend trả cờ `actions` để FE không tự suy luận logic.

## 3. Giao diện

- **Màn hình:** SCR-C11, SCR-C12 – **Wireframe: TODO**

### 3.1 Danh sách item (SCR-C11)

| No | Item | Loại | Mặc định | Ghi chú |
|---|---|---|---|---|
| 1 | Tabs | Tabs | Sắp tới | Sắp tới (`HOLD`, `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`) · Đã hoàn thành (`COMPLETED`) · Đã hủy (`CANCELLED`, `EXPIRED`) |
| 2 | Thẻ đơn | List item | – | Mã, chi nhánh, phòng, ngày giờ, tổng tiền, tag trạng thái (màu) |
| 3 | Phân trang | Pagination | 10 / trang | |

## 4. Thiết kế xử lý

### 4.1 API

| Endpoint | Quyền | Mô tả |
|---|---|---|
| `GET /api/v1/bookings/me?group=UPCOMING\|DONE\|CANCELLED&page=0&size=10` | `CUSTOMER` | Danh sách |
| `GET /api/v1/bookings/{id}` | `CUSTOMER` (chủ) | Chi tiết |

**Response chi tiết**
```json
{
  "success": true,
  "data": {
    "id": 1024, "code": "KTV-20261028-0007", "status": "CONFIRMED",
    "branch": { "id": 1, "name": "KTV Cầu Giấy", "address": "..." },
    "room": { "id": 12, "code": "V02", "type": "VIP" },
    "startTime": "2026-10-28T19:00:00+07:00", "endTime": "2026-10-28T21:30:00+07:00", "people": 6,
    "items": [ { "name": "Trái cây thập cẩm", "quantity": 2, "unitPrice": 150000 } ],
    "roomAmount": 675000, "fnbAmount": 345000, "discount": 102000, "total": 918000,
    "paymentMethod": "VNPAY", "paidAmount": 918000,
    "actions": { "canCancel": true, "refundPercent": 100, "canReview": false, "canPay": false },
    "createdAt": "2026-10-21T15:00:00+07:00"
  }
}
```

### 4.2 Các bước xử lý
- Danh sách: `WHERE user_id = :me AND status IN (:group)`; sắp xếp `start_time ASC` (UPCOMING) hoặc `start_time DESC` (còn lại); index `idx_bookings_user`.
- `actions` tính bởi `BookingPolicy` – dùng chung với BKG-07 và REV-01.
- `paidAmount` = Σ payments `SUCCESS` − Σ refund.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings, rooms, branches, booking_items, payments, reviews | | ✓ | | |

## 5. Bảo mật & phân quyền
- Lọc theo `user_id` từ JWT; chi tiết đơn không phải của mình → 404.

## 6. Yêu cầu phi chức năng
- Tránh N+1: dùng `@EntityGraph` / fetch join cho room, branch.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-06-01 | Khách có 3 đơn sắp tới, 2 hoàn thành | Mở tab Sắp tới | Thấy 3 đơn, sắp xếp theo giờ |
| AC-BKG-06-02 | Đơn CONFIRMED, còn 30 giờ | Xem chi tiết | `canCancel=true`, `refundPercent=100` |
| AC-BKG-06-03 | Đơn của khách khác | Gọi chi tiết | 404 |
| AC-BKG-06-04 | Đơn COMPLETED 3 ngày trước, chưa đánh giá | Xem chi tiết | `canReview=true` |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Lịch sử trạng thái chi tiết (timeline) cần bảng `booking_events` – giả định **không làm**, chỉ hiển thị `created_at`, `checked_in_at`, `checked_out_at` | Giả định | A | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
