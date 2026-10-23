import type { Holiday, MenuItem, PriceRule, RoomType, Voucher } from '@/types/domain'
import { businessWindow, toApiTime, vn } from '@utils/time'
import type {
  DbBooking,
  DbBookingItem,
  DbBranch,
  DbPayment,
  DbReview,
  DbRoom,
  DbUser,
  MockDb,
} from './db'
import { quote, roundTo1000 } from './pricing'

/** RNG cố định để dữ liệu mẫu ổn định giữa các lần reset. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const branches: DbBranch[] = [
  {
    id: 1,
    name: 'KTV Cầu Giấy',
    address: '175 Xuân Thủy, Cầu Giấy, Hà Nội',
    phone: '024 3456 7890',
    openTime: '10:00',
    closeTime: '02:00',
    mapWidth: 1000,
    mapHeight: 560,
  },
  {
    id: 2,
    name: 'KTV Đống Đa',
    address: '68 Tây Sơn, Đống Đa, Hà Nội',
    phone: '024 3567 8901',
    openTime: '10:00',
    closeTime: '02:00',
    mapWidth: 900,
    mapHeight: 520,
  },
  {
    id: 3,
    name: 'KTV Hai Bà Trưng',
    address: '25 Bạch Mai, Hai Bà Trưng, Hà Nội',
    phone: '024 3678 9012',
    openTime: '09:00',
    closeTime: '00:00',
    mapWidth: 900,
    mapHeight: 360,
  },
]

const roomTypes: RoomType[] = [
  {
    id: 1,
    name: 'Standard',
    capacity: 6,
    description: 'Phòng tiêu chuẩn cho nhóm nhỏ, loa JBL, màn hình 65 inch, micro không dây.',
  },
  {
    id: 2,
    name: 'VIP',
    capacity: 10,
    description: 'Sofa da, hệ thống âm thanh Bose, đèn LED theo nhạc, màn hình 85 inch.',
  },
  {
    id: 3,
    name: 'Party',
    capacity: 20,
    description: 'Phòng lớn cho tiệc sinh nhật, team building — sân khấu mini và 2 màn hình.',
  },
]

const SIZE: Record<number, [number, number]> = { 1: [140, 90], 2: [170, 110], 3: [250, 140] }

function buildRooms(): DbRoom[] {
  const rooms: DbRoom[] = []
  const add = (branchId: number, typeId: number, code: string, posX: number, posY: number) => {
    const [width, height] = SIZE[typeId]
    rooms.push({
      id: rooms.length + 1,
      branchId,
      roomTypeId: typeId,
      code,
      status: 'ACTIVE',
      posX,
      posY,
      width,
      height,
      images: [],
    })
  }
  // Chi nhánh 1: 6 Standard, 4 VIP, 2 Party
  for (let i = 0; i < 6; i++) add(1, 1, `S0${i + 1}`, 40 + i * 155, 40)
  for (let i = 0; i < 4; i++) add(1, 2, `V0${i + 1}`, 40 + i * 190, 200)
  add(1, 3, 'P01', 40, 370)
  add(1, 3, 'P02', 310, 370)
  // Chi nhánh 2: 5 Standard, 3 VIP, 2 Party
  for (let i = 0; i < 5; i++) add(2, 1, `S0${i + 1}`, 40 + i * 160, 40)
  for (let i = 0; i < 3; i++) add(2, 2, `V0${i + 1}`, 40 + i * 190, 190)
  add(2, 3, 'P01', 40, 350)
  add(2, 3, 'P02', 310, 350)
  // Chi nhánh 3: 6 Standard, 3 VIP (2 loại phòng)
  for (let i = 0; i < 5; i++) add(3, 1, `S0${i + 1}`, 40 + i * 160, 40)
  add(3, 1, 'S06', 40, 190)
  for (let i = 0; i < 3; i++) add(3, 2, `V0${i + 1}`, 210 + i * 190, 190)
  rooms.find((r) => r.branchId === 1 && r.code === 'S06')!.status = 'MAINTENANCE'
  return rooms
}

/** BR-21/22: bảng giá Standard; VIP = ×1.5, Party = ×2. */
function buildPriceRules(): Required<PriceRule>[] {
  const base: Omit<PriceRule, 'roomTypeId'>[] = [
    { dayType: 'WEEKDAY', startHour: '09:00', endHour: '17:00', pricePerHour: 120000 },
    { dayType: 'WEEKDAY', startHour: '17:00', endHour: '02:00', pricePerHour: 180000 },
    { dayType: 'WEEKEND', startHour: '09:00', endHour: '02:00', pricePerHour: 220000 },
    { dayType: 'HOLIDAY', startHour: '09:00', endHour: '02:00', pricePerHour: 250000 },
  ]
  const factor: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 }
  const out: Required<PriceRule>[] = []
  for (const t of roomTypes) {
    for (const r of base) {
      out.push({
        ...r,
        id: out.length + 1,
        roomTypeId: t.id,
        pricePerHour: r.pricePerHour * factor[t.id],
      })
    }
  }
  return out
}

