import { __resetModalLayers, openModalLayer, subscribeModalLayers, topModalLayer } from '../modalLayer';

beforeEach(() => __resetModalLayers());

describe('modalLayer', () => {
  it('stekda yo\'q bo\'lsa — null (toast ildizda)', () => {
    expect(topModalLayer()).toBeNull();
  });

  it('eng oxirgi ochilgan modal — tepada; yopilgach oldingisi qaytadi', () => {
    const closeA = openModalLayer();
    const closeB = openModalLayer();
    const b = topModalLayer();
    expect(b).not.toBeNull();
    closeB();
    const a = topModalLayer();
    expect(a).not.toBe(b);
    closeA();
    expect(topModalLayer()).toBeNull();
  });

  it('o\'rtadagi modal yopilsa ham tepadagisi o\'zgarmaydi', () => {
    const closeA = openModalLayer();
    openModalLayer();
    const top = topModalLayer();
    closeA();
    expect(topModalLayer()).toBe(top);
  });

  it('obunachilarga xabar beradi; ikki marta yopish xavfsiz', () => {
    const fn = jest.fn();
    const unsub = subscribeModalLayers(fn);
    const close = openModalLayer();
    close();
    close();
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
  });
});
