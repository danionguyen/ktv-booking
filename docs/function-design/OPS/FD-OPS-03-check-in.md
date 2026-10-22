# [FD-OPS-03] Check-in (Check In)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-OPS-03 |
| Tên | Check-in (Check In) |
| Module | OPS |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-45, KTV-50 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Xác nhận khách đã đến và giao phòng, bắt đầu phiên hát.
- **Phạm vi:** check-in đơn `CONFIRMED` (online). Walk-in đã check-in sẵn ở OPS-02.
- **Actor:** Staff.
- **Ưu tiên:** Must.
- **Tham chiếu:** S03 · BR-41, BR-60, BR-61 · SCR-S01, SCR-S03 · FD-OPS-01, FD-BKG-08, FD-ROM-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đơn `CONFIRMED`, thuộc chi nhánh nhân viên.
- `now ≥ start_time − 15'` (BR-60) và `now < end_time`.

### 2.2 Hậu điều kiện
- Đơn `CHECKED_IN`, `checked_in_at = now`; `end_time` không đổi (BR-61); phòng 🔴 "đang hát".

### 2.3 Luồng chính
1. Khách đến quầy, đọc **mã đơn** hoặc **SĐT**.
2. Nhân viên tìm trên SCR-S01, mở SCR-S03.
3. Nhân viên đối chiếu tên / SĐT / số người, bấm **"Check-in"**.
4. Hệ thống kiểm tra trạng thái và cửa sổ thời gian.
5. Cập nhật `CHECKED_IN`; phát WS; FE hiển thị "Đang hát – kết thúc lúc {end}".

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 4 | Khách đến muộn (VNPay) | Cho check-in, thời gian kết thúc giữ nguyên (BR-61) – FE nhắc "Còn {x} phút" |
| E1 | 4 | Sớm hơn 15' | 422 `CHECKIN_TOO_EARLY` – "Có thể check-in từ {start−15'}" |
| E2 | 4 | Đơn CASH đã bị hủy no-show (BKG-08) | 422 `INVALID_STATE` – gợi ý tạo walk-in |
| E3 | 4 | Đã quá `end_time` | 422 `INVALID_STATE` |
| E4 | 4 | Khác chi nhánh | 403 |

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-60:** sớm tối đa 15'. **BR-61:** muộn không bù giờ. **BR-41:** CASH quá 15' bị hủy.

## 3. Giao diện

- **Màn hình:** SCR-S03 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Thông tin đơn | Descriptions | Mã, khách, SĐT, phòng, giờ, số người, đã thanh toán / chưa |
| 2 | Nút "Check-in" | Button primary | Chỉ hiện khi `CONFIRMED`; disable + tooltip nếu quá sớm |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/staff/bookings/{id}/check-in` |
| Quyền | `STAFF` |
| Transaction | Có (`SELECT … FOR UPDATE`) |

**Response 200** – booking (`status: CHECKED_IN`, `checkedInAt`).
**Lỗi:** 403 · 404 · 422 `CHECKIN_TOO_EARLY` · 422 `INVALID_STATE`.

### 4.2 Các bước xử lý
```
b = findByIdForUpdate(id); check branch
if b.status != CONFIRMED → INVALID_STATE
if now < b.start - 15m → CHECKIN_TOO_EARLY
if now >= b.end → INVALID_STATE
b.status = CHECKED_IN; b.checkedInAt = now
publish RoomStatus(CHECKED_IN)
```
- Khóa `FOR UPDATE` tránh xung đột với job no-show (BKG-08 dùng `SKIP LOCKED`).

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings | | ✓ | ✓ | |

## 5. Bảo mật & phân quyền
- `STAFF` cùng chi nhánh; `ADMIN` được phép mọi chi nhánh.

## 6. Yêu cầu phi chức năng
- < 300ms.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-OPS-03-01 | Đơn 19:00, CONFIRMED | Check-in 18:50 | `CHECKED_IN` |
| AC-OPS-03-02 | Đơn 19:00 | Check-in 18:40 | 422 `CHECKIN_TOO_EARLY` |
| AC-OPS-03-03 | Đơn VNPay 19:00–21:00 | Check-in 19:40 | OK, `end_time` vẫn 21:00 |
| AC-OPS-03-04 | Đơn CASH đã NO_SHOW | Check-in | 422 `INVALID_STATE` |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Mã lỗi mới `CHECKIN_TOO_EARLY` (422) | Bổ sung | A | Đã thêm |
| 2 | Quét QR mã đơn từ email – ngoài phạm vi | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
