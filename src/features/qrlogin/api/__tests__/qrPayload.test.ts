// QR yuki (payload) tahlili — TZ 4.2.3.
//
// QR ichida token YO'Q: faqat kanal id va skaner kaliti. Shu sababli tahlil
// QAT'IY bo'lishi kerak — begona QR (masalan tashqi sayt havolasi) hech
// qachon serverga so'rov yubormasin.
import { parseQrPayload, QR_PREFIX } from '../mutations';

describe('parseQrPayload', () => {
  it("to'g'ri QR ni bo'laklarga ajratadi", () => {
    expect(parseQrPayload(`${QR_PREFIX}:CHAN123:SECRET456`)).toEqual({
      channelId: 'CHAN123',
      qrSecret: 'SECRET456',
    });
  });

  it("kalit ichida ':' bo'lsa ham buzilmaydi (base64url uchun zaxira)", () => {
    expect(parseQrPayload(`${QR_PREFIX}:ch:a:b:c`)).toEqual({
      channelId: 'ch',
      qrSecret: 'a:b:c',
    });
  });

  it('bo‘sh joylarni tashlab yuboradi', () => {
    expect(parseQrPayload(`  ${QR_PREFIX}:ch:sec  `)).toEqual({
      channelId: 'ch',
      qrSecret: 'sec',
    });
  });

  it.each([
    ['begona havola', 'https://example.com/qr'],
    ['boshqa prefiks', 'otherqr:v1:ch:sec'],
    ['kelajakdagi versiya', 'hrmqr:v2:ch:sec'],
    ['kalitsiz', `${QR_PREFIX}:ch`],
    ['kanalsiz', `${QR_PREFIX}::sec`],
    ['bo‘sh kalit', `${QR_PREFIX}:ch:`],
    ['bo‘sh satr', ''],
  ])('%s -> null (server chaqirilmaydi)', (_name, raw) => {
    expect(parseQrPayload(raw)).toBeNull();
  });
});
