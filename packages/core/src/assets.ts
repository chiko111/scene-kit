/*
 * Asset resolver: lets a HOST APP decide how media URLs from page JSON are fetched, without
 * changing the page data or its validation (which stays https-only).
 *
 * Typical use – development: images are stored in the JSON under the production CDN path, and the
 * dev app serves them from a local server:
 *
 *   setAssetResolver(mapAssetPrefix('https://cdn.example.com/promos/', 'http://192.168.1.10:4000/assets/'));
 *
 * Production apps simply don't call it (identity).
 */
export type AssetResolver = (uri: string) => string;

let resolver: AssetResolver | null = null;

/** Installs (or with null removes) the resolver. Call once at app start-up. */
export function setAssetResolver(next: AssetResolver | null): void {
  resolver = next;
}

/** Resolves a media URL from page JSON to the URL actually loaded. */
export function resolveAsset(uri: string): string {
  return resolver ? resolver(uri) : uri;
}

/** Resolver that rewrites URLs starting with one of `fromPrefixes` to `toPrefix` (the rest is kept). */
export function mapAssetPrefix(fromPrefixes: string | readonly string[], toPrefix: string): AssetResolver {
  const from = typeof fromPrefixes === 'string' ? [fromPrefixes] : fromPrefixes;
  return (uri) => {
    for (const prefix of from) if (uri.startsWith(prefix)) return toPrefix + uri.slice(prefix.length);
    return uri;
  };
}
