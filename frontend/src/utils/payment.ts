/** Chuyển tới "cổng thanh toán": URL nội bộ (cổng VNPay giả lập khi mock) dùng router, URL ngoài thì chuyển trang. */
export function goToPayment(url: string, navigate: (to: string) => void) {
  if (url.startsWith('/')) navigate(url)
  else window.location.assign(url)
}
