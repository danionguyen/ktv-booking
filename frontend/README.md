# KTV Booking – Frontend

React 18 + TypeScript + Vite, styling bằng Tailwind CSS v4, component từ shadcn/ui (Radix UI). Package manager: **Yarn 1** (`yarn.lock`), không dùng npm.

```bash
cp .env.example .env.local   # sửa VITE_API_URL nếu backend không chạy ở :8080
yarn install
yarn dev                     # http://localhost:5173
```

| Lệnh                        | Mục đích                                  |
| --------------------------- | ----------------------------------------- |
| `yarn lint` · `yarn format` | ESLint · Prettier (tự sắp class Tailwind) |
| `yarn test`                 | Vitest                                    |
| `yarn build`                | Type-check + build production             |
| `yarn shadcn add <tên>`     | Thêm component vào `src/components/ui/`   |

Cấu trúc thư mục và quy ước: xem [docs/02-architecture.md](../docs/02-architecture.md) và [docs/03-tech-stack.md](../docs/03-tech-stack.md).
