# [FD-OPS-07] In hóa đơn (Print Invoice)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-OPS-07 |
| Tên | In hóa đơn (Print Invoice) |
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

- **Mục đích:** Cung cấp phiếu thanh toán cho khách sau check-out (hoặc phiếu tạm tính khi đang hát).
- **Phạm vi:** trang in khổ giấy nhiệt 80mm, in qua trình duyệt. **Ngoài phạm vi:** hóa đơn VAT điện tử.
- **Actor:** Staff.
- **Ưu tiên:** Must.
- **Tham chiếu:** S06 · SCR-S04 · FD-OPS-06.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đơn `CHECKED_IN` (in **tạm tính**) hoặc `COMPLETED` (in **hóa đơn**), cùng chi nhánh.

### 2.2 Hậu điều kiện
- Không đổi dữ liệu.

### 2.3 Luồng chính
1. Sau OPS-06 (tự động) hoặc bấm **"In hóa đơn"** trên SCR-S03.
2. FE mở SCR-S04, tải dữ liệu hóa đơn.
3. FE gọi `window.print()`; CSS `@media print` khổ 80mm.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 2 | Đơn `CHECKED_IN` | Tiêu đề "PHIẾU TẠM TÍNH" |
| A2 | – | In lại | Cho phép không giới hạn, thêm dòng "Bản in lại" |
| E1 | 2 | Trạng thái khác | 422 `INVALID_STATE` |

## 3. Giao diện

- **Màn hình:** SCR-S04 – **Wireframe: TODO**

### 3.1 Nội dung hóa đơn

| Phần | Nội dung |
|---|---|
| Header | Tên chi nhánh, địa chỉ, SĐT |
| Tiêu đề | "HÓA ĐƠN THANH TOÁN" / "PHIẾU TẠM TÍNH" · Số: `{code}` |
| Thông tin | Phòng, khách, giờ vào (`checked_in_at`), giờ ra, thời lượng tính tiền |
| Tiền phòng | Từng dòng breakdown khung giờ |
| Đồ ăn uống | Tên × SL × đơn giá = thành tiền |
| Tổng kết | Tạm tính · Giảm giá (mã) · **Tổng** · Đã thanh toán (VNPay) · Thu tại quầy · Tiền khách đưa · Tiền thối |
| Footer | Nhân viên, thời điểm in, "Cảm ơn quý khách!" |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `GET /api/v1/staff/bookings/{id}/invoice` |
| Quyền | `STAFF` (cùng chi nhánh), `ADMIN` |

```json
{ "success": true, "data": {
  "type": "FINAL", "code": "KTV-20261028-0007",
  "branch": { "name": "...", "address": "...", "phone": "..." },
  "room": "V02 – VIP", "customer": "Nguyễn Văn A",
  "checkedInAt": "...", "checkedOutAt": "...",
  "roomLines": [ { "from": "19:00", "to": "22:30", "unitPrice": 270000, "hours": 3.5, "amount": 945000 } ],
  "itemLines": [ { "name": "Trái cây thập cẩm", "quantity": 2, "unitPrice": 150000, "amount": 300000, "preordered": true },
                 { "name": "Nước suối", "quantity": 3, "unitPrice": 15000, "amount": 45000, "preordered": true },
                 { "name": "Bia Tiger", "quantity": 6, "unitPrice": 30000, "amount": 180000 } ],
  "subtotal": 1470000, "discount": 102000, "voucherCode": "KTV10", "total": 1368000,
  "payments": [ { "method": "VNPAY", "amount": 918000 }, { "method": "CASH", "amount": 450000 } ],
  "staffName": "Trần B", "printedAt": "..." } }
```

### 4.2 Các bước xử lý
- `roomLines` tính lại bằng PRC-01 trên `[start_time, end_time]` gốc **với giá đã chốt**: tách theo tỷ lệ – nếu lệch với `room_amount` (do đổi giá) thì hiển thị 1 dòng tổng `room_amount`.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| bookings, booking_items, payments, rooms, branches, users | | ✓ | | |

## 5. Bảo mật & phân quyền
- Cùng chi nhánh.

## 6. Yêu cầu phi chức năng
- In đẹp trên Chrome với khổ 80mm và A5.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-OPS-07-01 | Đơn KTV-20261028-0007: VNPay 918k, gia hạn 1h (+270k), gọi thêm 180k | Mở hóa đơn | Tổng 1.368.000, đã trả 918.000, thu tại quầy 450.000 – khớp JSON mẫu |
| AC-OPS-07-02 | Đơn CHECKED_IN | Mở | Tiêu đề "PHIẾU TẠM TÍNH" |
| AC-OPS-07-03 | – | Bấm In | Hộp thoại in của trình duyệt, bố cục 80mm |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | "Tiền khách đưa / tiền thối" không lưu DB → chỉ có ở lần in ngay sau check-out (truyền qua state FE) | Giả định | D | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
