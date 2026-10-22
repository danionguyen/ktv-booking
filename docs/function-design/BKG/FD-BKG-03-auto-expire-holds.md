# [FD-BKG-03] Tự động giải phóng giữ chỗ hết hạn (Auto Expire Holds)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-03 |
| Tên | Tự động giải phóng giữ chỗ hết hạn (Auto Expire Holds) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: – |
| Task | KTV-26 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Đảm bảo phòng không bị khóa vô thời hạn khi khách giữ chỗ rồi bỏ đi hoặc không thanh toán xong.
- **Phạm vi:** booking `HOLD` (quá 10 phút) và `PENDING_PAYMENT` (quá 15 phút, BR-44) đã quá `hold_expires_at`.
- **Actor:** Hệ thống (Spring `@Scheduled`).
- **Ưu tiên:** Must.
- **Tham chiếu:** C06 · BR-10, BR-12, BR-40, BR-44 · FD-BKG-01, FD-PAY-01, FD-PAY-02, FD-ROM-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Ứng dụng đang chạy; scheduler được bật (`app.scheduler.enabled=true`).

### 2.2 Hậu điều kiện
- Mọi booking `HOLD` / `PENDING_PAYMENT` có `hold_expires_at < now()` chuyển `EXPIRED`.
- Payment `PENDING` tương ứng (nếu có) chuyển `FAILED`.
- Mỗi phòng được giải phóng phát 1 sự kiện WebSocket.

### 2.3 Luồng chính
1. Mỗi **30 giây**, job khởi chạy.
2. Truy vấn các booking hết hạn (tối đa 200 bản ghi / lượt), khóa `FOR UPDATE SKIP LOCKED`.
3. Với mỗi booking: chuyển `EXPIRED`, `cancel_reason = 'HOLD_TIMEOUT'` hoặc `'PAYMENT_TIMEOUT'`; payment `PENDING` → `FAILED`.
4. Commit; phát sự kiện `RELEASED` cho từng phòng.
5. Ghi log số bản ghi đã xử lý.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Không có bản ghi | Kết thúc, không log INFO |
| A2 | 2 | > 200 bản ghi | Lượt kế tiếp xử lý tiếp |
| E1 | 3 | IPN thành công tới **cùng lúc** với job | `SKIP LOCKED` + kiểm tra lại trạng thái trong IPN (PAY-02) – xem mục 8 |
| E2 | 3 | Lỗi DB | Rollback cả lượt, log ERROR, lượt sau chạy lại |

### 2.5 Activity diagram
Không cần – luồng tuyến tính.

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-10/BR-12:** HOLD sống 10 phút, job 30 giây.
- **BR-44:** PENDING_PAYMENT sống 15 phút (khớp `vnp_ExpireDate`).

## 3. Giao diện
Không có. FE nhận sự kiện qua WebSocket (ROM-03) và tự hết giờ theo countdown (BKG-01).

## 4. Thiết kế xử lý

### 4.2 Các bước xử lý (`HoldExpiryScheduler`)
```sql
-- trong 1 transaction
SELECT id, room_id, start_time, end_time, status FROM bookings
WHERE status IN ('HOLD','PENDING_PAYMENT') AND hold_expires_at < now()
ORDER BY hold_expires_at
LIMIT 200
FOR UPDATE SKIP LOCKED;

UPDATE bookings SET status='EXPIRED',
  cancel_reason = CASE status WHEN 'HOLD' THEN 'HOLD_TIMEOUT' ELSE 'PAYMENT_TIMEOUT' END,
  updated_at = now()
WHERE id = ANY(:ids);

UPDATE payments SET status='FAILED' WHERE booking_id = ANY(:ids) AND status='PENDING';
```
- `@Scheduled(fixedDelay = 30_000)`; dùng **fixedDelay** để 2 lượt không chồng nhau.
- Chạy nhiều instance: `SKIP LOCKED` đảm bảo không xử lý trùng (không cần ShedLock).

### 4.3 Sequence diagram

```mermaid
sequenceDiagram
  participant SC as HoldExpiryScheduler
  participant DB as PostgreSQL
  participant WS as RoomStatusPublisher
  participant C as Clients
  loop mỗi 30 giây
    SC->>DB: SELECT ... FOR UPDATE SKIP LOCKED
    DB-->>SC: danh sách hết hạn
    SC->>DB: UPDATE bookings → EXPIRED; payments → FAILED
    SC->>DB: COMMIT
    SC->>WS: RoomStatusEvent(RELEASED) × n
    WS-->>C: /topic/branches/{id}/rooms
  end
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D | Ghi chú |
|---|---|---|---|---|---|
| bookings | | ✓ | ✓ | | dùng index `idx_bookings_hold` (cần mở rộng cho `PENDING_PAYMENT` – xem mục 8) |
| payments | | | ✓ | | `PENDING` → `FAILED` |
| booking_items | | | | | Giữ lại để tra cứu |

## 5. Bảo mật & phân quyền
Chạy nội bộ, không có endpoint.

## 6. Yêu cầu phi chức năng
- Độ trễ giải phóng tối đa: 10 phút + 30 giây.
- Một lượt chạy < 1 giây với 200 bản ghi.
- Log: `INFO Expired {n} bookings` khi n > 0.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-03-01 | HOLD có `hold_expires_at = now - 1s` | Job chạy | Booking `EXPIRED`, `cancel_reason=HOLD_TIMEOUT` |
| AC-BKG-03-02 | HOLD còn hạn | Job chạy | Không đổi |
| AC-BKG-03-03 | PENDING_PAYMENT quá 15' | Job chạy | Booking `EXPIRED`, payment `FAILED` |
| AC-BKG-03-04 | Khách B xem sơ đồ | Job giải phóng phòng | Phòng chuyển 🟢 trên màn hình B |
| AC-BKG-03-05 | Booking vừa hết hạn | Khách khác hold cùng slot sau khi job chạy | 201 thành công |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Thêm **BR-44** (PENDING_PAYMENT hết hạn sau 15') vào 01-business | Bổ sung | A | Đã thêm |
| 2 | Index `idx_bookings_hold` cần đổi điều kiện thành `WHERE status IN ('HOLD','PENDING_PAYMENT')` | Bổ sung | A | Open |
| 3 | IPN thành công đến sau khi đơn đã `EXPIRED`: xử lý trong PAY-02 (thử khôi phục nếu slot còn trống, nếu không ghi `REFUND_PENDING`) | Rủi ro | A | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
