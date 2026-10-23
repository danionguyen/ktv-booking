import { createBrowserRouter } from 'react-router-dom'
import { AdminLayout } from '@layouts/AdminLayout'
import { CustomerLayout } from '@layouts/CustomerLayout'
import { StaffLayout } from '@layouts/StaffLayout'
import { BookingsPage } from '@pages/admin/BookingsPage'
import { BranchesPage } from '@pages/admin/BranchesPage'
import { BranchLayoutPage, FirstBranchLayoutRedirect } from '@pages/admin/BranchLayoutPage'
import { DashboardPage } from '@pages/admin/DashboardPage'
import { MenuPage } from '@pages/admin/MenuPage'
import { PriceRulesPage } from '@pages/admin/PriceRulesPage'
import { RoomsPage } from '@pages/admin/RoomsPage'
import { RoomTypesPage } from '@pages/admin/RoomTypesPage'
import { UsersPage } from '@pages/admin/UsersPage'
import { VouchersPage } from '@pages/admin/VouchersPage'
import { ForgotPasswordPage } from '@pages/auth/ForgotPasswordPage'
import { LoginPage } from '@pages/auth/LoginPage'
import { RegisterPage } from '@pages/auth/RegisterPage'
import { ResetPasswordPage } from '@pages/auth/ResetPasswordPage'
import { BookingDetailPage } from '@pages/customer/BookingDetailPage'
import { BranchDetailPage } from '@pages/customer/BranchDetailPage'
import { CheckoutPage } from '@pages/customer/CheckoutPage'
import { HomePage } from '@pages/customer/HomePage'
import { MockVnpayPage } from '@pages/customer/MockVnpayPage'
import { MyBookingsPage } from '@pages/customer/MyBookingsPage'
import { PaymentResultPage } from '@pages/customer/PaymentResultPage'
import { ProfilePage } from '@pages/customer/ProfilePage'
import { RoomDetailPage } from '@pages/customer/RoomDetailPage'
import { SearchPage } from '@pages/customer/SearchPage'
import { ForbiddenPage } from '@pages/ForbiddenPage'
import { NotFoundPage } from '@pages/NotFoundPage'
import { InvoicePage } from '@pages/staff/InvoicePage'
import { StaffBookingPage } from '@pages/staff/StaffBookingPage'
import { StaffRoomMapPage } from '@pages/staff/StaffRoomMapPage'
import { TimelinePage } from '@pages/staff/TimelinePage'
import { TodayBookingsPage } from '@pages/staff/TodayBookingsPage'
import { MOCK_ENABLED } from '@lib/env'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard } from './RoleGuard'

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    { path: '/403', element: <ForbiddenPage /> },
    ...(MOCK_ENABLED ? [{ path: '/mock-vnpay', element: <MockVnpayPage /> }] : []),
    {
      element: <CustomerLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'branches/:id', element: <BranchDetailPage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'rooms/:id', element: <RoomDetailPage /> },
        { path: 'payment/result', element: <PaymentResultPage /> },
        {
          element: <ProtectedRoute />,
          children: [
            { path: 'profile', element: <ProfilePage /> },
            {
              element: <RoleGuard roles={['CUSTOMER']} />,
              children: [
                { path: 'checkout/:id', element: <CheckoutPage /> },
                { path: 'my-bookings', element: <MyBookingsPage /> },
                { path: 'my-bookings/:id', element: <BookingDetailPage /> },
              ],
            },
          ],
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          path: 'staff',
          element: <RoleGuard roles={['STAFF', 'ADMIN']} />,
          children: [
            // Hóa đơn in: không có layout
            { path: 'bookings/:id/invoice', element: <InvoicePage /> },
            {
              element: <StaffLayout />,
              children: [
                { index: true, element: <TimelinePage /> },
                { path: 'room-map', element: <StaffRoomMapPage /> },
                { path: 'today', element: <TodayBookingsPage /> },
                { path: 'profile', element: <ProfilePage /> },
                { path: 'bookings/:id', element: <StaffBookingPage /> },
              ],
            },
          ],
        },
        {
          path: 'admin',
          element: <RoleGuard roles={['ADMIN']} />,
          children: [
            {
              element: <AdminLayout />,
              children: [
                { index: true, element: <DashboardPage /> },
                { path: 'bookings', element: <BookingsPage /> },
                { path: 'branches', element: <BranchesPage /> },
                { path: 'layout', element: <FirstBranchLayoutRedirect /> },
                { path: 'branches/:id/layout', element: <BranchLayoutPage /> },
                { path: 'room-types', element: <RoomTypesPage /> },
                { path: 'rooms', element: <RoomsPage /> },
                { path: 'price-rules', element: <PriceRulesPage /> },
                { path: 'menu', element: <MenuPage /> },
                { path: 'vouchers', element: <VouchersPage /> },
                { path: 'users', element: <UsersPage /> },
              ],
            },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
)
