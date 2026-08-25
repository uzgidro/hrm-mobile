import type { Letter, User } from '../types';
import {
  canSubmitReport, canResetReport, canChancelleryConfirmRegistration,
  canEditLetter,
} from './letterStatus';
import {
  canSubmitTrip, canApproveReport, canApproveGuvohnoma,
  canApproveTripRegistration, canReturnLetter, canReturnTripReport,
  canCancelTrip, canDeleteLetter, canExtendTrip, canDecideExtension,
  canSetBasisDecree,
} from './tripStatus';

/**
 * Rahbariyat tasdig'ining TURI — uchtasi O'ZARO INKOR (statuslar bir-birini
 * istisno qiladi), shu bois bitta maydon, uchta bayroq emas.
 *  - `registration` — devonxona ro'yxatidan keyingi RAHBAR tasdig'i. Buning
 *    uchun serverda `available_actions` bayrog'i YO'Q, shu bois qoida mijozda
 *    web bilan 1:1 takrorlanadi (`canApproveTripRegistration`).
 *  - `report` / `guvohnoma` — server bayroqlari asosida.
 */
export type ApproveTripKind = 'registration' | 'report' | 'guvohnoma' | null;

export interface LetterPermissions {
  /** Muallif qoralamani oqimga yuboradi (server bayrog'i, faqat tafsilotda). */
  canSend: boolean;
  /** Xat FORMASINI tahrirlash — backend `update_letter` qoidasi bilan 1:1. */
  canEdit: boolean;
  /** Muallif o'chiradi (CRUD ning "D" qismi). */
  canDelete: boolean;
  /** Xodim safar hisobotini topshiradi / qaytadan yuboradi. */
  canReport: boolean;
  canResetReport: boolean;
  /** Devonxona "Tasdiqlash" — `pending_registration` da raqamni tasdiqlaydi. */
  canConfirmRegistration: boolean;
  /** Devonxona hujjatni / hisobotni QAYTARADI (sabab majburiy). */
  canReturn: boolean;
  canReturnReport: boolean;
  /** KADR safarni bekor qiladi (sabab ixtiyoriy). */
  canCancelTrip: boolean;
  /** KADR muddatni uzaytiradi; rahbariyat uzaytirishni hal qiladi. */
  canExtend: boolean;
  canDecideExtension: boolean;
  /** KADR asos buyruq raqami+sanasini kiritadi. */
  canSetBasis: boolean;
  /** Rahbariyat tasdig'i turi (yuqoriga qarang) yoki `null`. */
  approveTripKind: ApproveTripKind;
  /** Hech bo'lmasa bitta amal bormi — amallar panelini yig'ish uchun. */
  hasActions: boolean;
}

/**
 * Xat/safar bo'yicha BARCHA ruxsatlarni bitta obyektga yig'adi — buyruqlardagi
 * `decreePermissions` ning ekvivalenti (`utils/orderStatus.ts`).
 *
 * Nega bu funksiya bor: ilgari `LetterDetailView` da shu 11 bayroq alohida-
 * alohida hisoblanardi. Predikatlarning o'zi qoplangan edi, lekin ularning
 * KOMPOZITSIYASI ("falon statusda falon rolga qaysi tugmalar birga ko'rinadi")
 * hech qayerda ifodalanmagan va testlanmagan edi. Buyruqlarda bu allaqachon
 * bitta sof funksiya edi — xatlar endi shu ko'rinishga keltirildi.
 *
 * MUHIM: bu funksiya faqat YIG'ADI. O'z qoidasini o'ylab topmaydi — har bir
 * maydon mos predikatning to'g'ridan-to'g'ri natijasi, shuning uchun qoidani
 * o'zgartirish kerak bo'lsa, predikatda o'zgartiriladi, bu yerda emas.
 */
export function letterPermissions(
  l: Letter,
  user?: User | null,
  employeeId?: number,
): LetterPermissions {
  const approveTripKind: ApproveTripKind =
    canApproveTripRegistration(l, user, employeeId) ? 'registration'
      : canApproveReport(l) ? 'report'
        : canApproveGuvohnoma(l) ? 'guvohnoma'
          : null;

  // SODDALASHTIRILGAN SAFAR: hisobot, "Yuborish", imzo va devonxona bosqichlari
  // bu tartibda UMUMAN YO'Q — backend ularni 400 bilan rad etadi
  // (`services/letter.py:_assert_not_simple_trip`). Shu bois tugmalarni
  // ko'rsatmaymiz: aks holda foydalanuvchi bosadi va tushunarsiz xato oladi.
  // KADR amallari (bekor qilish/uzaytirish/asos buyruq) esa SAQLANADI.
  const simple = l.is_simple_trip === true;

  const canSend = !simple && canSubmitTrip(l);
  const canEdit = canEditLetter(l, employeeId, user);
  const canDelete = canDeleteLetter(l, user, employeeId);
  const canReport = !simple && canSubmitReport(l, employeeId);
  const canResetReportFlag = !simple && canResetReport(l, employeeId);
  const canConfirmRegistration = !simple && canChancelleryConfirmRegistration(l, user);
  const canReturn = !simple && canReturnLetter(l, user);
  const canReturnReport = !simple && canReturnTripReport(l, user);
  const canCancel = canCancelTrip(l, user);
  const canExtend = canExtendTrip(l, user);
  const canDecide = canDecideExtension(l, user, employeeId);
  const canSetBasis = canSetBasisDecree(l, user);

  return {
    canSend,
    canEdit,
    canDelete,
    canReport,
    canResetReport: canResetReportFlag,
    canConfirmRegistration,
    canReturn,
    canReturnReport,
    canCancelTrip: canCancel,
    canExtend,
    canDecideExtension: canDecide,
    canSetBasis,
    approveTripKind,
    hasActions:
      canSend || canEdit || canDelete || canReport || canResetReportFlag
      || canConfirmRegistration || canReturn || canReturnReport || canCancel
      || canExtend || canDecide || canSetBasis || approveTripKind !== null,
  };
}
