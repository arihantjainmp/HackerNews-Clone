import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cache } from '../cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    // Clear cache before each test
    cache.clear();
  });

  describe('generateKey', () => {
    it('should generate key with prefix only', () => {
      const key = cache.generateKey('posts');
      expect(key).toBe('posts');
    });

    it('should generate key with sorted parameters', () => {
      const key = cache.generateKey('posts', { page: 1, limit: 25, sort: 'new' });
      expect(key).toBe('posts:limit:25|page:1|sort:new');
    });

    it('should generate consistent keys regardless of parameter order', () => {
      const key1 = cache.generateKey('posts', { page: 1, sort: 'new', limit: 25 });
      const key2 = cache.generateKey('posts', { limit: 25, page: 1, sort: 'new' });
      expect(key1).toBe(key2);
    });
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const data = { posts: [], total: 0 };
      cache.set('test-key', data);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return null for expired entry', () => {
      vi.useFakeTimers();
      
      cache.set('test-key', { data: 'test' }, 1000); // 1 second TTL
      
      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toBeNull();
      
      vi.useRealTimers();
    });

    it('should return data before expiration', () => {
      vi.useFakeTimers();
      
      const data = { data: 'test' };
      cache.set('test-key', data, 5000); // 5 second TTL
      
      // Advance time by 2 seconds (still within TTL)
      vi.advanceTimersByTime(2000);
      
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(data);
      
      vi.useRealTimers();
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      cache.invalidate('key1');
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual({ data: 'test2' });
    });
  });

  describe('invalidateByPrefix', () => {
    it('should remove all entries matching prefix', () => {
      cache.set('posts:page:1', { data: 'page1' });
      cache.set('posts:page:2', { data: 'page2' });
      cache.set('votes:user:123', { data: 'vote' });
      
      cache.invalidateByPrefix('posts');
      
      expect(cache.get('posts:page:1')).toBeNull();
      expect(cache.get('posts:page:2')).toBeNull();
      expect(cache.get('votes:user:123')).toEqual({ data: 'vote' });
    });

    it('should handle empty cache', () => {
      expect(() => cache.invalidateByPrefix('posts')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      cache.set('key3', { data: 'test3' });
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: 'test1' });
      cache.set('key2', { data: 'test2' });
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain('key1');
      expect(stats.keys).toContain('key2');
    });

    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });
  });
});
