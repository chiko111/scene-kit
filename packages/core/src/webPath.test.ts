import { describe, expect, it } from 'vitest';
import { WebPathSchema } from './schema';

describe('WebPathSchema', () => {
  it.each(['/', '/casino', '/casino/slots?tab=new&x=1', '/promo/welcome-100#terms'])('accepts %s', (p) => {
    expect(WebPathSchema.safeParse(p).success).toBe(true);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    'casino',
    '/a b',
    '/a\nb',
    '/"onmouseover=',
    '',
  ])('rejects %j', (p) => {
    expect(WebPathSchema.safeParse(p).success).toBe(false);
  });
});
