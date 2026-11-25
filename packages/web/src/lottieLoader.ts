/** Lazy loader for lottie-web's light SVG player (kept outside components for the React Compiler). */
export type LottiePlayer = typeof import('lottie-web/build/player/lottie_light').default;

let pending: Promise<LottiePlayer> | null = null;

export function loadLottie(): Promise<LottiePlayer> {
  pending ??= import('lottie-web/build/player/lottie_light').then((mod) => mod.default);
  pending.catch(() => {
    pending = null; // allow a retry later
  });
  return pending;
}
