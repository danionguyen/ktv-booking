# Phase 4 – Hoàn thiện, Kiểm thử, Triển khai (Tuần 4)

## Mục tiêu
Không thêm tính năng mới. Hoàn thiện dashboard, kiểm thử, sửa bug, deploy production và chuẩn bị demo.

## Task

| ID | Task | Người | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| KTV-60 | API thống kê: doanh thu theo ngày/tháng, tỷ lệ lấp đầy, top phòng, top món | B | 1 ngày | Phase 3 |
| KTV-61 | Dashboard admin (Recharts): thẻ KPI, biểu đồ doanh thu, lấp đầy, top | D | 1 ngày | KTV-60 |
| KTV-62 | Đánh giá phòng (BR-70) – API + UI (Could) | B, C | 1 ngày | Phase 3 |
| KTV-63 | Responsive, loading skeleton, empty state, thông báo lỗi thân thiện | C | 1,5 ngày | – |
| KTV-64 | Unit test bổ sung (booking, pricing, voucher, payment) – coverage ≥ 60% | A, B | 1,5 ngày | – |
| KTV-65 | Integration test với Testcontainers (exclusion constraint, IPN) | A | 1 ngày | – |
| KTV-66 | E2E Playwright: đặt phòng, thanh toán, check-in/out, admin CRUD | D | 1,5 ngày | – |
| KTV-67 | Bug bash cả team (test chéo: BE test FE, FE test BE) | Cả team | 0,5 ngày | – |
| KTV-68 | Sửa bug theo mức độ (Critical → High → Medium) | Cả team | 1,5 ngày | KTV-67 |
| KTV-69 | Deploy production: DB managed, BE Docker, FE Vercel, biến môi trường, HTTPS, CORS, WSS | A, D | 1 ngày | – |
| KTV-70 | Dữ liệu demo đẹp (ảnh phòng, lịch sử đặt 30 ngày để dashboard có số liệu) | B | 0,5 ngày | KTV-69 |
| KTV-71 | README, hướng dẫn cài đặt, tài khoản demo, cập nhật `docs/` | A | 0,5 ngày | – |
| KTV-72 | Slide + kịch bản demo + tổng duyệt | Cả team | 1 ngày | – |

## Lịch gợi ý

| Ngày | Trọng tâm |
|---|---|
| T2 | Dashboard, test bổ sung, responsive |
| T3 | E2E, integration test, **bug bash chiều** |
| T4 | Sửa bug, deploy production lần 1 |
| T5 | Sửa bug trên production, dữ liệu demo, tài liệu |
| T6 | Buffer + tổng duyệt demo |

## Phân loại bug

| Mức | Định nghĩa | Xử lý |
|---|---|---|
| Critical | Sai tiền, đặt trùng, mất dữ liệu, không đăng nhập được | Sửa ngay |
| High | Luồng chính bị chặn | Sửa trong ngày |
| Medium | Có cách đi vòng | Sửa nếu còn thời gian |
| Low | Giao diện, chính tả | Ghi lại, sửa sau demo |

## Checklist trước khi release
- [ ] Toàn bộ test CI xanh
- [ ] Không còn bug Critical / High
- [ ] Migration chạy sạch trên DB mới tinh
- [ ] `JWT_SECRET`, `VNPAY_HASH_SECRET` không nằm trong code
- [ ] CORS chỉ cho phép domain frontend
- [ ] WebSocket chạy qua `wss://`
- [ ] Đã đổi mật khẩu tài khoản admin mặc định
- [ ] Gọi warm-up server 5 phút trước demo

## Kịch bản demo (≈ 10 phút)
1. **Giới thiệu** (1') – bài toán, kiến trúc, tech stack.
2. **Khách hàng** (3') – tìm phòng → ⭐ mở 2 trình duyệt để show sơ đồ real-time → giữ chỗ → voucher → thanh toán VNPay → email.
3. **Nhân viên** (2') – timeline → check-in → thêm món → gia hạn → check-out → hóa đơn.
4. **Admin** (2') – dashboard doanh thu, quản lý bảng giá, kéo thả sơ đồ.
5. **Kỹ thuật** (2') – exclusion constraint chống trùng, test đồng thời, CI/CD.

## Deliverables cuối dự án
- [ ] URL production (FE + Swagger BE)
- [ ] Source code trên GitHub, nhánh `main` ổn định
- [ ] Thư mục `docs/` cập nhật đúng với thực tế
- [ ] README + tài khoản demo (admin / staff / customer)
- [ ] Slide trình bày
- [ ] Báo cáo test (coverage, danh sách E2E)
