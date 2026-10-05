// Ochiq modallar steki — toast'lar qaysi qatlamda chizilishini hal qiladi.
//
// <ToastHost/> ildizda oddiy absolyut View: RN Modal (native oyna ham, web portali
// ham) uning USTIDA turadi, shuning uchun ochiq varaq/dialog ichidan chaqirilgan
// toast.error(...) ko'rinmay qolardi — foydalanuvchi xato xabarini umuman ko'rmasdi.
// Sheet va ModalCard ochilganda o'z qatlamini ro'yxatdan o'tkazadi va ICHIDA
// <ToastHost layer={id}/> chizadi; toast faqat ENG YUQORIDAGI qatlamda (yoki modal
// yo'q bo'lsa ildizda) ko'rsatiladi — ikki joyda takrorlanmaydi.

let nextId = 1;
let stack: number[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeModalLayers(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Eng yuqoridagi ochiq modal qatlami; modal yo'q bo'lsa `null`. */
export function topModalLayer(): number | null {
  return stack.length ? stack[stack.length - 1]! : null;
}

/** Yangi qatlam identifikatori (stekka qo'shmaydi — render paytida xavfsiz). */
export function newModalLayerId(): number {
  return nextId++;
}

/** Qatlamni stekka qo'shadi va uni yopuvchi funksiyani qaytaradi (takroriy chaqiruv — no-op). */
export function openModalLayer(id: number = newModalLayerId()): () => void {
  stack = [...stack, id];
  emit();
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    stack = stack.filter((x) => x !== id);
    emit();
  };
}

/** Faqat testlar uchun. */
export function __resetModalLayers(): void {
  stack = [];
  emit();
}
