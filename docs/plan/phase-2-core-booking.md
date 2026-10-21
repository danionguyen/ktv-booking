# Phase 2 – Luồng đặt phòng cốt lõi (Tuần 2)

## Mục tiêu
Khách tìm được phòng trống, xem giá chính xác, giữ chỗ và đặt phòng (trả tại quầy). Hệ thống không bao giờ cho đặt trùng.

## Task

| ID | Task | Người | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| KTV-20 | Entity + CRUD `price_rules`, `holidays` | B | 0,5 ngày | Phase 1 |
| KTV-21 | `PricingService`: tính giá qua nhiều khung giờ, loại ngày (BR-20 → BR-24) + unit test | B | 1 ngày | KTV-20 |
| KTV-22 | API `price-quote` | B | 0,5 ngày | KTV-21 |
| KTV-23 | `AvailabilityService` + API tìm phòng trống (BR-01 → BR-08) | A | 1 ngày | Phase 1 |
| KTV-24 | API `bookings/hold`, `DELETE hold` (BR-07, BR-10, BR-13) | A | 1 ngày | KTV-23 |
| KTV-25 | Map lỗi exclusion constraint → 409 `ROOM_NOT_AVAILABLE`; test đồng thời 10 request | A | 0,5 ngày | KTV-24 |
| KTV-26 | `HoldExpiryScheduler` (BR-12) | A | 0,5 ngày | KTV-24 |
| KTV-27 | API `confirm` (CASH), `bookings/me`, `bookings/{id}`, `cancel` (BR-41, mục 4.6) | A | 1 ngày | KTV-24 |
| KTV-28 | CRUD menu + API thêm món vào booking | B | 1,5 ngày | Phase 1 |
| KTV-29 | API admin danh sách / lọc / hủy booking | B | 0,5 ngày | KTV-27 |
| KTV-30 | Trang chủ, danh sách chi nhánh, chi tiết loại phòng | C | 1 ngày | – |
| KTV-31 | Form tìm phòng + kết quả (dạng lưới) + giá dự tính | C | 1 ngày | KTV-23, KTV-22 |
| KTV-32 | Luồng checkout nhiều bước: chọn phòng → hold → chọn món → xác nhận | C | 1,5 ngày | KTV-24, KTV-27 |
| KTV-33 | Trang "Đặt phòng của tôi" + hủy | C | 0,5 ngày | KTV-27 |
| KTV-34 | Admin: bảng giá (theo loại phòng × loại ngày), ngày lễ | D | 1,5 ngày | KTV-20 |
| KTV-35 | Admin: menu | D | 1 ngày | KTV-28 |
| KTV-36 | Admin: danh sách đặt phòng (lọc theo chi nhánh, ngày, trạng thái) | D | 1,5 ngày | KTV-29 |

## Test case bắt buộc

### PricingService
| Case | Input | Kết quả mong đợi |
|---|---|---|
| Trong 1 khung | T4 10:00–12:00, Standard | 2 × 120.000 = 240.000 |
| Qua 2 khung | T4 16:00–19:00 | 120.000 + 2 × 180.000 = 480.000 |
| Qua nửa đêm | T6 23:00–01:00 | Xác định đúng loại ngày + khung |
| Cuối tuần | T7 20:00–22:00 | 2 × 220.000 |
| Ngày lễ | 01/01 | Áp giá HOLIDAY |
| Lẻ 30 phút | 1,5 giờ | Tính đúng nửa giờ |

### Booking
- [ ] 2 request hold cùng phòng cùng giờ → đúng 1 thành công, 1 nhận 409
- [ ] Hold → chờ hết hạn → phòng có thể đặt lại
- [ ] Đặt cách lượt trước < 15 phút → 409 (buffer)
- [ ] Hold lần thứ 3 → `HOLD_LIMIT_EXCEEDED`
- [ ] Hủy ≥ 24h / 2–24h / < 2h → đúng chính sách

## Deliverables
- [ ] Khách đặt phòng end-to-end (trả tại quầy)
- [ ] Giá hiển thị trên FE khớp giá BE tính
- [ ] Admin quản lý bảng giá, menu, xem đặt phòng
- [ ] Unit test pricing + booking chạy trong CI

## Tiêu chí nghiệm thu (Demo thứ Sáu)
1. Khách tìm phòng T7 20:00, 2 giờ, 6 người → thấy phòng phù hợp kèm giá.
2. Chọn phòng → thêm 2 món → xác nhận → booking xuất hiện trong "Đặt phòng của tôi".
3. Tài khoản khác tìm cùng giờ → phòng đó không còn trong kết quả.
4. Admin thấy booking mới trong danh sách.
