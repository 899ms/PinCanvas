export interface DebouncedFn<A extends unknown[]> {
  (...args: A): void;
  cancel: () => void;
  flush: () => void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): DebouncedFn<A> {
  let timer: number | null = null;
  let lastArgs: A | null = null;

  const debounced = ((...args: A) => {
    lastArgs = args;
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      const a = lastArgs;
      lastArgs = null;
      if (a) fn(...a);
    }, wait);
  }) as DebouncedFn<A>;

  debounced.cancel = () => {
    if (timer != null) window.clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
      const a = lastArgs;
      lastArgs = null;
      if (a) fn(...a);
    }
  };

  return debounced;
}
