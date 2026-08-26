/**
 * MOBIL ↔ BACKEND oqim pariteti.
 *
 * Fiksturalar — TEST serverdan olingan HAQIQIY javoblar (2026-08-26), shaxsiy
 * ma'lumotlari tozalangan. Kutilayotgan matritsa esa o'sha kuni jonli
 * o'lchangan: har bosqichda har rol uchun har amal chaqirilib, backend
 * ruxsat bergani (200) yozib olindi.
 *
 * ⚠️ IKKI joyda backend ATAYLAB kengroq ruxsat beradi, lekin WEB ham,
 * mobil ham tugmani ko'rsatmaydi — parite WEB bo'yicha:
 *   1) devonxona buyruqni ISTALGAN bosqichda qaytara oladi (2026-07-27),
 *      web esa tugmani faqat `pending_chancellery` da ko'rsatadi;
 *   2) kelishgan xodim fikrini o'zgartirib `disagree` qila oladi, ikkala
 *      mijoz ham `row.agreed !== true` sharti bilan yashiradi.
 */
import { decreePermissions } from '../orderStatus';
import { canAgreeLetter, canSendAgreementLetter, canSubmitAgreementDraft } from '../letterStatus';
import orderFx from './flowFixtures.orders.json';
import letterFx from './flowFixtures.letters.json';

type Role = 'emp_a' | 'hr' | 'deputy' | 'chancellery';
const ROLES: Role[] = ['emp_a', 'hr', 'deputy', 'chancellery'];

// Jonli o'lchov natijasi: bosqich -> rol -> ruxsat etilgan amallar.
const DECREE_EXPECTED: Record<string, Partial<Record<Role, string[]>>> = {
  draft: { emp_a: ['submit'] },
  pending_approval: { hr: ['approve', 'reject'] },
  approved: { emp_a: ['forward'] },
  pending_leadership: { deputy: ['approve', 'reject'] },
  pending_chancellery: { chancellery: ['register', 'reject'] },
  confirmed: { hr: ['apply'] },
};

const LETTER_EXPECTED: Record<string, Partial<Record<Role, string[]>>> = {
  draft: { emp_a: ['submit_agreement'], hr: ['agree', 'disagree'] },
  pending_agreement: { hr: ['agree', 'disagree'] },
  agreed: { emp_a: ['send_to_registry'] },
  pending_registration: {},
};

describe('buyruq oqimi — mobil tugmalari backend ruxsatiga mos', () => {
  for (const stage of Object.keys(DECREE_EXPECTED)) {
    for (const role of ROLES) {
      it(`${stage} / ${role}`, () => {
        const order = (orderFx as any).orders[stage];
        const user = (orderFx as any).users[role];
        const empId = (orderFx as any).ids[role];
        const p = decreePermissions(order, empId, user);

        const actual = new Set<string>();
        if (p.canSubmit) actual.add('submit');
        if (p.canApprove) { actual.add('approve'); actual.add('reject'); }
        if (p.canForward) actual.add('forward');
        if (p.canRegister) actual.add('register');
        if (p.canChancelleryReturn) actual.add('reject');
        if (p.canApply) actual.add('apply');
        if (p.canAcknowledge) actual.add('acknowledge');

        const expected = new Set(DECREE_EXPECTED[stage][role] ?? []);
        expect([...actual].sort()).toEqual([...expected].sort());
      });
    }
  }
});

describe('bildirgi/ariza oqimi — mobil tugmalari backend ruxsatiga mos', () => {
  for (const stage of Object.keys(LETTER_EXPECTED)) {
    for (const role of ROLES) {
      it(`${stage} / ${role}`, () => {
        const letter = (letterFx as any).letters[stage];
        const empId = (letterFx as any).ids[role];

        const actual = new Set<string>();
        if (canSubmitAgreementDraft(letter, empId)) actual.add('submit_agreement');
        if (canAgreeLetter(letter, empId)) { actual.add('agree'); actual.add('disagree'); }
        if (canSendAgreementLetter(letter, empId)) actual.add('send_to_registry');

        const expected = new Set(LETTER_EXPECTED[stage][role] ?? []);
        expect([...actual].sort()).toEqual([...expected].sort());
      });
    }
  }
});
