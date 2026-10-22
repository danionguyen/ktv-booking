# [FD-OPS-01] Xem lịch phòng trong ngày (View Daily Timeline)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-OPS-01 |
| Tên | Xem lịch phòng trong ngày (View Daily Timeline) |
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

- **Mục đích:** Màn hình làm việc chính của nhân viên quầy: thấy ngay phòng nào trống, phòng nào sắp có khách, phòng nào đang hát / sắp hết giờ.
- **Phạm vi:** timeline (Gantt) theo phòng của **chi nhánh nhân viên**, theo ngày; tìm đơn nhanh; cập nhật real-time.
- **Actor:** Staff.
- **Ưu tiên:** Must.
- **Tham chiếu:** S01 · BR-06, BR-60 · SCR-S01 · FD-ROM-03, FD-OPS-02→07.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `STAFF` và đã được gán chi nhánh (`users.branch_id`).

### 2.2 Hậu điều kiện
- Không đổi dữ liệu.

### 2.3 Luồng chính
1. Nhân viên đăng nhập → vào SCR-S01, mặc định **hôm nay**.
2. Hệ thống trả danh sách phòng của chi nhánh + các booking trong ngày kinh doanh (giờ mở → giờ đóng).
3. FE vẽ timeline: hàng = phòng, trục ngang = giờ; mỗi booking là 1 thanh màu theo trạng thái; vạch đỏ "bây giờ".
4. FE subscribe WS chi nhánh; có sự kiện → refetch.
5. Nhân viên bấm 1 thanh → SCR-S03 (chi tiết, các nút check-in / thêm món / gia hạn / check-out).
6. Nhân viên bấm vùng trống của phòng đang rảnh → mở SCR-S02 (walk-in) điền sẵn phòng.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Chọn ngày khác (±7 ngày) | Tải theo ngày |
| A2 | – | Tìm theo mã đơn / SĐT | Highlight thanh tương ứng, cuộn tới |
| E1 | 1 | Staff chưa được gán chi nhánh | 403 `FORBIDDEN` – "Liên hệ admin để được gán chi nhánh" |

### 2.6 Quy tắc hiển thị

| Trạng thái | Màu thanh | Cảnh báo |
|---|---|---|
| `HOLD`, `PENDING_PAYMENT` | Vàng nhạt, viền đứt | – |
| `CONFIRMED` | Xanh dương | Nhấp nháy khi tới giờ mà chưa check-in |
| `CHECKED_IN` | Đỏ | Viền cam khi còn ≤ 10' |
| `COMPLETED` | Xám | + khối 🔵 15' dọn phòng |
| `CANCELLED`, `EXPIRED` | Ẩn (bật tùy chọn "hiện đơn đã hủy") | – |

## 3. Giao diện

- **Màn hình:** SCR-S01 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Chọn ngày | DatePicker | Mặc định hôm nay |
| 2 | Ô tìm kiếm | Input | Mã đơn / SĐT / tên |
| 3 | Thống kê nhanh | Statistic × 4 | Đang hát · Sắp tới (2h) · Trống · Bảo trì |
| 4 | Timeline | Custom Gantt (CSS grid) | 1 cột = 30' |
| 5 | Nút "Khách vãng lai" | Button | → SCR-S02 |
| 6 | Chuyển "Sơ đồ" | Segmented | Tái sử dụng `RoomMap` (ROM-03, thêm trạng thái CLEANING) |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `GET /api/v1/staff/bookings/timeline?date=2026-10-28` |
| Quyền | `STAFF` (chi nhánh lấy từ user) – `ADMIN` được truyền thêm `branchId` |

```json
{ "success": true, "data": {
  "branch": { "id": 1, "openTime": "09:00", "closeTime": "02:00" },
  "rooms": [ { "id": 12, "code": "V02", "type": "VIP", "status": "ACTIVE",
    "bookings": [ { "id": 1024, "code": "KTV-20261028-0007", "status": "CONFIRMED",
                    "start": "...", "end": "...", "customerName": "Nguyễn Văn A", "phone": "0912xxx678",
                    "paymentMethod": "VNPAY", "people": 6 } ] } ] } }
```

### 4.2 Các bước xử lý
- Khoảng truy vấn: `[date + openTime, date + 1 + closeTime)` nếu qua đêm.
- `customerName` = `users.full_name` hoặc `guest_name`.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| rooms, bookings, users | | ✓ | | |

## 5. Bảo mật & phân quyền
- Staff chỉ xem chi nhánh của mình (bỏ qua `branchId` từ request). SĐT hiển thị đầy đủ cho staff (cần để liên hệ).

## 6. Yêu cầu phi chức năng
- < 500ms với 30 phòng × 20 đơn; hiển thị tốt trên tablet ≥ 1024px.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-OPS-01-01 | Staff chi nhánh 1 | Mở timeline | Chỉ thấy phòng chi nhánh 1 |
| AC-OPS-01-02 | Khách online vừa đặt CONFIRMED hôm nay | – | Thanh mới xuất hiện ≤ 2s |
| AC-OPS-01-03 | Staff chưa gán chi nhánh | Mở timeline | 403 + thông báo |
| AC-OPS-01-04 | Đơn CHECKED_IN còn 8' | Xem | Viền cam cảnh báo |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Đổi `GET /staff/bookings/today` → `/staff/bookings/timeline?date=` trong 02-architecture | Bổ sung | A | Đã cập nhật |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
