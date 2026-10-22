# [FD-BKG-02] Bỏ giữ chỗ (Release Hold)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-02 |
| Tên | Bỏ giữ chỗ (Release Hold) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C |
| Task | KTV-24 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho khách chủ động trả lại phòng đang giữ để phòng mở lại ngay cho người khác, thay vì chờ hết 10 phút.
- **Phạm vi:** booking `HOLD` của chính khách. **Ngoài phạm vi:** hủy đơn đã xác nhận (BKG-07), đơn `PENDING_PAYMENT` (đang ở cổng VNPay).
- **Actor:** Customer.
- **Ưu tiên:** Must.
- **Tham chiếu:** C06 · BR-13 · SCR-C09 · FD-BKG-01, FD-BKG-03, FD-ROM-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Khách đã đăng nhập, là chủ booking.
- Booking ở trạng thái `HOLD`.

### 2.2 Hậu điều kiện
- **Thành công:** booking chuyển `EXPIRED` (`cancel_reason = 'RELEASED_BY_USER'`); món đặt trước (nếu có) bị xóa; phòng chuyển 🟢 trên mọi sơ đồ.
- **Thất bại:** không thay đổi dữ liệu.

### 2.3 Luồng chính
1. Khách bấm **"Bỏ giữ chỗ"** trên SCR-C09 (hoặc đóng tab và quay lại danh sách đơn đang giữ).
2. FE hiển thị hộp xác nhận.
3. Khách xác nhận → FE gọi API.
4. Hệ thống kiểm tra quyền sở hữu và trạng thái `HOLD`.
5. Hệ thống chuyển trạng thái `EXPIRED`, xóa `booking_items`.
6. Sau commit, phát sự kiện `RELEASED` lên topic chi nhánh.
7. FE quay về SCR-C07 với tham số tìm kiếm cũ.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Khách bấm "Hủy" trong hộp xác nhận | Đóng hộp, giữ nguyên |
| E1 | 4 | Không phải chủ booking | 403 `FORBIDDEN` |
| E2 | 4 | Booking đã `EXPIRED` (job đã chạy trước) | Trả **204** (idempotent), FE vẫn điều hướng |
| E3 | 4 | Booking ở trạng thái khác (`PENDING_PAYMENT`, `CONFIRMED`…) | 422 `INVALID_STATE` |

### 2.5 Activity diagram
Không cần – luồng tuyến tính.

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-13:** khách tự bỏ giữ chỗ → phòng mở lại ngay.

## 3. Giao diện

- **Màn hình:** SCR-C09 – **Wireframe: TODO**

### 3.2 Sự kiện

| No | Item | Sự kiện | Xử lý |
|---|---|---|---|
| 1 | Nút "Bỏ giữ chỗ" | Click | Mở `Modal.confirm` |
| 2 | Modal – "Đồng ý" | Click | Gọi API, toast thành công, điều hướng SCR-C07 |

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|
| MSG-BKG-04 | Hộp xác nhận | "Bỏ giữ phòng {code}? Phòng sẽ được mở cho khách khác." |
| MSG-BKG-05 | Thành công | "Đã bỏ giữ chỗ." |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `DELETE /api/v1/bookings/{id}/hold` |
| Quyền | `CUSTOMER` (chủ booking) |
| Transaction | Có |

**Response:** `204 No Content`

**Lỗi**

| HTTP | Code | Khi nào |
|---|---|---|
| 403 | `FORBIDDEN` | E1 |
| 404 | `NOT_FOUND` | Không có booking |
| 422 | `INVALID_STATE` | E3 |

### 4.2 Các bước xử lý
```
1. booking = repo.findByIdForUpdate(id) ?: NOT_FOUND
2. if booking.userId != currentUser → FORBIDDEN
3. if status == EXPIRED → return 204
4. if status != HOLD → INVALID_STATE
5. status = EXPIRED, cancelReason = 'RELEASED_BY_USER'; delete booking_items
6. publish RoomStatusEvent(RELEASED)  // AFTER_COMMIT
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D | Ghi chú |
|---|---|---|---|---|---|
| bookings | | ✓ | ✓ | | `status`, `cancel_reason`, `updated_at` |
| booking_items | | | | ✓ | Món đặt trước |

### 4.5 Tích hợp / sự kiện
- WebSocket: `{ roomId, status: "AVAILABLE", from, to }`.

## 5. Bảo mật & phân quyền
- Kiểm tra chủ sở hữu ở service; trả 403 chứ không 404 để FE xử lý rõ ràng (booking ID không phải dữ liệu nhạy cảm).

## 6. Yêu cầu phi chức năng
- Idempotent: gọi lại nhiều lần không lỗi.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-02-01 | Khách A đang HOLD phòng V02 | A bỏ giữ chỗ | 204; booking `EXPIRED`; sơ đồ khách B hiện V02 🟢 |
| AC-BKG-02-02 | HOLD đã bị job chuyển EXPIRED | A bỏ giữ chỗ | 204, không lỗi |
| AC-BKG-02-03 | Booking của khách B | A gọi API | 403 |
| AC-BKG-02-04 | Booking `CONFIRMED` | Gọi API | 422 `INVALID_STATE` |
| AC-BKG-02-05 | HOLD có 2 món đặt trước | Bỏ giữ chỗ | `booking_items` của đơn bị xóa |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Dùng `EXPIRED` cho cả "hết hạn" và "khách bỏ", phân biệt bằng `cancel_reason` – không thêm trạng thái mới | Giả định | A | Open |
| 2 | Có gọi `navigator.sendBeacon` để bỏ giữ chỗ khi khách đóng tab? Giả định: **không**, chờ job | Giả định | C | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
