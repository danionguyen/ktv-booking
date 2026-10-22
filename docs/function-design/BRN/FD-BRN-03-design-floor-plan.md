# [FD-BRN-03] Thiết kế sơ đồ mặt bằng (Design Floor Plan)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-BRN-03 |
| Tên | Thiết kế sơ đồ mặt bằng (Design Floor Plan) |
| Module | BRN |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | A |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: A · FE: C / D |
| Task | KTV-42, KTV-52 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | A | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin kéo thả vị trí và kích thước từng phòng để dựng sơ đồ mặt bằng giống thực tế, phục vụ ROM-03.
- **Phạm vi:** trình chỉnh sơ đồ cho 1 chi nhánh, lưu tọa độ. **Ngoài phạm vi:** vẽ tường, cửa, nhiều tầng.
- **Actor:** Admin.
- **Ưu tiên:** Could (phương án dự phòng: sơ đồ dạng lưới tự động).
- **Tham chiếu:** A09 · 01-business §7 · SCR-A03 · FD-ROM-03, FD-ROM-05, FD-BRN-02.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`; chi nhánh có phòng.

### 2.2 Hậu điều kiện
- `rooms.pos_x, pos_y, width, height` và `branches.map_width, map_height` được lưu.

### 2.3 Luồng chính
1. Admin mở SCR-A03 cho một chi nhánh.
2. Hệ thống hiển thị canvas kích thước `map_width × map_height` (lưới snap 20px); phòng chưa có tọa độ nằm ở **khay bên trái**.
3. Admin kéo phòng từ khay vào canvas, kéo để di chuyển, kéo góc để đổi kích thước.
4. Bấm **"Lưu sơ đồ"** → gửi toàn bộ tọa độ.
5. Hệ thống validate và lưu trong 1 transaction.

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | 3 | Bấm "Tự sắp xếp" | FE xếp lưới tự động theo loại phòng |
| A2 | 4 | Rời trang khi chưa lưu | Cảnh báo `beforeunload` |
| E1 | 5 | Ô phòng chồng nhau hoặc ra ngoài canvas | 400 `VALIDATION_ERROR` `details.roomIds` (FE tô đỏ) |
| E2 | 5 | `roomId` không thuộc chi nhánh | 400 |

### 2.6 Validate
- `0 ≤ posX`, `posX + width ≤ mapWidth` (tương tự trục Y); `width, height ≥ 60`; các hình chữ nhật không giao nhau.

## 3. Giao diện

- **Màn hình:** SCR-A03 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Khay phòng chưa đặt | List (draggable) | |
| 2 | Canvas | SVG / div + dnd-kit | Lưới snap 20px |
| 3 | Kích thước canvas | 2 InputNumber | |
| 4 | Nút "Tự sắp xếp", "Hoàn tác", "Lưu sơ đồ" | Button | |

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `PUT /api/v1/admin/branches/{id}/layout` |
| Quyền | `ADMIN` |
| Transaction | Có |

**Request**
```json
{ "mapWidth": 1000, "mapHeight": 600,
  "rooms": [ { "roomId": 12, "posX": 120, "posY": 40, "width": 160, "height": 100 } ] }
```
Lấy dữ liệu: dùng snapshot của ROM-03 `GET /branches/{id}/rooms`.

### 4.2 Các bước xử lý
- Kiểm tra giao nhau O(n²) (n ≤ 50 phòng – đủ nhanh).
- Phòng không có trong request → giữ nguyên tọa độ cũ.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| branches | | ✓ | ✓ | |
| rooms | | ✓ | ✓ | |

### 4.5 Tích hợp
- Không phát WS (khách tải lại sơ đồ sẽ thấy layout mới).

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`.

## 6. Yêu cầu phi chức năng
- Dùng tốt trên desktop ≥ 1280px; mobile chỉ xem.

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-BRN-03-01 | 10 phòng chưa có tọa độ | Kéo cả 10 vào canvas, lưu | 200; ROM-03 hiển thị đúng vị trí |
| AC-BRN-03-02 | – | 2 phòng chồng nhau, lưu | 400, 2 phòng tô đỏ |
| AC-BRN-03-03 | – | Bấm "Tự sắp xếp" | Mọi phòng có vị trí không chồng |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Nếu không kịp (Could) → ROM-03 dùng lưới tự động, seed tọa độ bằng SQL | Phạm vi | A | Open |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
