# [FD-MNU-01] Quản lý menu đồ ăn uống (Manage Menu)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-MNU-01 |
| Tên | Quản lý menu đồ ăn uống (Manage Menu) |
| Module | MNU |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-28, KTV-35 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin quản lý danh mục đồ ăn uống và giá bán dùng cho đặt trước (BKG-04) và gọi món tại quầy (OPS-04).
- **Phạm vi:** danh sách, tạo, sửa, bật/tắt bán, xóa món; menu dùng chung toàn chuỗi.
- **Actor:** Admin.
- **Ưu tiên:** Should.
- **Tham chiếu:** A04 · BR-24 · SCR-A07 · FD-BKG-04, FD-OPS-04.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- `menu_items` cập nhật; đổi giá không ảnh hưởng đơn cũ (BR-24).

### 2.3 Luồng chính
1. Admin mở SCR-A07: lưới/bảng món (ảnh, tên, danh mục, giá, đang bán), lọc danh mục, tìm tên.
2. Thêm / sửa món qua form; bật/tắt **"Đang bán"** bằng switch (dùng khi hết hàng).
3. Xóa món chưa từng được gọi.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| E1 | 2 | Tên trùng trong cùng danh mục | 409 `DUPLICATE_CODE` |
| E2 | 3 | Món đã có trong `booking_items` | 409 `RESOURCE_IN_USE` – gợi ý tắt "Đang bán" |

### 2.6 Validate

| Field | Quy tắc |
|---|---|
| `name` | 2–100 ký tự |
| `category` | `FOOD` / `DRINK` / `COMBO` |
| `price` | ≥ 1.000, bội số 1.000 |
| `image` | URL (upload như ROM-05) |
| `available` | boolean, mặc định true |

## 3. Giao diện

- **Màn hình:** SCR-A07 – **Wireframe: TODO**

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint |
|---|---|
| GET | `/api/v1/admin/menu-items?category&available&q&page&size` |
| POST | `/api/v1/admin/menu-items` |
| PUT | `/api/v1/admin/menu-items/{id}` |
| PATCH | `/api/v1/admin/menu-items/{id}/availability` `{ available }` |
| DELETE | `/api/v1/admin/menu-items/{id}` |
| GET | `/api/v1/menu-items?category&available=true` (public – BKG-04, OPS-04) |

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| menu_items | ✓ | ✓ | ✓ | ✓ |
| booking_items | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')` cho `/admin/**`.

## 6. Yêu cầu phi chức năng
- Validate FE + BE.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-MNU-01-01 | – | Tạo "Bia Tiger", DRINK, 30.000 | 201, xuất hiện ở BKG-04 |
| AC-MNU-01-02 | Món đang bán | Tắt "Đang bán" | Không còn trong menu khách / quầy |
| AC-MNU-01-03 | Món đã được gọi | Xóa | 409 |
| AC-MNU-01-04 | Giá 25.500 | Lưu | 400 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Menu & giá dùng chung mọi chi nhánh | Giả định | PO | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
