# 02 – Cấu trúc hệ thống

## 1. Kiến trúc tổng thể

```
┌──────────────────────┐        HTTPS (REST + JWT)        ┌───────────────────────────┐
│  React SPA (Vercel)  │ ───────────────────────────────► │  Spring Boot API          │
│  - Customer pages    │ ◄─────── WebSocket (STOMP) ───── │  (Render/Railway/VPS)     │
│  - Staff pages       │                                  │                           │
│  - Admin pages       │                                  │  ┌─────────────────────┐  │
└──────────┬───────────┘                                  │  │ Controller          │  │
           │ redirect                                     │  │ Service (nghiệp vụ) │  │
           ▼                                              │  │ Repository (JPA)    │  │
┌──────────────────────┐   IPN (server-to-server)         │  │ Scheduler (HOLD)    │  │
│  VNPay Sandbox       │ ───────────────────────────────► │  └─────────────────────┘  │
└──────────────────────┘                                  └─────┬───────────┬─────────┘
                                                                │ JDBC      │ SMTP
                                                                ▼           ▼
                                                        ┌────────────┐ ┌──────────┐
                                                        │ PostgreSQL │ │ Gmail /  │
                                                        │    16      │ │ Mailtrap │
                                                        └────────────┘ └──────────┘
```

- **Kiểu kiến trúc:** Monolith phân module theo domain (modular monolith) – phù hợp team 4 người, 1 tháng.
- **Phân tầng mỗi module:** `controller → service → repository → entity`, giao tiếp qua DTO.
- **Ảnh phòng:** lưu URL (Cloudinary free tier hoặc thư mục static) – không lưu binary trong DB.

## 2. Thiết kế dữ liệu

### 2.1 ERD (rút gọn)

```
branches 1───* rooms *───1 room_types 1───* price_rules
   │              │
   │ 1            │ 1
   *              *
 users 1───* bookings *───0..1 vouchers
                  │ 1
          ┌───────┼────────┬──────────┐
          *       *        0..1       │
  booking_items payments  reviews     │
          *                           │
          1                           │
     menu_items ──────────────────────┘
```

### 2.2 Bảng chi tiết

```sql
users(
  id BIGSERIAL PK, email VARCHAR UNIQUE NOT NULL, password_hash VARCHAR NOT NULL,
  full_name VARCHAR, phone VARCHAR, role VARCHAR NOT NULL,      -- CUSTOMER|STAFF|ADMIN
  branch_id BIGINT FK NULL,                                      -- chỉ dùng cho STAFF
  enabled BOOLEAN DEFAULT true, created_at TIMESTAMPTZ
)

branches(
  id BIGSERIAL PK, name VARCHAR, address VARCHAR, phone VARCHAR,
  open_time TIME, close_time TIME, map_width INT, map_height INT
)

room_types(
  id BIGSERIAL PK, name VARCHAR, capacity INT, description TEXT
)

rooms(
  id BIGSERIAL PK, branch_id FK, room_type_id FK, code VARCHAR,  -- UNIQUE(branch_id, code)
  status VARCHAR,                                                -- ACTIVE|MAINTENANCE
  pos_x INT, pos_y INT, width INT, height INT, images JSONB
)

price_rules(
  id BIGSERIAL PK, room_type_id FK, day_type VARCHAR,           -- WEEKDAY|WEEKEND|HOLIDAY
  start_hour TIME, end_hour TIME, price_per_hour NUMERIC(12,0)
)

holidays(date DATE PK, name VARCHAR)

bookings(
  id BIGSERIAL PK, code VARCHAR UNIQUE,                         -- VD: KTV-20261021-0001
  user_id FK NULL, guest_name VARCHAR, guest_phone VARCHAR,      -- walk-in không cần user
  room_id FK, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ,
  people INT, status VARCHAR, hold_expires_at TIMESTAMPTZ,
  room_amount NUMERIC, fnb_amount NUMERIC, discount NUMERIC, total NUMERIC,
  voucher_id FK NULL, payment_method VARCHAR,                    -- VNPAY|CASH
  cancel_reason TEXT, checked_in_at TIMESTAMPTZ, checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, version INT    -- optimistic lock
)

menu_items(
  id BIGSERIAL PK, name VARCHAR, category VARCHAR,              -- FOOD|DRINK|COMBO
  price NUMERIC, image VARCHAR, available BOOLEAN
)

booking_items(
  id BIGSERIAL PK, booking_id FK, menu_item_id FK,
  quantity INT, unit_price NUMERIC, created_at TIMESTAMPTZ
)

payments(
  id BIGSERIAL PK, booking_id FK, method VARCHAR, amount NUMERIC,
  status VARCHAR,                                                -- PENDING|SUCCESS|FAILED|REFUND_PENDING
  txn_ref VARCHAR UNIQUE, raw_response JSONB, paid_at TIMESTAMPTZ
)

vouchers(
  id BIGSERIAL PK, code VARCHAR UNIQUE, type VARCHAR,           -- PERCENT|FIXED
  value NUMERIC, max_discount NUMERIC, min_order NUMERIC,
  start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, usage_limit INT, used_count INT DEFAULT 0
)

reviews(
  id BIGSERIAL PK, booking_id FK UNIQUE, rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT, created_at TIMESTAMPTZ
)

refresh_tokens(id BIGSERIAL PK, user_id FK, token VARCHAR UNIQUE, expires_at TIMESTAMPTZ, revoked BOOLEAN)
```

