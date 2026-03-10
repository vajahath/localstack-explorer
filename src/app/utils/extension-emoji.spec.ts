import { describe, it, expect } from 'vitest';
import { getEmojiForKey, isCompressedKey, isImageKey } from './extension-emoji';

describe('extension-emoji utils', () => {
  describe('isCompressedKey', () => {
    it('should return true for compressed extensions', () => {
      expect(isCompressedKey('test.gz')).toBe(true);
      expect(isCompressedKey('archive.tar.gz')).toBe(true);
      expect(isCompressedKey('data.zip')).toBe(true);
    });

    it('should return false for other extensions', () => {
      expect(isCompressedKey('image.png')).toBe(false);
      expect(isCompressedKey('script.js')).toBe(false);
      expect(isCompressedKey(null)).toBe(false);
    });
  });

  describe('isImageKey', () => {
    it('should return true for image extensions', () => {
      expect(isImageKey('photo.jpg')).toBe(true);
      expect(isImageKey('icon.webp')).toBe(true);
    });

    it('should return false for other extensions', () => {
      expect(isImageKey('data.zip')).toBe(false);
      expect(isImageKey(undefined)).toBe(false);
    });
  });

  describe('getEmojiForKey', () => {
    it('should return 🗜️ for compressed files', () => {
      expect(getEmojiForKey('some/path/file.tar.gz')).toBe('🗜️');
    });

    it('should return 🖼️ for image files', () => {
      expect(getEmojiForKey('images/pic.png')).toBe('🖼️');
    });

    it('should return 🗒️ for unknown files', () => {
      expect(getEmojiForKey('plain.txt')).toBe('🗒️');
      expect(getEmojiForKey('')).toBe('🗒️');
      expect(getEmojiForKey(null)).toBe('🗒️');
    });
  });
});
