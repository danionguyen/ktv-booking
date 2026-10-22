# [FD-BKG-04] Đặt trước đồ ăn uống (Pre-order Food)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-04 |
| Tên | Đặt trước đồ ăn uống (Pre-order Food) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: C |
| Task | KTV-28, KTV-32 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho khách chọn sẵn đồ ăn uống khi đặt phòng để quán chuẩn bị trước và khách thanh toán gộp một lần.
- **Phạm vi:** thêm / sửa / xóa món trên booking đang `HOLD`. **Ngoài phạm vi:** gọi món tại quầy (OPS-04).
- **Actor:** Customer.
- **Ưu tiên:** Should.
- **Tham chiếu:** C07 · BR-23, BR-24 · SCR-C09 · FD-BKG-01, FD-BKG-05, FD-MNU-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Khách là chủ booking ở trạng thái `HOLD` và còn hạn giữ chỗ.

### 2.2 Hậu điều kiện
- **Thành công:** danh sách `booking_items` của đơn được thay bằng danh sách mới; `fnb_amount`, `total` được tính lại; `unit_price` chốt theo giá hiện tại (BR-24).
- **Thất bại:** giỏ món giữ nguyên.

### 2.3 Luồng chính
1. Trên SCR-C09, khách mở khu vực **"Đồ ăn uống (tùy chọn)"**; FE tải menu đang bán.
2. Khách tăng / giảm số lượng từng món; FE tính tạm tổng tiền ngay trên client.
3. Khách bấm **"Lưu món"** (hoặc tự lưu khi chuyển sang bước thanh toán).
4. Hệ thống kiểm tra booking và từng món (`available = true`).
5. Hệ thống xóa các `booking_items` cũ của đơn và thêm danh sách mới với `unit_price = menu_items.price`.
6. Hệ thống tính lại `fnb_amount = Σ quantity × unit_price`, `total` (chưa trừ voucher – voucher áp ở BKG-05).
7. Trả về giỏ món và tổng tiền mới.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 3 | Danh sách rỗng | Xóa hết món, `fnb_amount = 0` |
| E1 | 4 | Booking không còn `HOLD` / đã hết hạn | 410 `HOLD_EXPIRED` |
| E2 | 4 | Món không tồn tại hoặc `available = false` | 422 `ITEM_UNAVAILABLE`, `details.menuItemIds` |
| E3 | 4 | `quantity` ≤ 0 hoặc > 50 | 400 `VALIDATION_ERROR` |

### 2.5 Activity diagram
Không cần – luồng tuyến tính.

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-23:** tổng = phòng + đồ ăn uống − voucher, làm tròn 1.000đ.
- **BR-24:** chốt `unit_price` tại thời điểm đặt.

## 3. Giao diện

- **Màn hình:** SCR-C09 – khu vực "Đồ ăn uống" – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Bắt buộc | Mặc định | Validate / Ghi chú |
|---|---|---|---|---|---|
| 1 | Tab danh mục | Tabs | – | Tất cả | FOOD / DRINK / COMBO |
| 2 | Thẻ món | Card | – | – | Ảnh, tên, giá |
| 3 | Số lượng | InputNumber | – | 0 | 0–50 |
| 4 | Tạm tính đồ ăn uống | Text | – | 0đ | |
| 5 | Nút "Lưu món" | Button | – | – | Disable khi không có thay đổi |

### 3.2 Sự kiện

| No | Item | Sự kiện | Xử lý |
|---|---|---|---|
| 1 | Số lượng | Change | Cập nhật tạm tính phía client |
| 2 | Nút "Lưu món" | Click | Gọi API, cập nhật tổng tiền từ response |
| 3 | Nút "Tiếp tục thanh toán" | Click | Nếu giỏ có thay đổi chưa lưu → lưu trước |

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|
| MSG-BKG-06 | E2 | "Món {name} vừa hết. Vui lòng bỏ chọn món này." |

## 4. Thiết kế xử lý

### 4.1 API

**Lấy menu (public)** – `GET /api/v1/menu-items?category=&available=true` → danh sách `{ id, name, category, price, image }`.

**Lưu giỏ món**

| Mục | Giá trị |
|---|---|
| Endpoint | `PUT /api/v1/bookings/{id}/items` (thay thế toàn bộ) |
| Quyền | `CUSTOMER` (chủ booking) |
| Transaction | Có |

**Request**
```json
{ "items": [ { "menuItemId": 3, "quantity": 2 }, { "menuItemId": 7, "quantity": 1 } ] }
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "items": [ { "menuItemId": 3, "name": "Trái cây thập cẩm", "quantity": 2, "unitPrice": 150000, "amount": 300000 } ],
    "roomAmount": 675000, "fnbAmount": 345000, "total": 1020000
  }
}
```

**Lỗi**

| HTTP | Code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` | E3, trùng `menuItemId` trong danh sách |
| 403 | `FORBIDDEN` | Không phải chủ booking |
| 410 | `HOLD_EXPIRED` | E1 |
| 422 | `ITEM_UNAVAILABLE` | E2 |

### 4.2 Các bước xử lý
```
1. booking = findByIdForUpdate(id); check owner; check status==HOLD && holdExpiresAt>now else HOLD_EXPIRED
2. menuItems = menuRepo.findAllById(ids); check tồn tại & available
3. bookingItemRepo.deleteByBookingId(id); insert mới với unit_price = menuItem.price
4. booking.fnbAmount = Σ; booking.total = round1000(roomAmount + fnbAmount)
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D | Ghi chú |
|---|---|---|---|---|---|
| bookings | | ✓ | ✓ | | `fnb_amount`, `total` |
| menu_items | | ✓ | | | |
| booking_items | ✓ | | | ✓ | Thay thế toàn bộ |

## 5. Bảo mật & phân quyền
- Chỉ chủ booking; giá luôn lấy từ DB, **không** nhận giá từ client.

## 6. Yêu cầu phi chức năng
- Phản hồi < 500ms.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-04-01 | Booking HOLD | Lưu 2 món | `fnbAmount`, `total` đúng; 2 dòng `booking_items` |
| AC-BKG-04-02 | Đã có 2 món | Lưu danh sách 1 món khác | Còn đúng 1 dòng |
| AC-BKG-04-03 | Món `available=false` | Lưu | 422 `ITEM_UNAVAILABLE` |
| AC-BKG-04-04 | HOLD đã hết hạn | Lưu | 410 |
| AC-BKG-04-05 | Admin đổi giá món sau khi lưu | Xem đơn | `unitPrice` giữ nguyên |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Đổi `POST /bookings/{id}/items` → `PUT` (thay thế toàn bộ) và thêm `GET /menu-items` public trong 02-architecture | Bổ sung | A | Đã cập nhật |
| 2 | Mã lỗi mới `ITEM_UNAVAILABLE` | Bổ sung | A | Đã thêm |
| 3 | Món đặt trước có bị hủy khi khách hủy đơn → có (theo đơn) | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
