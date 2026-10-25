/**
 * Phone or computer decides how UPI is paid: a phone opens the UPI app from a link, a computer shows a QR to scan
 * with the phone (Swiggy's guidance: QR on desktop, app intent on mobile).
 */
export function onPhone(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)) return true;
  return typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches && !matchMedia("(hover: hover)").matches;
}

/** The UPI choices that work on this device: the QR option on a computer, the UPI apps on a phone; others always. */
export function paymentsFor<T extends { id: string }>(payments: T[], phone: boolean): T[] {
  const qr = payments.some(payment => payment.id.startsWith("upi_qr")), apps = payments.some(payment => payment.id.startsWith("upi_app"));
  return payments.filter(payment => phone ? !(qr && apps && payment.id.startsWith("upi_qr")) : !(qr && apps && payment.id.startsWith("upi_app")));
}
