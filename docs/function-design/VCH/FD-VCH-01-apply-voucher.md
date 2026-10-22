# [FD-VCH-01] Áp dụng voucher (Apply Voucher)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-VCH-01 |
| Tên | Áp dụng voucher (Apply Voucher) |
| Module | VCH |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: C |
| Task | KTV-44, KTV-49 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho khách nhập mã giảm giá, xem trước số tiền được giảm trước khi xác nhận đặt phòng.
- **Phạm vi:** kiểm tra và tính giảm giá (xem trước). Việc **ghi nhận** voucher vào đơn nằm ở BKG-05; tăng/giảm lượt dùng ở BKG-05, PAY-02, BKG-07.
- **Actor:** Customer.
- **Ưu tiên:** Should.
- **Tham chiếu:** C08 · BR-30, BR-31, BR-32 · SCR-C09 · FD-BKG-05, FD-VCH-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Khách có booking `HOLD` còn hạn.

### 2.2 Hậu điều kiện
- Không đổi dữ liệu. FE lưu `voucherCode` trong state để gửi kèm khi confirm.

### 2.3 Luồng chính
1. Khách nhập mã voucher, bấm **"Áp dụng"**.
2. Hệ thống tìm voucher theo `code` (không phân biệt hoa thường).
3. Kiểm tra: trong hạn `[start_at, end_at]`, `used_count < usage_limit`, `subtotal ≥ min_order` (BR-31).
4. Tính giảm giá:
   - `PERCENT`: `min(subtotal × value / 100, max_discount)`
   - `FIXED`: `min(value, subtotal)`
   - Làm tròn xuống 1.000đ.
5. Trả `discount` và `totalAfterDiscount`; FE hiển thị dòng giảm giá.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý (`VOUCHER_INVALID`, `details.reason`) |
|---|---|---|---|
| E1 | 2 | Không tồn tại | `NOT_FOUND` – "Mã không tồn tại" |
| E2 | 3 | Chưa tới / quá hạn | `EXPIRED` – "Mã đã hết hạn" |
| E3 | 3 | Hết lượt | `OUT_OF_USES` – "Mã đã hết lượt sử dụng" |
| E4 | 3 | Chưa đủ `min_order` | `MIN_ORDER` – "Áp dụng cho đơn từ {min_order}" |
| A1 | – | Khách gỡ voucher | FE xóa state, không gọi API |
| A2 | – | Khách đổi món sau khi áp voucher | FE gọi lại validate với subtotal mới |

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-30:** PERCENT (có trần) / FIXED. **BR-31:** điều kiện. **BR-32:** 1 voucher / đơn.

## 3. Giao diện

- **Màn hình:** SCR-C09 – ô voucher – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Validate / Ghi chú |
|---|---|---|---|
| 1 | Mã voucher | Input | 3–30 ký tự `[A-Z0-9]`, tự upper-case |
| 2 | Nút "Áp dụng" / "Gỡ" | Button | |
| 3 | Dòng giảm giá | Text | "−102.000đ (KTV10)" màu xanh |
| 4 | Lỗi | Text đỏ dưới ô nhập | Theo `details.reason` |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `POST /api/v1/vouchers/validate` |
| Quyền | `CUSTOMER` |
| Transaction | Không (read-only) |

**Request** `{ "code": "KTV10", "bookingId": 1024 }`
**Response 200**
```json
{ "success": true, "data": { "code": "KTV10", "type": "PERCENT", "value": 10, "subtotal": 1020000, "discount": 102000, "totalAfterDiscount": 918000 } }
```
**Lỗi:** 422 `VOUCHER_INVALID` `{ "details": { "reason": "MIN_ORDER", "minOrder": 500000 } }`.

### 4.2 Các bước xử lý
- `VoucherService.calculate(code, subtotal, now)` – **hàm thuần**, dùng chung cho validate và BKG-05.
- `subtotal` lấy từ booking ở server (`room_amount + fnb_amount`), không nhận từ client.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| vouchers | | ✓ | | |
| bookings | | ✓ | | |

## 5. Bảo mật & phân quyền
- Rate limit đơn giản 10 lần/phút/user để chống dò mã (tùy chọn – Could).

## 6. Yêu cầu phi chức năng
- Unit test đủ 4 nhánh lỗi + trần `max_discount` + FIXED lớn hơn subtotal.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-VCH-01-01 | KTV10: 10%, max 200k; subtotal 1.020.000 | Áp dụng | discount 102.000 |
| AC-VCH-01-02 | KTV10; subtotal 3.000.000 | Áp dụng | discount 200.000 (trần) |
| AC-VCH-01-03 | GIAM50K FIXED 50k, min 300k; subtotal 250k | Áp dụng | 422 `MIN_ORDER` |
| AC-VCH-01-04 | `used_count = usage_limit` | Áp dụng | 422 `OUT_OF_USES` |
| AC-VCH-01-05 | Nhập "ktv10" | Áp dụng | Nhận như "KTV10" |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Giới hạn mỗi khách dùng 1 mã bao nhiêu lần? Giả định: **không giới hạn theo khách** | Câu hỏi | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
