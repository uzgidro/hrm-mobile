import { mapPickerBaseUrl, mapPickerHtml, parseMapMessage, setPointScript, tilesBase } from '../mapPickerHtml';
import { isTrustedAppUrl } from '@/lib/trustedUrl';

describe('map picker page', () => {
  it('loads everything from our own tile server and pins it with a CSP', () => {
    const html = mapPickerHtml({ lat: 41.2, lng: 69.6, zoom: 15 });
    const hosts = [...html.matchAll(/https?:\/\/([^/"' ;]+)/g)].map((m) => m[1]);
    expect(new Set(hosts)).toEqual(new Set([/https:\/\/([^/]+)/.exec(tilesBase())![1]]));
    expect(html).toContain("default-src 'none'");
    expect(isTrustedAppUrl(mapPickerBaseUrl())).toBe(true);
  });
  it('never puts text of a caller into the page', () => {
    const html = mapPickerHtml({ lat: '1</script><script>alert(1)' as never, lng: 2, zoom: 3, pin: '"><img src=x>' });
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('<img');
  });
  it('accepts only well-formed messages', () => {
    expect(parseMapMessage('{"type":"pick","lat":41.1,"lng":69.2,"zoom":15.4}')).toEqual({ type: 'pick', lat: 41.1, lng: 69.2, zoom: 15 });
    expect(parseMapMessage('{"type":"zoom","zoom":30}')).toBeNull();
    for (const bad of ['', 'x', '{}', 'null', '{"type":"pick","lat":"1","lng":2}', '{"type":"pick","lat":91,"lng":2}', 5, undefined]) expect(parseMapMessage(bad)).toBeNull();
  });
  it('moves the pin with numbers only', () => {
    expect(setPointScript(41.5, 69)).toContain('__setPoint(41.5,69)');
    expect(setPointScript(null, 69)).toContain('__setPoint(null,null)');
    expect(setPointScript(NaN, 69)).toContain('__setPoint(null,null)');
  });
});