### 2.3 Chống đặt trùng (BR-05, BR-06)

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_time, end_time + interval '15 minutes') WITH &&
  )
  WHERE (status IN ('HOLD', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'));
```

- Backend bắt `DataIntegrityViolationException` (SQLState `23P01`) → trả **HTTP 409** `ROOM_NOT_AVAILABLE`.
- Không cần lock ở tầng ứng dụng → an toàn kể cả khi chạy nhiều instance.

### 2.4 Index
```sql
CREATE INDEX idx_bookings_room_time ON bookings (room_id, start_time);
CREATE INDEX idx_bookings_user ON bookings (user_id, created_at DESC);
CREATE INDEX idx_bookings_hold ON bookings (hold_expires_at) WHERE status = 'HOLD';
```

## 3. API

**Base URL:** `/api/v1` · **Auth:** `Authorization: Bearer <access_token>` · Tài liệu đầy đủ tại `/swagger-ui.html`.

### 3.1 Format response

```json
// Thành công
{ "success": true, "data": { ... } }

// Phân trang
{ "success": true, "data": { "items": [...], "page": 0, "size": 20, "total": 135 } }

// Lỗi
{ "success": false, "error": { "code": "ROOM_NOT_AVAILABLE", "message": "Phòng đã có người đặt", "details": {} } }
```

### 3.2 Danh sách endpoint

| Nhóm | Method | Endpoint | Quyền |
|---|---|---|---|
| **Auth** | POST | `/auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` | Public |
| | POST | `/auth/forgot-password` · `/auth/reset-password` | Public |
| **User** | GET/PUT | `/users/me` | Customer+ |
| **Branch/Room** | GET | `/branches` · `/branches/{id}` | Public |
| | GET | `/branches/{id}/rooms` (kèm trạng thái hiện tại cho sơ đồ) | Public |
| | GET | `/rooms/availability?branchId&date&start&hours&people` | Public |
| | GET | `/rooms/{id}/price-quote?start&hours` | Public |
| **Booking** | POST | `/bookings/hold` | Customer |
| | DELETE | `/bookings/{id}/hold` | Customer |
| | POST | `/bookings/{id}/items` (đặt trước đồ ăn uống) | Customer |
| | POST | `/bookings/{id}/confirm` `{ paymentMethod, voucherCode }` | Customer |
| | GET | `/bookings/me` · `/bookings/{id}` | Customer |
| | POST | `/bookings/{id}/cancel` | Customer |
| **Payment** | POST | `/payments/vnpay/create` | Customer |
| | GET | `/payments/vnpay/return` | Public |
| | GET | `/payments/vnpay/ipn` | VNPay |
| **Voucher** | POST | `/vouchers/validate` | Customer |
| **Review** | POST | `/reviews` · GET `/rooms/{id}/reviews` | Customer / Public |
| **Staff** | GET | `/staff/bookings/today` (timeline) | Staff |
| | POST | `/staff/bookings` (walk-in) | Staff |
| | POST | `/staff/bookings/{id}/check-in` · `/check-out` · `/extend` | Staff |
| | POST | `/staff/bookings/{id}/items` | Staff |
| | GET | `/staff/bookings/{id}/invoice` | Staff |
| **Admin** | CRUD | `/admin/branches` · `/admin/rooms` · `/admin/room-types` · `/admin/price-rules` · `/admin/holidays` | Admin |
| | CRUD | `/admin/menu-items` · `/admin/vouchers` · `/admin/users` | Admin |
| | PUT | `/admin/branches/{id}/layout` (lưu vị trí phòng) | Admin |
| | GET | `/admin/bookings` (lọc, phân trang) · POST `/admin/bookings/{id}/cancel` | Admin |
| | GET | `/admin/stats/revenue?from&to&groupBy` · `/admin/stats/occupancy` · `/admin/stats/top-rooms` · `/admin/stats/top-items` | Admin |

### 3.3 WebSocket

| Thành phần | Giá trị |
|---|---|
| Endpoint | `/ws` (STOMP, SockJS fallback) |
| Topic | `/topic/branches/{branchId}/rooms` |
| Payload | `{ "roomId": 12, "status": "HOLD", "from": "...", "to": "...", "holdExpiresAt": "..." }` |
| Phát khi | hold, release, expire, confirm, cancel, check-in, check-out |

Backend phát sự kiện **sau khi transaction commit** (`@TransactionalEventListener(phase = AFTER_COMMIT)`).

### 3.4 Mã lỗi chính

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Dữ liệu không hợp lệ |
| `UNAUTHORIZED` / `TOKEN_EXPIRED` | 401 | Chưa đăng nhập / token hết hạn |
| `FORBIDDEN` | 403 | Không đủ quyền |
| `NOT_FOUND` | 404 | Không tìm thấy |
| `ROOM_NOT_AVAILABLE` | 409 | Phòng đã bị giữ / đặt |
| `HOLD_LIMIT_EXCEEDED` | 409 | Vượt quá 2 lượt giữ chỗ |
| `HOLD_EXPIRED` | 410 | Giữ chỗ đã hết hạn |
| `INVALID_STATE` | 422 | Thao tác không hợp lệ với trạng thái hiện tại |
| `CANCEL_NOT_ALLOWED` | 422 | Quá thời hạn hủy |
| `VOUCHER_INVALID` | 422 | Voucher hết hạn / hết lượt / không đủ điều kiện |

## 4. Cấu trúc thư mục

```
ktv-booking/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/java/com/ktv/booking/
│       │   ├── KtvBookingApplication.java
│       │   ├── config/            # SecurityConfig, JwtFilter, WebSocketConfig, CorsConfig, OpenApiConfig
│       │   ├── common/            # ApiResponse, ErrorCode, BusinessException, GlobalExceptionHandler, BaseEntity
│       │   ├── auth/              # AuthController, AuthService, JwtService, RefreshToken
│       │   ├── user/
│       │   ├── branch/
│       │   ├── room/              # Room, RoomType, AvailabilityService
│       │   ├── pricing/           # PriceRule, Holiday, PricingService
│       │   ├── booking/           # Booking, BookingService, BookingStateMachine, HoldExpiryScheduler
│       │   ├── menu/
│       │   ├── payment/           # VnPayService, PaymentController
│       │   ├── voucher/
│       │   ├── review/
│       │   ├── staff/
│       │   ├── stats/
│       │   ├── realtime/          # RoomStatusPublisher (WebSocket)
│       │   └── notification/      # EmailService + templates
│       │       # Mỗi module: controller/ service/ repository/ entity/ dto/ mapper/
│       ├── main/resources/
│       │   ├── application.yml
│       │   ├── application-dev.yml · application-prod.yml
│       │   ├── db/migration/      # V1__init.sql, V2__seed.sql, ...
│       │   └── templates/email/
│       └── test/java/com/ktv/booking/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx · App.tsx
│       ├── api/                   # axios instance, interceptors, endpoint functions
│       ├── hooks/                 # useAuth, useRoomStatus (WebSocket), ...
│       ├── stores/                # Zustand: auth, booking draft
│       ├── components/            # UI dùng chung
│       ├── layouts/               # CustomerLayout, StaffLayout, AdminLayout
│       ├── routes/                # router, ProtectedRoute, RoleGuard
│       ├── features/
│       │   └── room-map/          # ⭐ RoomMap, RoomCell, HoldCountdown, LayoutEditor
│       ├── pages/
│       │   ├── customer/          # Home, Search, RoomDetail, Checkout, PaymentResult, MyBookings, Profile
│       │   ├── staff/             # Timeline, BookingDetail, Invoice
│       │   └── admin/             # Dashboard, Branches, Rooms, PriceRules, Menu, Vouchers, Users, Bookings
│       ├── types/
│       └── utils/                 # format tiền, ngày giờ
├── docs/
├── docker-compose.yml             # postgres, backend, (frontend dev tùy chọn)
├── .github/workflows/ci.yml
└── README.md
```

## 5. Môi trường

| Môi trường | Frontend | Backend | Database |
|---|---|---|---|
| Local | `npm run dev` (5173) | `./mvnw spring-boot:run` (8080) | Docker Postgres (5432) |
| Production | Vercel | Render / Railway / VPS (Docker) | Postgres managed (Neon / Railway) |

Biến môi trường chính: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_RETURN_URL`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `FRONTEND_URL`, `VITE_API_URL`, `VITE_WS_URL`.
