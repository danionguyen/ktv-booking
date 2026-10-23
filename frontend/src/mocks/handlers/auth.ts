import { http } from 'msw'
import type { LoginRequest, RegisterRequest, ResetPasswordRequest } from '@/types/auth'
import { toApiTime, vn } from '@utils/time'
import { getDb, nextId } from '../db'
import {
  api,
  fail,
  issueToken,
  noContent,
  ok,
  readBody,
  refreshStore,
  requireUser,
  route,
} from '../http'

const toProfile = (u: ReturnType<typeof requireUser>) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  phone: u.phone,
  role: u.role,
  branchId: u.branchId,
  createdAt: u.createdAt,
})

export const authHandlers = [
  http.post(
    api('/auth/login'),
    route(async ({ request }) => {
      const { email, password, rememberMe = true } = await readBody<LoginRequest>(request)
      const user = getDb().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!user || user.password !== password) {
        fail(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng')
      }
      if (!user.enabled)
        fail(403, 'ACCOUNT_DISABLED', 'Tài khoản đã bị khóa, vui lòng liên hệ quầy')
      refreshStore.set(user.id, rememberMe)
      return ok(issueToken(user))
    }),
  ),

  http.post(
    api('/auth/register'),
    route(async ({ request }) => {
      const body = await readBody<RegisterRequest>(request)
      const db = getDb()
      if (db.users.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
        fail(409, 'EMAIL_ALREADY_EXISTS', 'Email đã được sử dụng', { field: 'email' })
      }
      if (body.password.length < 8) {
        fail(400, 'VALIDATION_ERROR', 'Mật khẩu 8–64 ký tự, gồm cả chữ và số', {
          field: 'password',
        })
      }
      const user = {
        id: nextId(db.users),
        email: body.email.trim().toLowerCase(),
        password: body.password,
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        role: 'CUSTOMER' as const,
        branchId: null,
        enabled: true,
        createdAt: toApiTime(vn()),
      }
      db.users.push(user)
      refreshStore.set(user.id)
      return ok(issueToken(user), 201)
    }),
  ),

  http.post(
    api('/auth/refresh'),
    route(() => {
      const id = Number(refreshStore.get())
      const user = getDb().users.find((u) => u.id === id && u.enabled)
      if (!user) fail(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ')
      return ok(issueToken(user))
    }),
  ),

  http.post(
    api('/auth/logout'),
    route(() => {
      refreshStore.clear()
      return noContent()
    }),
  ),

  http.post(
    api('/auth/forgot-password'),
    route(async ({ request }) => {
      const { email } = await readBody<{ email: string }>(request)
      const db = getDb()
      const user = db.users.find((u) => u.email === email.trim().toLowerCase())
      // Luôn trả 200 để không lộ email nào tồn tại (FD-AUTH-04)
      if (!user) return ok({ sent: true })
      const token = `demo-${user.id}-${Date.now().toString(36)}`
      db.resetTokens[token] = user.id
      // Không có email thật: trả link để demo (backend thật không có trường này)
      return ok({ sent: true, devResetUrl: `/reset-password?token=${token}` })
    }),
  ),

  http.post(
    api('/auth/reset-password'),
    route(async ({ request }) => {
      const { token, newPassword } = await readBody<ResetPasswordRequest>(request)
      const db = getDb()
      const user = db.users.find((u) => u.id === db.resetTokens[token])
      if (!user) fail(401, 'INVALID_TOKEN', 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn')
      user.password = newPassword
      delete db.resetTokens[token]
      return noContent()
    }),
  ),

  http.get(
    api('/users/me'),
    route(({ request }) => ok(toProfile(requireUser(request)))),
  ),

  http.put(
    api('/users/me'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const body = await readBody<{ fullName: string; phone: string }>(request)
      user.fullName = body.fullName.trim()
      user.phone = body.phone.trim()
      return ok(toProfile(user))
    }),
  ),

  http.put(
    api('/users/me/password'),
    route(async ({ request }) => {
      const user = requireUser(request)
      const body = await readBody<{ currentPassword: string; newPassword: string }>(request)
      if (body.currentPassword !== user.password) {
        fail(400, 'VALIDATION_ERROR', 'Mật khẩu hiện tại không đúng', { field: 'currentPassword' })
      }
      user.password = body.newPassword
      return noContent()
    }),
  ),
]
