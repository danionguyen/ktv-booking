# 01 – Nghiệp vụ

## 1. Phạm vi

Hệ thống phục vụ **một chuỗi karaoke có nhiều chi nhánh**:
- Khách hàng tìm và đặt phòng online, thanh toán trước hoặc trả tại quầy.
- Nhân viên quầy check-in/check-out, gọi thêm món, tính tiền.
- Admin quản lý toàn bộ dữ liệu và xem báo cáo.

**Ngoài phạm vi:** app mobile, quản lý kho nguyên liệu, chấm công nhân viên, chọn bài hát.

## 2. Vai trò

| Vai trò | Mô tả | Phạm vi dữ liệu |
|---|---|---|
| `GUEST` | Khách chưa đăng nhập | Xem chi nhánh, phòng, giá, tình trạng phòng |
| `CUSTOMER` | Khách đã đăng ký | Đặt phòng, thanh toán, xem lịch sử, đánh giá |
| `STAFF` | Nhân viên quầy | Chỉ chi nhánh mình được gán (`users.branch_id`) |
| `ADMIN` | Quản trị viên | Toàn hệ thống |

## 3. Danh sách tính năng

### 3.1 Khách hàng
| Mã | Tính năng | Ưu tiên |
|---|---|---|
| C01 | Đăng ký, đăng nhập (JWT), đăng xuất | MVP |
| C02 | Quên mật khẩu qua email | Could |
| C03 | Xem / sửa hồ sơ cá nhân | MVP |
| C04 | Xem danh sách chi nhánh, loại phòng, ảnh, sức chứa, bảng giá | MVP |
| C05 | Tìm phòng trống theo chi nhánh, ngày, giờ bắt đầu, số giờ, số người | MVP |
| C06 | ⭐ Sơ đồ phòng real-time + giữ chỗ 10 phút | Should |
| C07 | Đặt phòng (kèm đặt trước đồ ăn uống – tùy chọn) | MVP |
| C08 | Áp dụng voucher | Should |
| C09 | Thanh toán VNPay hoặc trả tại quầy | MVP (quầy) / Should (VNPay) |
| C10 | Xem lịch sử, chi tiết đặt phòng | MVP |
| C11 | Hủy đặt phòng theo chính sách | MVP |
| C12 | Email xác nhận đặt phòng | Should |
| C13 | Đánh giá phòng sau khi hát xong | Could |

### 3.2 Nhân viên
| Mã | Tính năng | Ưu tiên |
|---|---|---|
| S01 | Xem lịch phòng trong ngày (timeline theo phòng) | MVP |
| S02 | Tạo đặt phòng cho khách vãng lai (walk-in) | MVP |
| S03 | Check-in / check-out | MVP |
| S04 | Thêm món đồ ăn uống trong lúc hát | Should |
| S05 | Gia hạn giờ hát (nếu phòng còn trống) | Should |
| S06 | Tính tiền, xác nhận thanh toán tiền mặt, in hóa đơn | MVP |

### 3.3 Admin
| Mã | Tính năng | Ưu tiên |
|---|---|---|
| A01 | CRUD chi nhánh | MVP |
| A02 | CRUD loại phòng, phòng (bảo trì / hoạt động) | MVP |
| A03 | Bảng giá theo khung giờ / loại ngày | MVP |
| A04 | CRUD menu đồ ăn uống | Should |
| A05 | CRUD voucher | Should |
| A06 | Quản lý tài khoản, phân quyền, gán chi nhánh cho nhân viên | MVP |
| A07 | Quản lý toàn bộ đặt phòng (lọc, xem, hủy) | MVP |
| A08 | Dashboard: doanh thu, tỷ lệ lấp đầy, top phòng, top món | Should |
| A09 | Kéo thả sơ đồ mặt bằng phòng | Could |

## 4. Quy tắc nghiệp vụ

### 4.1 Đặt phòng
- **BR-01** Thời lượng tối thiểu **1 giờ**, bước tăng **30 phút**, tối đa **6 giờ**.
- **BR-02** Giờ bắt đầu phải ≥ thời điểm hiện tại + 30 phút và trong khoảng giờ mở cửa của chi nhánh; giờ kết thúc không vượt quá giờ đóng cửa (chi nhánh mở qua đêm thì tính sang ngày hôm sau).
- **BR-03** Chỉ được đặt trước tối đa **14 ngày**.
- **BR-04** Số người ≤ sức chứa của loại phòng.
- **BR-05** Một phòng **không được có 2 đặt phòng chồng giờ** ở các trạng thái `HOLD`, `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`. Đảm bảo bằng exclusion constraint ở DB (xem [02-architecture.md](02-architecture.md)).
- **BR-06** Giữa 2 lượt đặt liên tiếp có **15 phút dọn phòng** (buffer) – tính vào khoảng chặn trùng.
- **BR-07** Mỗi khách có tối đa **2 lượt giữ chỗ (`HOLD`)** cùng lúc để chống spam.
- **BR-08** Phòng ở trạng thái `MAINTENANCE` không hiển thị trong kết quả tìm kiếm.

