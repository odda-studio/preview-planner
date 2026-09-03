import {linkedSignal, ResourceRef} from '@angular/core';

export const wrapResource = <T>(
  resource: ResourceRef<T>
) => {
  return linkedSignal({
    source: resource.value,
    computation: (source, previous) => {
      return source ?? previous?.value;
    },
  });
}
