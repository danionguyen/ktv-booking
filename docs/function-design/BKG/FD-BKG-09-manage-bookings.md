# [FD-BKG-09] Quản lý đặt phòng (Manage Bookings)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BKG-09 |
| Tên | Quản lý đặt phòng (Manage Bookings) |
| Module | BKG |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-29, KTV-36 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin tra cứu toàn bộ đơn trong hệ thống và xử lý các trường hợp đặc biệt (hủy kèm lý do).
- **Phạm vi:** danh sách lọc + phân trang, xem chi tiết, hủy đơn. **Ngoài phạm vi:** sửa thông tin đơn (đổi phòng / đổi giờ).
- **Actor:** Admin.
- **Ưu tiên:** Must.
- **Tham chiếu:** A07 · BR-50, BR-51 · SCR-A10 · FD-BKG-06, FD-BKG-07, FD-NTF-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập role `ADMIN`.

### 2.2 Hậu điều kiện
- Xem: không đổi dữ liệu.
- Hủy: đơn `CANCELLED` (`cancel_reason = 'ADMIN: <lý do>'`); nếu đã thanh toán → refund **100%** `REFUND_PENDING`; voucher hoàn lượt; phòng 🟢; email cho khách (nếu có email).

### 2.3 Luồng chính
1. Admin mở SCR-A10; hệ thống trả 20 đơn mới nhất.
2. Admin lọc theo chi nhánh, khoảng ngày (`start_time`), trạng thái, phương thức thanh toán, từ khóa (mã đơn / tên / SĐT / email).
3. Admin mở chi tiết một đơn (drawer).
4. (Hủy) Admin bấm **"Hủy đơn"**, nhập lý do bắt buộc, xác nhận.
5. Hệ thống hủy theo luồng BKG-07 nhưng **bỏ qua** giới hạn thời gian và hoàn 100%.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 4 | Đơn ở `COMPLETED`, `CANCELLED`, `EXPIRED` | 422 `INVALID_STATE` (FE ẩn nút) |
| E2 | 4 | Lý do trống | 400 `VALIDATION_ERROR` |
| A1 | 4 | Đơn `CHECKED_IN` | Cho phép hủy (sự cố phòng), refund 100% số đã trả |

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-51:** admin hủy bất kỳ đơn nào kèm lý do. Giả định hoàn 100% (lỗi phía quán).

## 3. Giao diện

- **Màn hình:** SCR-A10 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Mặc định | Ghi chú |
|---|---|---|---|---|
| 1 | Chi nhánh | Select | Tất cả | |
| 2 | Khoảng ngày | RangePicker | 7 ngày tới | Theo `start_time` |
| 3 | Trạng thái | Multi-select | Tất cả | |
| 4 | Phương thức | Select | Tất cả | VNPAY / CASH |
| 5 | Từ khóa | Input search | – | Debounce 400ms |
| 6 | Bảng | Table | 20 / trang | Mã, khách, SĐT, chi nhánh, phòng, giờ, tổng, PTTT, trạng thái, hành động |
| 7 | Drawer chi tiết | Drawer | – | Tái sử dụng component chi tiết đơn |

## 4. Thiết kế xử lý

### 4.1 API

| Endpoint | Mô tả |
|---|---|
| `GET /api/v1/admin/bookings?branchId&from&to&status=CONFIRMED,HOLD&method&q&page&size&sort=startTime,desc` | Danh sách |
| `GET /api/v1/admin/bookings/{id}` | Chi tiết (kèm payments) |
| `POST /api/v1/admin/bookings/{id}/cancel` `{ "reason": "Phòng hỏng điều hòa" }` | Hủy |

Quyền: `ADMIN` · Transaction: có (hủy).

### 4.2 Các bước xử lý
- Lọc động bằng JPA `Specification`.
- Hủy: tái sử dụng `BookingService.cancel(booking, CancelContext.admin(reason))`; `BookingPolicy` bỏ qua kiểm tra thời gian khi actor là admin.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings | | ✓ | ✓ | |
| payments | ✓ | ✓ | | |
| vouchers | | | ✓ | |
| users, rooms, branches | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`. Ghi log `INFO admin {id} cancelled booking {code}: {reason}`.

## 6. Yêu cầu phi chức năng
- Truy vấn danh sách < 500ms với 10.000 đơn (dùng index `idx_bookings_room_time` + thêm index `(start_time)` nếu cần).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BKG-09-01 | 50 đơn ở 2 chi nhánh | Lọc chi nhánh 1, trạng thái CONFIRMED | Chỉ đơn thỏa điều kiện |
| AC-BKG-09-02 | – | Tìm "0912" | Đơn có SĐT chứa "0912" |
| AC-BKG-09-03 | Đơn VNPay còn 1h | Admin hủy kèm lý do | `CANCELLED`, refund 100% |
| AC-BKG-09-04 | Đơn `COMPLETED` | Admin hủy | 422 |
| AC-BKG-09-05 | Đăng nhập STAFF | Gọi API | 403 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Admin hủy luôn hoàn 100% | Giả định | PO | Open |
| 2 | Xuất Excel danh sách đơn – ngoài phạm vi | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
