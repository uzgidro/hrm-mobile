// Regression (2026-11-14): video guides showed "Yuklab bo'lmadi" because
// expo-router decoded the presigned MinIO URL once on the way to the viewer.
import React from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { act, waitFor } from '@testing-library/react-native';
import { decodeMediaUrl, encodeMediaUrl } from '../mediaParam';
import { isTrustedAppUrl } from '@/lib/trustedUrl';

const PRESIGNED =
  'https://hr-minio.uzgidro.uz/video-guides/7f3a.mp4?response-content-type=video%2Fmp4' +
  '&response-cache-control=public%2C%20max-age%3D259200%2C%20immutable' +
  '&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=key%2F20261114%2Fus-east-1%2Fs3%2Faws4_request' +
  '&X-Amz-Date=20261114T000000Z&X-Amz-Expires=518400&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123';

describe('media URL param', () => {
  it('a presigned video URL reaches the viewer intact only when wrapped', async () => {
    let got = '';
    renderRouter(
      {
        index: () => <Text>home</Text>,
        media: function Media() {
          const p = useLocalSearchParams<{ url: string }>();
          got = decodeMediaUrl(p.url);
          return <Text>media</Text>;
        },
      },
      { initialUrl: '/' },
    );
    await act(async () => {
      router.push({ pathname: '/media', params: { kind: 'video', url: encodeMediaUrl(PRESIGNED) } });
    });
    await waitFor(() => expect(got).not.toBe(''));
    expect(got).toBe(PRESIGNED);
    expect(isTrustedAppUrl(got)).toBe(true);

    // Without the wrapper the router alters the URL — the bug this guards.
    got = '';
    await act(async () => {
      router.push({ pathname: '/media', params: { kind: 'video', url: PRESIGNED, n: '2' } });
    });
    await waitFor(() => expect(got).not.toBe(''));
    expect(got).not.toBe(PRESIGNED);
    expect(isTrustedAppUrl(got)).toBe(false);
  });

  it('a plain deep-link URL passes through, an already-unwrapped value is kept', () => {
    expect(decodeMediaUrl('https://uzgidro.uz/news/1')).toBe('https://uzgidro.uz/news/1');
    expect(decodeMediaUrl('u:' + PRESIGNED)).toBe(PRESIGNED);
    expect(decodeMediaUrl(['u:' + encodeURIComponent(PRESIGNED)])).toBe(PRESIGNED);
    expect(decodeMediaUrl(undefined)).toBe('');
  });
});