### 4.2 Giữ chỗ tạm thời (tính năng nổi bật)
- **BR-10** Khi khách chọn phòng, tạo booking trạng thái `HOLD` với `hold_expires_at = now + 10 phút`.
- **BR-11** Trong thời gian giữ, phòng hiển thị 🟡 với mọi người khác.
- **BR-12** Job chạy mỗi 30 giây chuyển các `HOLD` hết hạn sang `EXPIRED` và phát sự kiện WebSocket để phòng chuyển 🟢.
- **BR-13** Khách có thể tự bỏ giữ chỗ → phòng mở lại ngay.

### 4.3 Tính giá
- **BR-20** Giá phòng = Σ (số giờ rơi vào từng khung giờ × đơn giá khung đó). Một lượt đặt có thể trải qua nhiều khung.
- **BR-21** Khung giờ mặc định (cấu hình được trong `price_rules`):

| Loại ngày | Khung | Ví dụ giá Standard |
|---|---|---|
| WEEKDAY (T2–T6) | 09:00–17:00 | 120.000đ/giờ |
| WEEKDAY | 17:00–02:00 | 180.000đ/giờ |
| WEEKEND (T7, CN) | cả ngày | 220.000đ/giờ |
| HOLIDAY | cả ngày | 250.000đ/giờ |

- **BR-22** Mỗi loại phòng có **bảng giá riêng** (`price_rules.room_type_id`), không dùng hệ số. Giá mẫu: VIP = Standard × 1.5, Party = Standard × 2 (xem [FD-PRC-01](function-design/PRC/FD-PRC-01-calculate-booking-price.md)).
- **BR-23** Tổng tiền = tiền phòng + tiền đồ ăn uống − giảm giá voucher. Làm tròn đến 1.000đ.
- **BR-24** Đơn giá được **chốt tại thời điểm đặt** (lưu vào `bookings.room_amount`, `booking_items.unit_price`); admin đổi giá sau đó không ảnh hưởng đơn cũ.

**Ví dụ:** Phòng Standard, thứ Tư 16:00–19:00 → 1 giờ × 120.000 + 2 giờ × 180.000 = **480.000đ**.

### 4.4 Voucher
- **BR-30** Loại `PERCENT` (có `max_discount`) hoặc `FIXED`.
- **BR-31** Điều kiện: còn hạn, còn lượt (`used_count < usage_limit`), tổng đơn ≥ `min_order`.
- **BR-32** Mỗi đơn chỉ áp 1 voucher. Tăng `used_count` khi đơn được `CONFIRMED`; hoàn lại khi đơn bị hủy.

### 4.5 Thanh toán
- **BR-40** `VNPAY`: thanh toán toàn bộ trước. Thành công → `CONFIRMED`. Thất bại / hết hạn → `EXPIRED`.
- **BR-41** `CASH` (trả tại quầy): đơn chuyển `CONFIRMED` ngay nhưng sẽ **tự hủy nếu khách không check-in sau 15 phút** kể từ giờ bắt đầu (no-show).
- **BR-42** Kết quả VNPay xác nhận qua **IPN** (server-to-server), không tin vào trang return phía client. Xử lý IPN phải **idempotent** theo `txn_ref`.
- **BR-43** Tiền đồ ăn uống gọi thêm tại quầy và giờ gia hạn được thanh toán khi check-out.
- **BR-44** Khi chọn VNPay, đơn chuyển `PENDING_PAYMENT` với hạn **15 phút** (`hold_expires_at = now + 15'`, khớp `vnp_ExpireDate`); quá hạn chưa có IPN thành công → `EXPIRED`.

### 4.6 Hủy đặt phòng
| Thời điểm hủy (so với giờ bắt đầu) | Hoàn tiền (nếu đã trả VNPay) |
|---|---|
| ≥ 24 giờ | 100% |
| 2 – 24 giờ | 50% |
| < 2 giờ | Không được hủy online (liên hệ quầy) |

- **BR-50** Hoàn tiền trong phạm vi dự án chỉ **ghi nhận** (tạo payment âm, trạng thái `REFUND_PENDING`), không gọi API hoàn tiền thật.
- **BR-51** Admin được hủy bất kỳ đơn nào kèm lý do.