const holidays: Holiday[] = [
  { date: '2026-01-01', name: 'Tết Dương lịch' },
  { date: '2026-02-16', name: 'Tết Nguyên đán' },
  { date: '2026-02-17', name: 'Tết Nguyên đán' },
  { date: '2026-02-18', name: 'Tết Nguyên đán' },
  { date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương' },
  { date: '2026-04-30', name: 'Ngày Giải phóng miền Nam' },
  { date: '2026-05-01', name: 'Quốc tế Lao động' },
  { date: '2026-09-02', name: 'Quốc khánh' },
  { date: '2026-12-24', name: 'Đêm Giáng sinh' },
  { date: '2026-12-31', name: 'Đêm Giao thừa dương lịch' },
  { date: '2027-01-01', name: 'Tết Dương lịch' },
]

const menuItems: MenuItem[] = [
  {
    id: 1,
    name: 'Trái cây thập cẩm',
    category: 'FOOD',
    price: 150000,
    image: null,
    available: true,
  },
  { id: 2, name: 'Khô bò xé', category: 'FOOD', price: 80000, image: null, available: true },
  { id: 3, name: 'Mực nướng', category: 'FOOD', price: 120000, image: null, available: true },
  { id: 4, name: 'Khoai tây chiên', category: 'FOOD', price: 50000, image: null, available: true },
  { id: 5, name: 'Hạt dưa', category: 'FOOD', price: 30000, image: null, available: true },
  { id: 6, name: 'Bánh tráng trộn', category: 'FOOD', price: 40000, image: null, available: false },
  { id: 7, name: 'Nước suối', category: 'DRINK', price: 15000, image: null, available: true },
  { id: 8, name: 'Coca-Cola', category: 'DRINK', price: 20000, image: null, available: true },
  { id: 9, name: 'Bia Tiger', category: 'DRINK', price: 30000, image: null, available: true },
  { id: 10, name: 'Bia Heineken', category: 'DRINK', price: 35000, image: null, available: true },
  { id: 11, name: 'Trà đào cam sả', category: 'DRINK', price: 40000, image: null, available: true },
  {
    id: 12,
    name: 'Combo Party 4 người',
    category: 'COMBO',
    price: 450000,
    image: null,
    available: true,
  },
  {
    id: 13,
    name: 'Combo Sinh nhật',
    category: 'COMBO',
    price: 690000,
    image: null,
    available: true,
  },
]

const CUSTOMER_NAMES = [
  'Nguyễn Văn An',
  'Phạm Thu Hà',
  'Hoàng Minh Đức',
  'Vũ Thị Lan',
  'Đặng Quốc Huy',
  'Bùi Ngọc Mai',
]
const GUEST_NAMES = [
  'Anh Tuấn',
  'Chị Hương',
  'Anh Long',
  'Chị Thảo',
  'Anh Khánh',
  'Chị Ngân',
  'Anh Phong',
  'Chị Yến',
]
const REVIEW_COMMENTS = [
  'Phòng sạch, âm thanh rất tốt!',
  'Nhân viên nhiệt tình, sẽ quay lại.',
  'Micro hơi rè một chút, còn lại ổn.',
  'Không gian đẹp, giá hợp lý.',
  'Đồ ăn ngon, phục vụ nhanh.',
  'Âm thanh bass mạnh, rất đã!',
]

export function createSeed(version: number): MockDb {
  const rnd = mulberry32(20261021)
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
  const now = vn()

  const users: DbUser[] = [
    {
      id: 1,
      email: 'admin@ktv.vn',
      password: 'admin123',
      fullName: 'Quản trị hệ thống',
      phone: '0900000001',
      role: 'ADMIN',
      branchId: null,
      enabled: true,
      createdAt: toApiTime(now.subtract(120, 'day')),
    },
    {
      id: 2,
      email: 'staff@ktv.vn',
      password: 'staff123',
      fullName: 'Trần Thị Bình',
      phone: '0900000002',
      role: 'STAFF',
      branchId: 1,
      enabled: true,
      createdAt: toApiTime(now.subtract(100, 'day')),
    },
    {
      id: 3,
      email: 'staff2@ktv.vn',
      password: 'staff123',
      fullName: 'Lê Văn Cường',
      phone: '0900000003',
      role: 'STAFF',
      branchId: 2,
      enabled: true,
      createdAt: toApiTime(now.subtract(90, 'day')),
    },
    ...CUSTOMER_NAMES.map((fullName, i): DbUser => ({
      id: 4 + i,
      email: i === 0 ? 'customer@ktv.vn' : `khach${i}@example.com`,
      password: '123456',
      fullName,
      phone: `09123456${String(78 + i).padStart(2, '0')}`,
      role: 'CUSTOMER',
      branchId: null,
      enabled: i !== 5,
      createdAt: toApiTime(now.subtract(60 - i * 5, 'day')),
    })),
  ]
  const customerIds = users.filter((u) => u.role === 'CUSTOMER').map((u) => u.id)

  const vouchers: Voucher[] = [
    {
      id: 1,
      code: 'KTV10',
      type: 'PERCENT',
      value: 10,
      maxDiscount: 200000,
      minOrder: 500000,
      startAt: toApiTime(now.subtract(30, 'day').startOf('day')),
      endAt: toApiTime(now.add(60, 'day').endOf('day')),
      usageLimit: 100,
      usedCount: 12,
    },
    {
      id: 2,
      code: 'GIAM50K',
      type: 'FIXED',
      value: 50000,
      maxDiscount: null,
      minOrder: 300000,
      startAt: toApiTime(now.subtract(10, 'day').startOf('day')),
      endAt: toApiTime(now.add(20, 'day').endOf('day')),
      usageLimit: 50,
      usedCount: 49,
    },
    {
      id: 3,
      code: 'SINHNHAT20',
      type: 'PERCENT',
      value: 20,
      maxDiscount: 300000,
      minOrder: 1000000,
      startAt: toApiTime(now.subtract(5, 'day').startOf('day')),
      endAt: toApiTime(now.add(90, 'day').endOf('day')),
      usageLimit: 30,
      usedCount: 3,
    },
    {
      id: 4,
      code: 'HETHAN',
      type: 'FIXED',
      value: 100000,
      maxDiscount: null,
      minOrder: 0,
      startAt: toApiTime(now.subtract(60, 'day').startOf('day')),
      endAt: toApiTime(now.subtract(1, 'day').endOf('day')),
      usageLimit: 100,
      usedCount: 40,
    },
  ]

  const rooms = buildRooms()
  const priceRules = buildPriceRules()
  const bookings: DbBooking[] = []
  const bookingItems: DbBookingItem[] = []
  const payments: DbPayment[] = []
  const reviews: DbReview[] = []
  const codeSeq: Record<string, number> = {}
  const availableMenu = menuItems.filter((m) => m.available)

  for (let offset = -30; offset <= 7; offset++) {
    const date = now.add(offset, 'day').format('YYYY-MM-DD')
    const weekend = [0, 6].includes(now.add(offset, 'day').day())
    // Tương lai thưa hơn (đơn đặt trước), quá khứ dày hơn
    const density = offset < 0 ? (weekend ? 0.55 : 0.4) : offset === 0 ? 0.45 : 0.18

    for (const branch of branches) {
      const { open, close } = businessWindow(date, branch.openTime, branch.closeTime)
      for (const room of rooms.filter((r) => r.branchId === branch.id && r.status === 'ACTIVE')) {
        const type = roomTypes.find((t) => t.id === room.roomTypeId)!
        let cursor = open.add(Math.floor(rnd() * 6) * 30, 'minute')
        while (cursor.add(1, 'hour').isBefore(close)) {
          if (rnd() > density) {
            cursor = cursor.add(60 + Math.floor(rnd() * 3) * 30, 'minute')
            continue
          }
          const hours = pick([1, 1.5, 2, 2, 2.5, 3, 3, 4])
          const start = cursor
          const end = start.add(hours * 60, 'minute')
          if (end.isAfter(close)) break
          cursor = end.add(30, 'minute')

          const isPast = end.isBefore(now)
          const isNow = !start.isAfter(now) && end.isAfter(now)
          const registered = rnd() < 0.55
          const userId = registered ? pick(customerIds.slice(0, 5)) : null
          const paymentMethod = registered && rnd() < 0.55 ? 'VNPAY' : 'CASH'
          const people = Math.max(2, Math.ceil(type.capacity * (0.4 + rnd() * 0.6)))
          const dayKey = start.format('YYYYMMDD')
          codeSeq[dayKey] = (codeSeq[dayKey] ?? 0) + 1

          let status: DbBooking['status'] = isPast
            ? 'COMPLETED'
            : isNow
              ? 'CHECKED_IN'
              : 'CONFIRMED'
          if (isPast && rnd() < 0.06) status = 'CANCELLED'

          const roomAmount = quote(
            priceRules.filter((r) => r.roomTypeId === type.id),
            holidays,
            start,
            end,
          ).total
          const id = bookings.length + 1
          const createdAt = registered
            ? start.subtract(1 + Math.floor(rnd() * 72), 'hour')
            : start.subtract(5, 'minute')

          // Đồ ăn uống: một phần đặt trước, một phần gọi tại quầy
          let fnb = 0
          if (status !== 'CANCELLED' && (isPast || isNow) && rnd() < 0.7) {
            const count = 1 + Math.floor(rnd() * 3)
            for (let k = 0; k < count; k++) {
              const item = pick(availableMenu)
              const quantity =
                item.category === 'DRINK' ? 2 + Math.floor(rnd() * 6) : 1 + Math.floor(rnd() * 2)
              const preordered = registered && rnd() < 0.4
              bookingItems.push({
                id: bookingItems.length + 1,
                bookingId: id,
                menuItemId: item.id,
                quantity,
                unitPrice: item.price,
                preordered,
                createdAt: toApiTime(preordered ? createdAt : start.add(20 + k * 30, 'minute')),
              })
              fnb += item.price * quantity
            }
          }
          const useVoucher = registered && roomAmount + fnb >= 500000 && rnd() < 0.12
          const discount = useVoucher ? Math.min(200000, roundTo1000((roomAmount + fnb) * 0.1)) : 0
          const total = roundTo1000(roomAmount + fnb - discount)

          bookings.push({
            id,
            code: `KTV-${dayKey}-${String(codeSeq[dayKey]).padStart(4, '0')}`,
            userId,
            guestName: userId ? null : pick(GUEST_NAMES),
            guestPhone: userId ? null : `09${Math.floor(10000000 + rnd() * 89999999)}`,
            roomId: room.id,
            startTime: toApiTime(start),
            endTime: toApiTime(end),
            people,
            status,
            holdExpiresAt: null,
            roomAmount,
            discount,
            voucherId: useVoucher ? 1 : null,
            paymentMethod,
            cancelReason:
              status === 'CANCELLED' ? pick(['Đổi lịch', 'Bận việc đột xuất', 'No-show']) : null,
            checkedInAt:
              status === 'COMPLETED' || status === 'CHECKED_IN'
                ? toApiTime(start.add(Math.floor(rnd() * 10), 'minute'))
                : null,
            checkedOutAt: status === 'COMPLETED' ? toApiTime(end) : null,
            staffId: branch.id === 1 ? 2 : branch.id === 2 ? 3 : null,
            createdAt: toApiTime(createdAt),
          })

          if (paymentMethod === 'VNPAY' && status !== 'CANCELLED') {
            const prepaid = roundTo1000(roomAmount - discount)
            payments.push({
              id: payments.length + 1,
              bookingId: id,
              method: 'VNPAY',
              amount: prepaid,
              status: 'SUCCESS',
              txnRef: `VNP${id}`,
              paidAt: toApiTime(createdAt.add(2, 'minute')),
            })
          }
          if (status === 'COMPLETED') {
            const paid = payments
              .filter((p) => p.bookingId === id)
              .reduce((s, p) => s + p.amount, 0)
            if (total > paid) {
              payments.push({
                id: payments.length + 1,
                bookingId: id,
                method: 'CASH',
                amount: total - paid,
                status: 'SUCCESS',
                txnRef: `CASH${id}`,
                paidAt: toApiTime(end),
              })
            }
            if (userId && rnd() < 0.5) {
              reviews.push({
                id: reviews.length + 1,
                bookingId: id,
                rating: 3 + Math.floor(rnd() * 3),
                comment: pick(REVIEW_COMMENTS),
                createdAt: toApiTime(end.add(2, 'hour')),
              })
            }
          }
        }
      }
    }
  }

  return {
    version,
    users,
    branches,
    roomTypes,
    rooms,
    priceRules,
    holidays,
    menuItems,
    vouchers,
    bookings,
    bookingItems,
    payments,
    reviews,
    resetTokens: {},
  }
}
