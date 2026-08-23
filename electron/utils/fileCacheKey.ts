import fs from 'fs';
import crypto from 'crypto';

// Derives a cache key from path + size + mtime, avoiding a full file read/hash.
// Trade-off: a file replaced in-place with identical path/size/mtime would hit a stale cache.
export function getFileCacheKey(filePath: string): string {
  const stat = fs.statSync(filePath);
  return crypto.createHash('sha1').update(`${filePath}:${stat.size}:${stat.mtimeMs}`).digest('hex');
}
