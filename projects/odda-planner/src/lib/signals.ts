import {effect, inject, linkedSignal, ResourceRef, Signal, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

export const watchParam = <T = string>(watch: string, pipe: (d: string) => T = (s) => s as T) => {
  const _ = signal<T | undefined>(undefined);
  const activatedRoute = inject(ActivatedRoute);
  activatedRoute.params.subscribe((params) => {
    if (params[watch]) _.set(pipe(params[watch]));
    else _.set(undefined);
  });
  return _;
};

watchParam.required = <T = string>(watch: string, pipe: (d: string) => T = (s) => s as T) => {
  const activatedRoute = inject(ActivatedRoute);
  const _ = signal<T>(activatedRoute.snapshot.params[watch]);
  activatedRoute.params.subscribe((params) => {
    if (params[watch]) _.set(pipe(params[watch]));
  });
  return _;
};

export const watchQueryParam = <T = string>(watch: string, pipe: (d: string) => T = (s) => s as T) => {
  const _ = signal<T | undefined>(undefined);
  const activatedRoute = inject(ActivatedRoute);
  activatedRoute.queryParams.subscribe((params) => {
    if (params[watch]) _.set(pipe(params[watch]));
    else _.set(undefined);
  });
  return _;
};

export function debouncedSignal<T>(input: Signal<T>, timeOutMs = 0): Signal<T> {
  const debounceSignal = signal(input());
  effect(() => {
    const value = input();
    const timeout = setTimeout(() => {
      debounceSignal.set(value);
    }, timeOutMs);
    return () => {
      clearTimeout(timeout);
    };
  });
  return debounceSignal;
}

export const wrapResource = <T>(
  resource: ResourceRef<T>
): Signal<T | undefined> => {
  return linkedSignal({
    source: resource.value,
    computation: (source, previous) => {
      return source ?? previous?.value;
    },
  });
}