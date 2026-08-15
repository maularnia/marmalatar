import { useEffect, useRef } from 'react';

export function useRenderCache<TItem, TKey, TNode>(items: TItem[], getKey: (item: TItem) => TKey) {
  const cacheRef = useRef<Map<TKey, { cacheKey: string; node: TNode }>>(new Map());

  useEffect(() => {
    const existingKeys = new Set(items.map(getKey));
    for (const key of cacheRef.current.keys()) {
      if (!existingKeys.has(key)) {
        cacheRef.current.delete(key);
      }
    }
  }, [items]);

  const getCached = (key: TKey, fingerprint: string): TNode | null => {
    const cached = cacheRef.current.get(key);
    return cached && cached.cacheKey === fingerprint ? cached.node : null;
  };

  const setCached = (key: TKey, fingerprint: string, node: TNode) => {
    cacheRef.current.set(key, { cacheKey: fingerprint, node });
  };

  return { getCached, setCached };
}
