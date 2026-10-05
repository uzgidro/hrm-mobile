import { isHttpUrl } from '../safeUrl';

describe('isHttpUrl', () => {
  it('faqat http(s)', () => {
    expect(isHttpUrl('https://us02web.zoom.us/j/123?pwd=x')).toBe(true);
    expect(isHttpUrl(' HTTP://example.com ')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('intent://scan#Intent;end')).toBe(false);
    expect(isHttpUrl('zoommtg://zoom.us/join')).toBe(false);
    expect(isHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
    expect(isHttpUrl(undefined)).toBe(false);
  });
});
