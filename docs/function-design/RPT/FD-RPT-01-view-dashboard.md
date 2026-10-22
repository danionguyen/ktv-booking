# [FD-RPT-01] Xem dashboard thống kê (View Dashboard)

## 0. Thông tin tài liệu

| Mục | Nội dung |
|---|---|
| Mã chức năng | FD-RPT-01 |
| Tên | Xem dashboard thống kê (View Dashboard) |
| Module | RPT |
| Version | v0.1 |
| Trạng thái | Draft |
| Người viết | B |
| Người duyệt | A (kỹ thuật) · PO (nghiệp vụ) |
| Owner | BE: B · FE: D |
| Task | KTV-60, KTV-61 |

| Version | Ngày | Người | Nội dung |
|---|---|---|---|
| v0.1 | 2026-10-21 | B | Tạo mới |

## 1. Tổng quan

- **Mục đích:** Cho admin nắm nhanh tình hình kinh doanh: doanh thu, công suất phòng, phòng và món bán chạy.
- **Phạm vi:** KPI, biểu đồ doanh thu, tỷ lệ lấp đầy, top phòng, top món; lọc theo khoảng ngày và chi nhánh. **Ngoài phạm vi:** xuất Excel, so sánh kỳ trước.
- **Actor:** Admin.
- **Ưu tiên:** Should.
- **Tham chiếu:** A08 · SCR-A01.

## 2. Mô tả nghiệp vụ

### 2.1 Tiền điều kiện
- Đăng nhập `ADMIN`.

### 2.2 Hậu điều kiện
- Không đổi dữ liệu.

### 2.3 Luồng chính
1. Admin đăng nhập → SCR-A01, mặc định **30 ngày gần nhất**, tất cả chi nhánh.
2. Hệ thống trả KPI + dữ liệu biểu đồ.
3. Admin đổi khoảng ngày / chi nhánh / nhóm theo (ngày, tháng) → tải lại.

### 2.6 Định nghĩa chỉ số

| Chỉ số | Công thức |
|---|---|
| **Doanh thu** | Σ `payments.amount` có `status ∈ {SUCCESS, REFUND_PENDING}` theo `paid_at` (refund là số âm) – ghi nhận theo dòng tiền |
| **Số đơn hoàn thành** | Đếm `bookings` `COMPLETED` theo `checked_out_at` |
| **Giá trị đơn TB** | Doanh thu đơn COMPLETED / số đơn COMPLETED |
| **Tỷ lệ lấp đầy** | Σ giờ của đơn `CHECKED_IN` + `COMPLETED` ÷ Σ (số phòng `ACTIVE` × số giờ mở cửa mỗi ngày) |
| **Tỷ lệ hủy** | (`CANCELLED`) ÷ (`CONFIRMED` + `CHECKED_IN` + `COMPLETED` + `CANCELLED`) theo `start_time` |
| **Top phòng** | 5 phòng doanh thu (`room_amount`) cao nhất, đơn COMPLETED |
| **Top món** | 5 món có Σ `quantity` cao nhất trong đơn COMPLETED |

## 3. Giao diện

- **Màn hình:** SCR-A01 – **Wireframe: TODO**

### 3.1 Danh sách item

| No | Item | Loại | Ghi chú |
|---|---|---|---|
| 1 | Bộ lọc | RangePicker + Select chi nhánh + Segmented (Ngày/Tháng) | |
| 2 | 4 thẻ KPI | Statistic | Doanh thu · Số đơn · Giá trị TB · Tỷ lệ lấp đầy |
| 3 | Doanh thu theo thời gian | Line/Column chart (Recharts) | |
| 4 | Lấp đầy theo giờ trong ngày | Heatmap / Column | Giờ cao điểm |
| 5 | Top phòng, Top món | Bar ngang | |
| 6 | Tỷ lệ hủy | Statistic nhỏ | |

## 4. Thiết kế xử lý

### 4.1 API

| Method | Endpoint |
|---|---|
| GET | `/api/v1/admin/stats/summary?from&to&branchId` → KPI |
| GET | `/api/v1/admin/stats/revenue?from&to&branchId&groupBy=DAY\|MONTH` → `[ { period, amount } ]` |
| GET | `/api/v1/admin/stats/occupancy?from&to&branchId` → `{ rate, byHour: [ { hour, rate } ] }` |
| GET | `/api/v1/admin/stats/top-rooms?from&to&branchId&limit=5` |
| GET | `/api/v1/admin/stats/top-items?from&to&branchId&limit=5` |

### 4.2 Các bước xử lý
- Truy vấn SQL native (`date_trunc('day', paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`).
- Khoảng ngày tối đa 366 ngày.

### 4.4 Dữ liệu tác động

| Bảng | C | R | U | D |
|---|---|---|---|---|
| payments, bookings, booking_items, menu_items, rooms, branches | | ✓ | | |

## 5. Bảo mật & phân quyền
- `hasRole('ADMIN')`.

## 6. Yêu cầu phi chức năng
- Mỗi API < 500ms với dữ liệu demo 30 ngày (KTV-70).

## 7. Tiêu chí nghiệm thu

| Mã | Given | When | Then |
|---|---|---|---|
| AC-RPT-01-01 | Dữ liệu seed đã biết trước kết quả | Xem 30 ngày | KPI khớp kết quả tính tay |
| AC-RPT-01-02 | Có 1 refund −459.000 | Xem doanh thu ngày đó | Đã trừ refund |
| AC-RPT-01-03 | Chọn chi nhánh 1 | Xem | Chỉ số liệu chi nhánh 1 |
| AC-RPT-01-04 | Khoảng 400 ngày | Gọi API | 400 |

## 8. Vấn đề mở / Giả định

| # | Nội dung | Loại | Người xử lý | Trạng thái |
|---|---|---|---|---|
| 1 | Doanh thu ghi nhận theo dòng tiền (`paid_at`), không theo ngày hát | Giả định | PO | Open |
| 2 | Thêm API `stats/summary` vào 02-architecture | Bổ sung | A | Đã cập nhật |

## 9. Phê duyệt

| Vai trò | Người | Ngày | Kết quả |
|---|---|---|---|
| Tech Lead | A | | |
| PO / Trưởng nhóm | | | |
