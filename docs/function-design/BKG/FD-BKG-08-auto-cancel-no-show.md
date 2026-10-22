# [FD-BKG-08] Tự động hủy đơn không đến (Auto Cancel No-show)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-08 |
| Tên | Tự động hủy đơn không đến (Auto Cancel No-show) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: – |
| Task | KTV-43 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Giải phóng phòng khi khách đặt "trả tại quầy" không đến, tránh mất doanh thu từ khách vãng lai.
- **Phạm vi:** đơn `CONFIRMED` + `payment_method = CASH` quá 15 phút sau `start_time` chưa check-in. **Ngoài phạm vi:** đơn VNPay đã trả (xem mục 8).
- **Actor:** Hệ thống (Spring `@Scheduled`).
- **Ưu tiên:** Must.
- **Tham chiếu:** BR-41, BR-32 · FD-BKG-05, FD-OPS-03, FD-NTF-01, FD-ROM-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Scheduler bật.

### 2.2 Hậu điều kiện
- Đơn thỏa điều kiện chuyển `CANCELLED`, `cancel_reason = 'NO_SHOW'`; voucher hoàn lượt; phòng 🟢; email thông báo.

### 2.3 Luồng chính
1. Mỗi **60 giây**, job chạy.
2. Lấy đơn `CONFIRMED`, `CASH`, `start_time + 15' < now()` (`FOR UPDATE SKIP LOCKED`, tối đa 200).
3. Chuyển `CANCELLED`, hoàn lượt voucher.
4. Commit; phát WS `CANCELLED` cho từng phòng; gửi email "Đơn đã bị hủy do không đến".

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Nhân viên đang check-in đúng lúc job chạy | `SKIP LOCKED` + OPS-03 kiểm tra trạng thái trong transaction; nếu đơn vừa bị hủy → OPS-03 trả 422, nhân viên tạo walk-in |

### 2.5 Activity diagram
Không cần – luồng tuyến tính.

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-41:** CASH tự hủy nếu không check-in sau 15 phút kể từ giờ bắt đầu.
- **BR-60:** check-in mở từ 15 phút trước giờ bắt đầu → cửa sổ check-in hợp lệ là `[start − 15', start + 15']`.

## 3. Giao diện
Không có. Staff thấy đơn biến mất khỏi timeline (OPS-01) qua WebSocket.

## 4. Thiết kế xử lý

### 4.2 Các bước xử lý (`NoShowScheduler`)
```sql
SELECT id, room_id, voucher_id FROM bookings
WHERE status='CONFIRMED' AND payment_method='CASH'
  AND start_time + interval '15 minutes' < now()
LIMIT 200 FOR UPDATE SKIP LOCKED;

UPDATE bookings SET status='CANCELLED', cancel_reason='NO_SHOW', updated_at=now() WHERE id = ANY(:ids);
UPDATE vouchers SET used_count = used_count - 1 WHERE id = ANY(:voucherIds);
```
- `@Scheduled(fixedDelay = 60_000)`.
- Ngưỡng 15' cấu hình qua `app.booking.no-show-minutes`.

### 4.3 Sequence diagram

```mermaid
sequenceDiagram
  participant SC as NoShowScheduler
  participant DB as PostgreSQL
  participant WS as RoomStatusPublisher
  participant EM as EmailService
  loop mỗi 60 giây
    SC->>DB: SELECT CONFIRMED CASH quá hạn FOR UPDATE SKIP LOCKED
    SC->>DB: UPDATE → CANCELLED (NO_SHOW); voucher used_count-1
    SC->>DB: COMMIT
    SC->>WS: RoomStatus(CANCELLED) × n
    SC->>EM: sendNoShow(booking) × n (async)
  end
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings | | ✓ | ✓ | |
| vouchers | | | ✓ | |

## 5. Bảo mật & phân quyền
Nội bộ.

## 6. Yêu cầu phi chức năng
- Độ trễ tối đa: 15 phút + 60 giây sau giờ bắt đầu.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-08-01 | Đơn CASH bắt đầu 19:00, chưa check-in | 19:16 job chạy | `CANCELLED`, `NO_SHOW`, email gửi |
| AC-BKG-08-02 | Đơn CASH bắt đầu 19:00 | 19:14 job chạy | Không đổi |
| AC-BKG-08-03 | Đơn VNPay bắt đầu 19:00, chưa check-in | 19:16 job chạy | Không đổi |
| AC-BKG-08-04 | Đơn CASH đã `CHECKED_IN` | Job chạy | Không đổi |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Đơn **VNPay** không đến: hiện giữ `CONFIRMED` mãi. Đề xuất: sau `end_time` job chuyển `CANCELLED` (`NO_SHOW_PAID`), không hoàn tiền | Câu hỏi | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
