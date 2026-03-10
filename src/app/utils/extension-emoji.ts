// Lightweight extension -> emoji mapping used across components for consistent file icons
export const extensionEmojiMap: Record<string, string> = {
  // compressed
  '.gz': '🗜️',
  '.zip': '🗜️',
  '.tar': '🗜️',
  '.7z': '🗜️',
  '.tgz': '🗜️',
  '.tar.gz': '🗜️',

  // images
  '.png': '🖼️',
  '.jpg': '🖼️',
  '.jpeg': '🖼️',
  '.webp': '🖼️',
};

const compressedExts = ['.gz', '.zip', '.tar', '.7z', '.tgz', '.tar.gz'];
const imageExts = ['.png', '.jpg', '.jpeg', '.webp'];

export function isCompressedKey(key?: string | null): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  return compressedExts.some((e) => k.endsWith(e));
}

export function isImageKey(key?: string | null): boolean {
  if (!key) return false;
  const k = key.toLowerCase();
  return imageExts.some((e) => k.endsWith(e));
}

export function getEmojiForKey(key?: string | null): string {
  if (!key) return '🗒️';
  const k = key.toLowerCase();

  // Prefer compressed icons first (so .tar.gz shows as compressed)
  if (compressedExts.some((e) => k.endsWith(e))) return '🗜️';

  if (imageExts.some((e) => k.endsWith(e))) return '🖼️';

  return '🗒️';
}

export default getEmojiForKey;
