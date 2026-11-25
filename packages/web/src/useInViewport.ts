import { useEffect, useState, type RefObject } from 'react';

/**
 * true while the element is (nearly) on screen. Defaults to true so SSR / old browsers
 * still animate; IntersectionObserver then corrects it on the client.
 */
export function useInViewport(ref: RefObject<Element | null>, rootMargin = '100px'): boolean {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

/**
 * false until the element has really been on screen once (IntersectionObserver hit), then true for
 * good – drives "play once when scrolled into view" entrance animations. Without IntersectionObserver
 * support it turns true right after mounting.
 */
export function useEntered(ref: RefObject<Element | null>, threshold = 0.15): boolean {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setEntered(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return entered;
}
