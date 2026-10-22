# [FD-OPS-05] Gia hạn giờ hát (Extend Session)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-OPS-05 |
| Tên | Gia hạn giờ hát (Extend Session) |
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

- **Mục đích:** Cho khách hát thêm khi phòng còn trống phía sau, tăng doanh thu.
- **Phạm vi:** kéo dài `end_time` của đơn `CHECKED_IN` theo bước 30'; tiền gia hạn thu khi check-out.
- **Actor:** Staff.
- **Ưu tiên:** Should.
- **Tham chiếu:** S05 · BR-05, BR-06, BR-20, BR-43, BR-62 · SCR-S03 · FD-PRC-01, FD-OPS-06, FD-ROM-03.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đơn `CHECKED_IN`, cùng chi nhánh; `now < end_time + 15'` (cho phép gia hạn trễ tối đa 15' sau giờ kết thúc).

### 2.2 Hậu điều kiện
- `end_time` mới; `room_amount += giá phần gia hạn`; `total` cập nhật; sơ đồ/timeline cập nhật.

### 2.3 Luồng chính
1. Nhân viên bấm **"Gia hạn"** trên SCR-S03.
2. FE gọi API xem trước: số phút tối đa có thể gia hạn (tới booking kế tiếp − 15' hoặc giờ đóng cửa) + giá cho từng lựa chọn.
3. Nhân viên chọn 30' / 1h / 1h30 / 2h (không vượt tối đa) → **"Xác nhận"**.
4. Hệ thống tính giá `[old_end, new_end)` (PRC-01), cập nhật `end_time` (exclusion constraint kiểm tra trùng).
5. Commit; WS `EXTENDED`.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Không còn chỗ (đơn kế tiếp ngay sau buffer) | `maxMinutes = 0` → FE ẩn lựa chọn, hiển thị "Phòng có khách lúc {time}" + gợi ý phòng khác cùng loại đang trống (chuyển phòng – ngoài phạm vi) |
| E2 | 4 | Có người vừa đặt chen vào | 409 `ROOM_NOT_AVAILABLE` → FE tải lại bước 2 |
| E3 | 4 | Vượt giờ đóng cửa | 400 |

### 2.6 Quy tắc nghiệp vụ áp dụng
- **BR-62:** chỉ khi còn trống, giá theo BR-20 (theo khung giờ của phần gia hạn).
- Gia hạn **không** bị giới hạn 6h của BR-01 (giả định, xem mục 8).

## 3. Giao diện

- **Màn hình:** SCR-S03 – modal gia hạn – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Giờ kết thúc hiện tại | Text | |
| 2 | Lựa chọn thời lượng | Radio button | 30' / 1h / 1h30 / 2h kèm giá; disable lựa chọn vượt `maxMinutes` |
| 3 | Giờ kết thúc mới | Text | |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/staff/bookings/{id}/extend-options` | `{ maxMinutes, options: [ { minutes: 30, newEnd, amount } ] }` |
| POST | `/api/v1/staff/bookings/{id}/extend` `{ "minutes": 60 }` | Gia hạn |

Quyền `STAFF` · Transaction có.

### 4.2 Các bước xử lý
```
b = findByIdForUpdate(id); check CHECKED_IN, branch, now < end + 15m
newEnd = b.end + minutes; check ≤ closeTime
extra = pricing.quote(room.type, b.end, newEnd)
b.end = newEnd; b.roomAmount += extra.total; b.total = recalc
flush → catch 23P01 → ROOM_NOT_AVAILABLE
publish RoomStatus(EXTENDED)
```

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings | | ✓ | ✓ | |
| price_rules | | ✓ | | |

## 5. Bảo mật & phân quyền
- Cùng chi nhánh.

## 6. Yêu cầu phi chức năng
- `maxMinutes` tính bằng 1 truy vấn booking kế tiếp của phòng.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-OPS-05-01 | Đang hát 19–21 (thứ Tư, Standard), phòng trống sau 21h | Gia hạn 1h | `end=22:00`, `roomAmount += 180.000` |
| AC-OPS-05-02 | Có đơn kế tiếp 22:00 | Xem options | `maxMinutes = 30` (21:00→21:30, buffer 15' → tối đa 21:45, làm tròn xuống bước 30') |
| AC-OPS-05-03 | Đang hát tới 16:30 thứ Tư | Gia hạn 1h | Giá = 0.5h × 120k + 0.5h × 180k |
| AC-OPS-05-04 | Đơn COMPLETED | Gia hạn | 422 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Tổng thời lượng sau gia hạn có bị giới hạn 6h không? Giả định: **không**, chỉ giới hạn bởi giờ đóng cửa | Câu hỏi | PO | Open |
| 2 | Không tách dòng "tiền gia hạn" riêng trong DB – hóa đơn hiển thị qua breakdown tính lại | Giả định | B | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
