import { z } from 'zod'

// Thông báo validate dùng chung (tiếng Việt) — khớp ràng buộc phía BE
export const zEmail = z.string().trim().min(1, 'Nhập email').email('Email không hợp lệ')
export const zPassword = z
  .string()
  .min(8, 'Mật khẩu 8–64 ký tự')
  .max(64, 'Mật khẩu 8–64 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu cần có cả chữ và số')
  .regex(/\d/, 'Mật khẩu cần có cả chữ và số')
export const zPhone = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0')
export const zName = z.string().trim().min(2, 'Nhập họ tên').max(100, 'Tối đa 100 ký tự')
export const zTime = z.string().regex(/^\d{2}:\d{2}$/, 'Giờ dạng HH:mm')
