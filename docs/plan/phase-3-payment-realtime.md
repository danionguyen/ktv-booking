# Phase 3 – Thanh toán, Nhân viên, Tính năng nổi bật (Tuần 3)

## Mục tiêu
Hoàn thiện toàn bộ tính năng: thanh toán VNPay, voucher, email, màn hình quầy và **⭐ sơ đồ phòng real-time**. Cuối tuần **feature freeze**.

## Task

| ID | Task | Người | Ước lượng | Phụ thuộc |
|---|---|---|---|---|
| KTV-40 | Tích hợp VNPay: tạo URL, xử lý return, IPN idempotent, chuyển trạng thái (BR-40, BR-42) | A | 2 ngày | Phase 2 |
| KTV-41 | `WebSocketConfig` + `RoomStatusPublisher` phát sự kiện AFTER_COMMIT | A | 1 ngày | Phase 2 |
| KTV-42 | API `branches/{id}/rooms` kèm trạng thái hiện tại + API lưu layout | A | 0,5 ngày | KTV-41 |
| KTV-43 | Job hủy no-show đơn CASH (BR-41) | A | 0,5 ngày | Phase 2 |
| KTV-44 | Voucher: CRUD + validate + áp dụng khi confirm (BR-30 → BR-32) | B | 1 ngày | Phase 2 |
| KTV-45 | API nhân viên: timeline hôm nay, walk-in, check-in/out, gia hạn, thêm món, hóa đơn (mục 4.7) | B | 2 ngày | Phase 2 |
| KTV-46 | Email xác nhận / hủy đặt phòng (template Thymeleaf, gửi async) | B | 0,5 ngày | KTV-40 |
| KTV-47 | ⭐ Component `RoomMap` (SVG/CSS grid, màu theo trạng thái) + hook `useRoomStatus` (STOMP, auto reconnect, refetch) | C | 2 ngày | KTV-41, KTV-42 |
| KTV-48 | `HoldCountdown` + xử lý hết hạn trên trang checkout | C | 0,5 ngày | KTV-47 |
| KTV-49 | Chọn phương thức thanh toán, nhập voucher, trang kết quả thanh toán | C | 1,5 ngày | KTV-40, KTV-44 |
| KTV-50 | Màn hình quầy: timeline phòng trong ngày, tạo walk-in, check-in/out, thêm món, gia hạn, in hóa đơn | D | 3 ngày | KTV-45 |
| KTV-51 | Admin: voucher, quản lý user + gán chi nhánh | D | 1 ngày | KTV-44 |
| KTV-52 | Admin: trình kéo thả sơ đồ phòng (Could – làm nếu còn thời gian) | C / D | 1 ngày | KTV-42 |

## Chi tiết tính năng nổi bật

### Luồng sự kiện
```
Khách A chọn phòng 101
  → POST /bookings/hold
  → DB insert HOLD (commit)
  → RoomStatusPublisher gửi /topic/branches/1/rooms { roomId: 101, status: "HOLD" }
  → Mọi client đang mở sơ đồ chi nhánh 1 nhận event → phòng 101 chuyển 🟡

Hết 10 phút (hoặc A bỏ giữ)
  → Scheduler cập nhật EXPIRED → publish { roomId: 101, status: "AVAILABLE" } → 🟢
```

### Lưu ý kỹ thuật
- Sơ đồ hiển thị trạng thái **theo khoảng thời gian khách đang tìm**, không chỉ trạng thái hiện tại → FE lọc event theo `from/to` có giao với khung giờ đang xem.
- Khi reconnect WebSocket → refetch toàn bộ trạng thái để tránh lỡ event.
- Thời gian đếm ngược lấy từ `holdExpiresAt` do server trả về (không tự tính ở client).

## Checklist VNPay
- [ ] Đăng ký tài khoản sandbox, lấy `TMN_CODE`, `HASH_SECRET`
- [ ] Ký `vnp_SecureHash` bằng HMAC-SHA512, sắp xếp tham số đúng thứ tự
- [ ] IPN kiểm tra checksum, số tiền, trạng thái đơn; trả đúng `RspCode`
- [ ] IPN gọi lặp lại không làm đổi kết quả (idempotent)
- [ ] Hold hết hạn trong lúc đang ở cổng VNPay → xử lý hoàn tiền / báo lỗi
- [ ] Test bằng thẻ test NCB của sandbox

## Deliverables
- [ ] Thanh toán VNPay sandbox thành công end-to-end
- [ ] Sơ đồ phòng cập nhật real-time giữa nhiều trình duyệt
- [ ] Nhân viên xử lý trọn vòng: walk-in → check-in → thêm món → check-out → hóa đơn
- [ ] Voucher, email hoạt động
- [ ] **Feature freeze** – từ thứ Sáu chỉ sửa bug

## Tiêu chí nghiệm thu (Demo thứ Sáu)
1. Mở 2 trình duyệt; A chọn phòng → B thấy đổi 🟡 trong < 1 giây; B không đặt được phòng đó.
2. A thanh toán VNPay bằng thẻ test → phòng chuyển 🔴, A nhận email.
3. Nhân viên check-in đơn của A → thêm 3 món → check-out → hóa đơn đúng tổng tiền.
4. Áp voucher giảm 10% → tổng tiền đúng, `used_count` tăng.
