import { useMemo } from 'react';

// Returns the same object until one of its property values changes, so a context value doesn't
// need its keys listed twice. The keys must stay the same between renders, because they become the
// dependency array -- pass an object literal, not an object with optional or computed keys.
export function useMemoizedObject<T extends object>(value: T): T {
  return useMemo(() => value, Object.values(value));
}
