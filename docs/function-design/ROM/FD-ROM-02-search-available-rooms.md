# [FD-ROM-02] Tìm phòng trống (Search Available Rooms)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-ROM-02 |
| Tên | Tìm phòng trống (Search Available Rooms) |
| Module | ROM |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C |
| Task | KTV-23, KTV-31 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Giúp khách tìm nhanh những phòng còn trống phù hợp số người và khung giờ mong muốn, kèm giá dự tính.
- **Phạm vi:** form tìm kiếm, kết quả dạng lưới (MVP). Dạng sơ đồ real-time ở ROM-03.
- **Actor:** Guest, Customer.
- **Ưu tiên:** Must.
- **Tham chiếu:** C05 · BR-01→BR-06, BR-08 · SCR-C07 · FD-PRC-01, FD-ROM-03, FD-BKG-01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Không (public).

### 2.2 Hậu điều kiện
- Không đổi dữ liệu. Tham số tìm kiếm được đưa lên URL query (chia sẻ / quay lại được).

### 2.3 Luồng chính
1. Khách nhập: chi nhánh, ngày, giờ bắt đầu, số giờ, số người → **"Tìm phòng"**.
2. FE validate cơ bản, cập nhật URL, gọi API.
3. Hệ thống validate BR-01→BR-04 và giờ mở cửa chi nhánh.
4. Hệ thống lấy phòng `ACTIVE` của chi nhánh có sức chứa ≥ số người.
5. Với mỗi phòng, kiểm tra **có booking chặn lịch** chồng khoảng `[start, end + 15')` hoặc booking trước kết thúc trong `[start − 15', start)`.
6. Tính giá dự tính theo **loại phòng** (PRC-01 – mỗi loại tính 1 lần).
7. Trả danh sách nhóm theo loại phòng: phòng trống trước, phòng bận hiển thị mờ.
8. Khách bấm **"Chọn phòng"** trên phòng trống → BKG-01.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 7 | Không còn phòng trống | Empty state + gợi ý **3 khung giờ gần nhất còn trống** (±30', ±60', ±90') cho cùng tiêu chí |
| E1 | 3 | Vi phạm BR | 400 `VALIDATION_ERROR` theo field |
| E2 | 3 | Ngoài giờ mở cửa | 400 – "Chi nhánh mở cửa {open}–{close}" |

### 2.6 Quy tắc nghiệp vụ áp dụng
- BR-01 (1–6h, bước 30'), BR-02 (≥ now+30', trong giờ mở cửa), BR-03 (≤ 14 ngày), BR-04 (sức chứa), BR-05/06 (chặn lịch + buffer 15'), BR-08 (bỏ phòng bảo trì).

## 3. Giao diện

- **Màn hình:** SCR-C07 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Bắt buộc | Mặc định | Validate |
|---|---|---|---|---|---|
| 1 | Chi nhánh | Select | ✓ | Chi nhánh đầu tiên | |
| 2 | Ngày | DatePicker | ✓ | Hôm nay | Hôm nay → +14 ngày |
| 3 | Giờ bắt đầu | TimePicker | ✓ | Mốc 30' kế tiếp sau now+30' | Bước 30', trong giờ mở cửa |
| 4 | Số giờ | Select | ✓ | 2 | 1; 1.5; … ; 6 |
| 5 | Số người | InputNumber | ✓ | 4 | 1–30 |
| 6 | Chế độ xem | Segmented | – | Lưới | Lưới / Sơ đồ (ROM-03) |
| 7 | Thẻ phòng | Card | – | – | Ảnh, mã phòng, loại, sức chứa, giá dự tính, nút "Chọn phòng" |

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|
| MSG-ROM-01 | A1 | "Không còn phòng phù hợp lúc {time}. Thử các khung giờ sau:" |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `GET /api/v1/rooms/availability?branchId=1&start=2026-10-28T19:00:00%2B07:00&hours=2.5&people=6` |
| Quyền | Public |

**Response 200**
```json
{ "success": true, "data": {
  "start": "...", "end": "...",
  "groups": [ {
    "roomType": { "id": 2, "name": "VIP", "capacity": 10 },
    "quote": { "total": 675000, "breakdown": [ ... ] },
    "rooms": [ { "id": 12, "code": "V02", "available": true, "thumbnail": "..." },
               { "id": 13, "code": "V03", "available": false } ] } ],
  "suggestions": [] } }
```

### 4.2 Các bước xử lý – truy vấn
```sql
SELECT r.id, r.code, r.room_type_id,
       NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.room_id = r.id
           AND b.status IN ('HOLD','PENDING_PAYMENT','CONFIRMED','CHECKED_IN')
           AND tstzrange(b.start_time, b.end_time + interval '15 minutes')
               && tstzrange(:start, :end + interval '15 minutes')
       ) AS available
FROM rooms r JOIN room_types t ON t.id = r.room_type_id
WHERE r.branch_id = :branchId AND r.status = 'ACTIVE' AND t.capacity >= :people
ORDER BY t.capacity, r.code;
```
- Điều kiện chồng lấn **giống hệt** exclusion constraint để kết quả tìm kiếm và kết quả giữ chỗ nhất quán.
- `HOLD` đã quá `hold_expires_at` nhưng job chưa chạy: coi là **bận** (tối đa 30s) – chấp nhận.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| rooms, room_types, bookings, branches, price_rules, holidays | | ✓ | | |

## 5. Bảo mật & phân quyền
- Public. Không trả thông tin booking (chỉ boolean `available`).

## 6. Yêu cầu phi chức năng
- < 300ms cho chi nhánh 30 phòng; dùng index `idx_bookings_room_time` (cân nhắc GiST index của constraint).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-ROM-02-01 | V02 có đơn 17:00–19:00 | Tìm 19:00 | V02 `available=false` (buffer) |
| AC-ROM-02-02 | V02 có đơn 17:00–19:00 | Tìm 19:15 | V02 `available=true` |
| AC-ROM-02-03 | 6 người | Tìm | Không có phòng sức chứa < 6 |
| AC-ROM-02-04 | Phòng MAINTENANCE | Tìm | Không xuất hiện |
| AC-ROM-02-05 | Mọi phòng bận | Tìm | `suggestions` có ≤ 3 khung giờ khác |
| AC-ROM-02-06 | – | Ngày +15 | 400 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Gợi ý khung giờ khác (A1) là Should – có thể cắt nếu trễ | Phạm vi | A | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
