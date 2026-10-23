import { delay, HttpResponse, type PathParams } from 'msw'
import { API_URL } from '@api/client'
import type { Role } from '@/types/auth'
import { getDb, save, type DbUser } from './db'
import { sweep } from './logic'
import { publish } from './realtime'

export const api = (path: string) => `${API_URL}${path}`

export const ACCESS_TTL_MS = 15 * 60 * 1000
/** Thay cho cookie httpOnly `refresh_token` — MSW không đặt được cookie httpOnly. */
export const REFRESH_KEY = 'ktv-mock-refresh-user'

/** "Cookie" refresh: ghi nhớ → localStorage, không ghi nhớ → sessionStorage (mất khi đóng trình duyệt). */
export const refreshStore = {
  get: () => localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY),
  set: (userId: number, remember = true) => {
    refreshStore.clear()
    ;(remember ? localStorage : sessionStorage).setItem(REFRESH_KEY, String(userId))
  },
  clear: () => {
    localStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
  },
}

export function ok<T>(data: T, status = 200) {
  return HttpResponse.json({ success: true, data }, { status })
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

/** Ném response lỗi theo format chung `{ success: false, error }` — MSW trả thẳng về client. */
export function fail(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw HttpResponse.json({ success: false, error: { code, message, details } }, { status })
}

export const notFound = (what = 'Không tìm thấy dữ liệu') => fail(404, 'NOT_FOUND', what)

export async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    return fail(400, 'VALIDATION_ERROR', 'Body không hợp lệ')
  }
}

export function issueToken(user: DbUser) {
  return {
    accessToken: `mock.${user.id}.${Date.now() + ACCESS_TTL_MS}`,
    expiresIn: ACCESS_TTL_MS / 1000,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    },
  }
}

/** Đọc user từ Bearer token mock; kiểm tra role nếu truyền vào. */
export function requireUser(request: Request, roles?: Role[]): DbUser {
  const header = request.headers.get('Authorization')
  const match = header?.match(/^Bearer mock\.(\d+)\.(\d+)$/)
  if (!match) return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập')
  if (Number(match[2]) < Date.now()) return fail(401, 'TOKEN_EXPIRED', 'Phiên đăng nhập hết hạn')
  const user = getDb().users.find((u) => u.id === Number(match[1]))
  if (!user) return fail(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập')
  if (!user.enabled) return fail(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa')
  if (roles && !roles.includes(user.role)) return fail(403, 'FORBIDDEN', 'Bạn không có quyền')
  return user
}

export function optionalUser(request: Request): DbUser | null {
  return request.headers.get('Authorization') ? requireUser(request) : null
}

export function num(value: string | readonly string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value)
  if (!Number.isFinite(n)) return fail(400, 'VALIDATION_ERROR', 'Tham số không hợp lệ')
  return n
}

type Info = { request: Request; params: PathParams }

/**
 * Bọc handler: giả lập độ trễ mạng, chạy job nền (hết hạn giữ chỗ, no-show) như backend,
 * lưu DB sau khi xử lý.
 */
export function route(resolver: (info: Info) => Response | Promise<Response>) {
  return async (info: Info) => {
    await delay(120 + Math.random() * 280)
    const db = getDb()
    sweep(db).forEach(publish)
    try {
      return await resolver(info)
    } finally {
      save()
    }
  }
}
