# 03 – Ngôn ngữ & Công nghệ

## 1. Tổng quan

| Tầng     | Ngôn ngữ            | Framework / Thư viện chính     |
| -------- | ------------------- | ------------------------------ |
| Frontend | TypeScript 5        | React 18, Vite                 |
| Backend  | Java 21 (LTS)       | Spring Boot 3.3+               |
| Database | SQL (PostgreSQL 16) | Flyway                         |
| Hạ tầng  | YAML, Dockerfile    | Docker Compose, GitHub Actions |

## 2. Frontend

| Mục đích       | Thư viện                                         | Ghi chú                                                                             |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Build tool     | Vite + Yarn 1                                    | Dev server nhanh                                                                    |
| Routing        | React Router v6                                  | Route guard theo role                                                               |
| Gọi API, cache | TanStack Query + Axios                           | Interceptor tự refresh token                                                        |
| State toàn cục | Zustand                                          | Chỉ cho auth + booking draft                                                        |
| Styling        | Tailwind CSS v4                                  | Plugin `@tailwindcss/vite`, token màu trong `src/index.css`                         |
| UI component   | shadcn/ui (Radix UI) + lucide-react              | Copy component vào `src/components/ui/` bằng `yarn shadcn add <tên>`; Toast: sonner |
| Form           | React Hook Form + Zod                            | Dùng với component `form` / `field` của shadcn                                      |
| Ngày giờ       | Day.js (+ plugin timezone)                       | Múi giờ mặc định `Asia/Ho_Chi_Minh`                                                 |
| Biểu đồ        | Recharts                                         | Dashboard                                                                           |
| WebSocket      | @stomp/stompjs + sockjs-client                   | Sơ đồ phòng real-time                                                               |
| Kéo thả        | react-draggable / dnd-kit                        | Trình chỉnh sơ đồ phòng                                                             |
| Mock API       | MSW                                              | FE làm song song khi BE chưa xong                                                   |
| Test           | Vitest + React Testing Library, Playwright (E2E) |                                                                                     |
| Lint/format    | ESLint + Prettier                                |                                                                                     |

## 3. Backend

| Mục đích         | Thư viện                                                        |
| ---------------- | --------------------------------------------------------------- |
| Web              | spring-boot-starter-web                                         |
| Bảo mật          | spring-boot-starter-security + jjwt (JWT)                       |
| ORM              | spring-boot-starter-data-jpa (Hibernate 6)                      |
| Validate         | spring-boot-starter-validation                                  |
| Real-time        | spring-boot-starter-websocket (STOMP)                           |
| Email            | spring-boot-starter-mail + Thymeleaf template                   |
| Migration        | flyway-core + flyway-database-postgresql                        |
| Mapping DTO      | MapStruct                                                       |
| Giảm boilerplate | Lombok                                                          |
| Tài liệu API     | springdoc-openapi-starter-webmvc-ui                             |
| Test             | JUnit 5, Mockito, Spring Boot Test, Testcontainers (PostgreSQL) |
| Build            | Maven (wrapper `./mvnw`)                                        |

## 4. Database – vì sao chọn PostgreSQL

| Tiêu chí                         | PostgreSQL                            | MySQL                          |
| -------------------------------- | ------------------------------------- | ------------------------------ |
| Chống đặt trùng khoảng thời gian | ✅ Exclusion constraint + `tstzrange` | ❌ Phải tự lock ở ứng dụng     |
| Kiểu `timestamptz`               | ✅                                    | ⚠️ `TIMESTAMP` dễ lệch múi giờ |
| JSONB (ảnh, payload VNPay)       | ✅ Đánh index được                    | ⚠️ JSON cơ bản                 |
| Hosting miễn phí                 | Neon, Railway, Supabase               | Có nhưng ít hơn                |

## 5. Dịch vụ bên ngoài

| Dịch vụ               | Dùng cho           | Ghi chú                          |
| --------------------- | ------------------ | -------------------------------- |
| VNPay Sandbox         | Thanh toán online  | Đăng ký tại sandbox.vnpayment.vn |
| Gmail SMTP / Mailtrap | Email xác nhận     | Mailtrap cho dev                 |
| Cloudinary (free)     | Lưu ảnh phòng, món | Tùy chọn                         |
| Vercel                | Host frontend      |                                  |
| Render / Railway      | Host backend + DB  | Lưu ý cold start ở gói free      |

## 6. Quy ước code

### 6.1 Backend

- Package theo **domain** (`booking`, `room`, ...), không theo tầng.
- Tên class: `XxxController`, `XxxService`, `XxxRepository`, `XxxRequest`, `XxxResponse`.
- **Không trả Entity ra ngoài controller** – luôn map sang DTO.
- Logic nghiệp vụ nằm trong `service`; controller chỉ nhận request, validate, gọi service.
- Lỗi nghiệp vụ: `throw new BusinessException(ErrorCode.ROOM_NOT_AVAILABLE)` → `GlobalExceptionHandler` xử lý.
- Tiền dùng `BigDecimal`, thời gian dùng `Instant` / `OffsetDateTime`.
- Mọi thay đổi schema qua file Flyway mới (`V{n}__mo_ta.sql`), **không sửa file migration đã merge**.

### 6.2 Frontend

- Component: `PascalCase.tsx`; hook: `useXxx.ts`; util: `camelCase.ts`. Riêng `src/components/ui/` giữ tên `kebab-case.tsx` do shadcn sinh.
- Import theo alias thư mục: `@api/…`, `@components/…`, `@hooks/…`, `@layouts/…`, `@lib/…`, `@pages/…`, `@routes/…`, `@stores/…`, `@utils/…`, `@features/…`. Riêng types dùng `@/types/…` (TypeScript cấm import `@types/…`). Thêm alias mới thì sửa cả `vite.config.ts` lẫn `paths` trong `tsconfig.json` + `tsconfig.app.json`.
- Ghép class bằng `cn()` (`@lib/utils`); dùng token theme (`bg-primary`, `text-muted-foreground`, `bg-room-available`) thay vì mã màu cứng.
- Mỗi API một hàm trong `src/api/`, gọi qua TanStack Query hook — không gọi axios trực tiếp trong component.
- Type cho request/response đặt trong `src/types/`, khớp với Swagger.
- Định dạng tiền: `formatVND(480000)` → `480.000đ`.

### 6.3 Chung

- Định dạng thời gian trao đổi qua API: ISO-8601 có offset (`2026-10-21T19:00:00+07:00`).
- Text giao diện bằng tiếng Việt; code, tên biến, commit bằng tiếng Anh.

## 7. Git workflow

| Nhánh                      | Mục đích                       |
| -------------------------- | ------------------------------ |
| `main`                     | Bản ổn định, deploy production |
| `develop`                  | Tích hợp hằng ngày             |
| `feature/KTV-{id}-{mo-ta}` | Mỗi task một nhánh             |
| `fix/KTV-{id}-{mo-ta}`     | Sửa bug                        |

- Commit theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- PR vào `develop`: cần **≥ 1 approve** + CI xanh. PR nhỏ (< 400 dòng).
- Merge `develop` → `main` cuối mỗi tuần sau buổi demo.

## 8. CI/CD

```yaml
# .github/workflows/ci.yml (tóm tắt)
on: [pull_request, push]
jobs:
  backend: ./mvnw -B verify # build + unit test + Testcontainers
  frontend: yarn install --frozen-lockfile && yarn lint && yarn test && yarn build
```

- Deploy: Vercel tự deploy FE khi push `main`; Render/Railway tự build Docker BE khi push `main`.
