# Phase 1 – Nền tảng & Thiết kế (Tuần 1)

## Mục tiêu
Cả team thống nhất yêu cầu, thiết kế; dựng xong bộ khung BE/FE; có đăng nhập và CRUD phòng chạy được.

## Task

| ID | Task | Người | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| KTV-01 | Đọc & chốt [nghiệp vụ](../01-business.md), làm rõ điểm mơ hồ | Cả team | 0,5 ngày | – |
| KTV-02 | User flow + wireframe Figma (customer, staff, admin) | C, D | 1 ngày | KTV-01 |
| KTV-03 | Tạo repo, nhánh, board task, quy ước | A | 0,5 ngày | – |
| KTV-04 | Thiết kế ERD, viết `V1__init.sql` (kèm exclusion constraint) | A | 1 ngày | KTV-01 |
| KTV-05 | `V2__seed.sql`: 2 chi nhánh, 3 loại phòng, ~20 phòng, bảng giá, tài khoản mẫu | B | 0,5 ngày | KTV-04 |
| KTV-06 | Khởi tạo Spring Boot: cấu trúc package, `ApiResponse`, `GlobalExceptionHandler`, Swagger, CORS | A | 0,5 ngày | KTV-03 |
| KTV-07 | Auth: register, login, refresh, logout, JWT filter, phân quyền role | A | 2 ngày | KTV-06 |
| KTV-08 | CRUD chi nhánh, loại phòng, phòng (API admin + API public) | B | 2 ngày | KTV-06 |
| KTV-09 | Khởi tạo React: Vite, router, layouts, Ant Design theme, axios + interceptor refresh token | C | 1 ngày | KTV-03 |
| KTV-10 | Trang đăng ký, đăng nhập, hồ sơ; `ProtectedRoute`, `RoleGuard` | C | 1,5 ngày | KTV-09 |
| KTV-11 | Khung trang admin (layout, sidebar, bảng CRUD dùng chung) | D | 1 ngày | KTV-09 |
| KTV-12 | Trang admin: quản lý chi nhánh, loại phòng, phòng | D | 1,5 ngày | KTV-11, KTV-08 |
| KTV-13 | `docker-compose.yml` (Postgres + backend), Dockerfile backend | D | 0,5 ngày | KTV-06 |
| KTV-14 | GitHub Actions CI (BE build + test, FE lint + build) | D | 0,5 ngày | KTV-13 |
| KTV-15 | **Chốt hợp đồng API** cho Phase 2–3 trên Swagger (có thể là stub) | A, B | 0,5 ngày | KTV-04 |

## Lịch gợi ý

| Ngày | A | B | C | D |
|---|---|---|---|---|
| T2 | KTV-01, 03 | KTV-01 | KTV-01, 02 | KTV-01, 02 |
| T3 | KTV-04, 06 | KTV-05, 08 | KTV-09 | KTV-13, 14 |
| T4 | KTV-07 | KTV-08 | KTV-10 | KTV-11 |
| T5 | KTV-07 | KTV-08 | KTV-10 | KTV-12 |
| T6 | KTV-15, review | KTV-15 | Ghép API auth | KTV-12, demo |

## Deliverables
- [ ] Wireframe các màn hình chính
- [ ] Migration V1, V2 chạy được bằng `docker compose up`
- [ ] Đăng ký / đăng nhập / phân quyền hoạt động end-to-end
- [ ] Admin thêm / sửa / xóa chi nhánh, loại phòng, phòng trên giao diện
- [ ] Swagger đầy đủ endpoint Phase 2–3 (stub được)
- [ ] CI chạy trên mọi PR

## Tiêu chí nghiệm thu (Demo thứ Sáu)
1. `docker compose up` → BE + DB chạy, Swagger mở được.
2. Đăng ký tài khoản mới → đăng nhập → vào trang hồ sơ.
3. Đăng nhập admin → tạo phòng mới → thấy phòng trong danh sách.
4. Tài khoản customer truy cập `/admin` → bị chặn.
