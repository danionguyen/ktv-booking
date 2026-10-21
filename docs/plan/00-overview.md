# Kế hoạch tổng quan

## 1. Mốc thời gian

| Phase                                  | Tuần | Mục tiêu                                 | Mốc hoàn thành                                           |
| -------------------------------------- | ---- | ---------------------------------------- | -------------------------------------------------------- |
| [Phase 1](phase-1-foundation.md)       | 1    | Nền tảng & thiết kế                      | Đăng nhập được, admin CRUD phòng, DB chạy Docker         |
| [Phase 2](phase-2-core-booking.md)     | 2    | Luồng đặt phòng cốt lõi                  | Đặt phòng end-to-end (chưa thanh toán), không trùng lịch |
| [Phase 3](phase-3-payment-realtime.md) | 3    | Thanh toán, nhân viên, tính năng nổi bật | **Feature freeze** – đủ tính năng                        |
| [Phase 4](phase-4-release.md)          | 4    | Hoàn thiện, kiểm thử, triển khai         | Chạy trên URL public, đủ tài liệu, sẵn sàng demo         |

## 2. Phân công

| Thành viên | Vai trò                            | Phụ trách chính                                                        |
| ---------- | ---------------------------------- | ---------------------------------------------------------------------- |
| **A**      | Tech Lead + Backend                | Kiến trúc, auth/JWT, booking + hold, WebSocket, VNPay, review code     |
| **B**      | Backend                            | CRUD phòng/giá/menu/voucher, pricing, API nhân viên, thống kê, email   |
| **C**      | Frontend (Customer)                | Trang khách hàng, tìm phòng, ⭐ sơ đồ real-time, checkout, lịch sử     |
| **D**      | Frontend (Admin/Staff) + QA/DevOps | Trang admin, màn hình quầy, dashboard, Docker, CI/CD, deploy, E2E test |

## 3. Mức ưu tiên (thứ tự cắt khi trễ: Could → Should)

| Mức            | Tính năng                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **MVP (Must)** | Auth, CRUD chi nhánh/phòng/giá, tìm phòng trống, đặt/hủy phòng, chống trùng, trả tại quầy, check-in/out, admin cơ bản, lịch sử đặt |
| **Should**     | VNPay, ⭐ sơ đồ real-time + hold, đồ ăn uống, voucher, email xác nhận, dashboard, gia hạn giờ                                      |
| **Could**      | Đánh giá, kéo thả sơ đồ, quên mật khẩu, ngày lễ                                                                                    |

## 4. Rủi ro

| Rủi ro                                | Mức        | Cách xử lý                                                             | Người theo dõi |
| ------------------------------------- | ---------- | ---------------------------------------------------------------------- | -------------- |
| Race condition đặt trùng              | Cao        | Exclusion constraint DB + test đồng thời                               | A              |
| Sai lệch múi giờ                      | Trung bình | `timestamptz`, `Instant`, cố định `Asia/Ho_Chi_Minh`, test giờ qua đêm | B              |
| Tính giá qua nhiều khung giờ sai      | Trung bình | Unit test đầy đủ các case biên                                         | B              |
| VNPay sandbox lỗi / tích hợp chậm     | Trung bình | Làm từ đầu tuần 3; luôn có phương án trả tại quầy                      | A              |
| FE bị block chờ API                   | Trung bình | Chốt Swagger cuối tuần 1, FE dùng MSW mock                             | A, C, D        |
| WebSocket không ổn định khi deploy    | Trung bình | SockJS fallback + FE refetch khi reconnect                             | A, C           |
| Trễ tiến độ                           | Cao        | Feature freeze cuối tuần 3, cắt theo bảng ưu tiên, 1 ngày buffer       | A              |
| Hosting free cold start chậm khi demo | Thấp       | Gọi "warm-up" trước demo 5 phút                                        | D              |
| Xung đột merge                        | Thấp       | PR nhỏ, merge hằng ngày, review ≥ 1                                    | Cả team        |

## 5. Definition of Done (áp dụng mọi task)

- [ ] Code đã được review và merge vào `develop`
- [ ] CI xanh (build + lint + test)
- [ ] Logic nghiệp vụ quan trọng có unit test
- [ ] API cập nhật trên Swagger
- [ ] Giao diện kiểm tra trên desktop + mobile
- [ ] Không còn `console.log` / `System.out` thừa
