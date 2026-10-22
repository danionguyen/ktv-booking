# [FD-XXX-NN] Tên chức năng (English Name)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-XXX-NN |
| Tên | Tiếng Việt (English Name) |
| Module | XXX |
| Version | v0.1 |
| Trạng thái | Draft / Reviewed / Approved |
| Người viết | |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: · FE: |
| Task | KTV-xx |

**Lịch sử thay đổi**

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | YYYY-MM-DD | | Tạo mới |

## 1. Tổng quan

- **Mục đích:** chức năng giải quyết vấn đề gì, mang lại giá trị gì (1–3 câu).
- **Phạm vi:** trong phạm vi / ngoài phạm vi.
- **Actor:** chính / phụ.
- **Ưu tiên:** Must / Should / Could.
- **Tham chiếu:** tính năng gốc (Cxx/Sxx/Axx), BR-xx, NFR-xx, SCR-xx, FD liên quan.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
### 2.2 Hậu điều kiện
- Thành công:
- Thất bại:

### 2.3 Luồng chính
1. Actor …
2. Hệ thống …

### 2.4 Luồng thay thế / ngoại lệ

| Mã | Tại bước | Điều kiện | Xử lý |
|---|---|---|---|
| A1 | | | |
| E1 | | | |

### 2.5 Activity diagram
*(Mermaid; ghi "Không cần – luồng tuyến tính" nếu đơn giản)*

### 2.6 Quy tắc nghiệp vụ áp dụng

## 3. Giao diện

- **Màn hình:** SCR-xx – **Wireframe: TODO**
- **Điều hướng:** từ … → đến …

### 3.1 Danh sách item

| No | Item | Loại | Bắt buộc | Mặc định | Validate / Ghi chú |
|---|---|---|---|---|---|

### 3.2 Sự kiện

| No | Item | Sự kiện | Xử lý |
|---|---|---|---|

### 3.3 Thông báo

| Mã | Điều kiện | Nội dung |
|---|---|---|

## 4. Thiết kế xử lý

### 4.1 API

| Mục | Giá trị |
|---|---|
| Endpoint | `METHOD /api/v1/...` |
| Quyền | |
| Transaction | Có / Không |

**Request**
```json
```

**Response thành công**
```json
```

**Lỗi**

| HTTP | Code | Khi nào |
|---|---|---|

### 4.2 Các bước xử lý
1. …

### 4.3 Sequence diagram
```mermaid
sequenceDiagram
```

### 4.4 Dữ liệu tác động (CRUD)

| Bảng | C | R | U | D | Ghi chú |
|---|---|---|---|---|---|

### 4.5 Tích hợp / sự kiện
WebSocket, email, hệ thống ngoài…

## 5. Bảo mật & phân quyền

## 6. Yêu cầu phi chức năng

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-XXX-NN-01 | | | |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