### 4.7 Check-in / Check-out
- **BR-60** Check-in được từ **15 phút trước** giờ bắt đầu.
- **BR-61** Check-in muộn vẫn kết thúc đúng giờ đã đặt (không bù giờ).
- **BR-62** Gia hạn: chỉ khi khoảng tiếp theo còn trống, tính giá theo BR-20.
- **BR-63** Ra sớm không hoàn tiền giờ chưa dùng.
- **BR-64** Check-out → trạng thái `COMPLETED`, phòng chuyển sang dọn dẹp 15 phút (BR-06).

### 4.8 Đánh giá
- **BR-70** Chỉ đơn `COMPLETED` mới được đánh giá, mỗi đơn 1 lần, trong vòng 7 ngày. Điểm 1–5 sao + bình luận.

## 5. Vòng đời đặt phòng (State machine)

```
            ┌──────── hết 10 phút / khách bỏ ───────► EXPIRED
            │
 [chọn phòng] ─► HOLD ──(chọn VNPay)──► PENDING_PAYMENT ──(IPN thành công)──► CONFIRMED
            │                               │                                   │
            │                               └──(thất bại / hết hạn)──► EXPIRED  │
            └──(chọn trả tại quầy)─────────────────────────────────────────────►┤
                                                                                │
                         CANCELLED ◄──(khách/admin hủy, no-show)────────────────┤
                                                                                ▼
                                                     CHECKED_IN ──(check-out)──► COMPLETED
```

| Trạng thái | Chặn lịch phòng? | Màu trên sơ đồ |
|---|---|---|
| `HOLD` | Có | 🟡 |
| `PENDING_PAYMENT` | Có | 🟡 |
| `CONFIRMED` | Có | 🔴 |
| `CHECKED_IN` | Có | 🔴 (đang hát) |
| `COMPLETED`, `CANCELLED`, `EXPIRED` | Không | – |

## 6. Luồng nghiệp vụ chính

### 6.1 Khách đặt phòng online
1. Chọn chi nhánh, ngày, giờ, số giờ, số người.
2. Hệ thống trả danh sách / sơ đồ phòng trống kèm giá dự tính.
3. Chọn phòng → tạo `HOLD`, bắt đầu đếm ngược 10 phút.
4. (Tùy chọn) Chọn đồ ăn uống, nhập voucher.
5. Chọn phương thức thanh toán:
   - VNPay → chuyển sang cổng → IPN → `CONFIRMED` → email xác nhận.
   - Tại quầy → `CONFIRMED` → email xác nhận.
6. Đến giờ, khách đến quầy, nhân viên check-in.

### 6.2 Khách vãng lai tại quầy
1. Nhân viên xem timeline phòng trống.
2. Tạo đặt phòng (không cần tài khoản, nhập tên + SĐT) → `CHECKED_IN` ngay.
3. Gọi món trong lúc hát → check-out → tính tiền.

### 6.3 Check-out
1. Nhân viên chọn phòng đang hát → hệ thống tổng hợp: tiền phòng (đã trả / chưa trả), đồ ăn uống, gia hạn, voucher.
2. Thu tiền phần còn lại → in hóa đơn → `COMPLETED`.

## 7. Tính năng nổi bật: Sơ đồ phòng real-time + giữ chỗ

- Khách xem **sơ đồ mặt bằng** chi nhánh, mỗi phòng một ô màu: 🟢 trống · 🟡 đang giữ · 🔴 đã đặt/đang hát · ⚫ bảo trì.
- Trạng thái cập nhật **tức thì** qua WebSocket khi có người giữ / đặt / hủy / check-out.
- Có đồng hồ đếm ngược 10 phút trên trang thanh toán.
- Admin kéo thả vị trí phòng để dựng sơ đồ (lưu `pos_x`, `pos_y`).
- **Kịch bản demo:** mở 2 trình duyệt cạnh nhau, người A chọn phòng → màn hình người B đổi màu ngay; người B không thể đặt phòng đó.
- **Phương án dự phòng:** nếu trễ, bỏ kéo thả, hiển thị dạng lưới nhưng giữ real-time.

## 8. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-01 | Mật khẩu băm BCrypt; JWT access 15 phút + refresh 7 ngày |
| NFR-02 | Phân quyền theo role ở cả BE (`@PreAuthorize`) và FE (route guard) |
| NFR-03 | Thời gian phản hồi API < 500ms với dữ liệu demo |
| NFR-04 | Giao diện responsive (mobile ≥ 375px) |
| NFR-05 | Thời gian lưu `timestamptz`, hiển thị theo múi giờ `Asia/Ho_Chi_Minh` |
| NFR-06 | Validate input ở cả FE và BE; lỗi trả về format thống nhất |
| NFR-07 | Coverage unit test ≥ 60% cho module `booking`, `pricing` |
