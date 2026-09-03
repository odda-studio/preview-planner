import {effect, linkedSignal, ResourceRef, signal, Signal} from '@angular/core';

export const debounced = <T>(
  s: Signal<T>,
  delay = 300
): Signal<T> => {
  const debouncedSignal = signal<T>(s());
  let timeoutId: any = null;
  effect(() => {
    const v = s();
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      debouncedSignal.set(v);
    }, delay)
  });

  return debouncedSignal;
}
