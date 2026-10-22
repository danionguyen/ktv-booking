# [FD-OPS-04] Gọi thêm món (Add Order Items)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-OPS-04 |
| Tên | Gọi thêm món (Add Order Items) |
| Module | OPS |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-28, KTV-45, KTV-50 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Ghi nhận đồ ăn uống khách gọi trong lúc hát để tính tiền khi check-out.
- **Phạm vi:** thêm món, xóa món vừa thêm nhầm. Thanh toán ở OPS-06.
- **Actor:** Staff.
- **Ưu tiên:** Should.
- **Tham chiếu:** S04 · BR-23, BR-24, BR-43 · SCR-S03 · FD-MNU-01, FD-OPS-06, FD-BKG-04.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đơn `CHECKED_IN`, thuộc chi nhánh nhân viên.

### 2.2 Hậu điều kiện
- Thêm dòng `booking_items` (giá chốt), cập nhật `fnb_amount`, `total`.

### 2.3 Luồng chính
1. Trên SCR-S03, nhân viên bấm **"Thêm món"** → drawer menu (tìm kiếm, lọc danh mục).
2. Chọn món + số lượng → **"Xác nhận"**.
3. Hệ thống thêm các dòng mới (không gộp với dòng cũ để giữ lịch sử thời điểm gọi).
4. Tính lại tiền; FE cập nhật danh sách món và tạm tính.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | – | Xóa dòng thêm nhầm | Chỉ cho xóa dòng tạo trong vòng **10 phút** và đơn còn `CHECKED_IN` |
| E1 | 3 | Món ngừng bán | 422 `ITEM_UNAVAILABLE` |
| E2 | 3 | Đơn không `CHECKED_IN` | 422 `INVALID_STATE` |
| E3 | A1 | Quá 10 phút | 422 `INVALID_STATE` – "Liên hệ quản lý" |

## 3. Giao diện

- **Màn hình:** SCR-S03 – khu "Đồ ăn uống" + drawer chọn món – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Bảng món đã gọi | Table | Tên, SL, đơn giá, thành tiền, giờ gọi, nút xóa (≤ 10') |
| 2 | Drawer menu | Drawer + List | Tìm kiếm, tab danh mục, InputNumber |
| 3 | Tạm tính | Text | |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/v1/staff/bookings/{id}/items` | `{ "items": [ { "menuItemId": 3, "quantity": 2 } ] }` |
| DELETE | `/api/v1/staff/bookings/{id}/items/{itemId}` | – |

Quyền `STAFF` · Transaction có. Response: danh sách món + `fnbAmount`, `total`.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| booking_items | ✓ | ✓ | | ✓ |
| bookings | | ✓ | ✓ | |
| menu_items | | ✓ | | |

## 5. Bảo mật & phân quyền
- Cùng chi nhánh; giá lấy từ DB.

## 6. Yêu cầu phi chức năng
- < 300ms.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-OPS-04-01 | Đơn CHECKED_IN | Thêm 2 bia + 1 trái cây | 2 dòng mới, `fnbAmount` đúng |
| AC-OPS-04-02 | Dòng tạo 5' trước | Xóa | 204 |
| AC-OPS-04-03 | Dòng tạo 15' trước | Xóa | 422 |
| AC-OPS-04-04 | Đơn COMPLETED | Thêm món | 422 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Không quản lý tồn kho (ngoài phạm vi) | Giả định | PO | Closed |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
