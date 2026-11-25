import { afterEach, describe, expect, it } from 'vitest';
import { mapAssetPrefix, resolveAsset, setAssetResolver } from './assets';

describe('asset resolver', () => {
  afterEach(() => setAssetResolver(null));
  it('is the identity by default', () => {
    expect(resolveAsset('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });
  it('maps a CDN prefix to a dev server and leaves other URLs alone', () => {
    setAssetResolver(mapAssetPrefix('https://cdn.example.com/promos/', 'http://192.168.1.10:4000/assets/'));
    expect(resolveAsset('https://cdn.example.com/promos/sports/card1.png')).toBe('http://192.168.1.10:4000/assets/sports/card1.png');
    expect(resolveAsset('https://other.example.com/x.png')).toBe('https://other.example.com/x.png');
  });
});
