import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { hashPassword, comparePassword, validatePasswordStrength } from '../password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate a valid bcrypt hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      // bcrypt hashes start with $2b$ and are 60 characters long
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash.length).toBe(60);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      
      expect(result).toBe(true);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await hashPassword(password);
      const result = await comparePassword(wrongPassword, hash);
      
      expect(result).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const result = await comparePassword('testpassword123!', hash);
      
      expect(result).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept a valid password', () => {
      const result = validatePasswordStrength('ValidPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Short1!');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('lowercase123!');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('UPPERCASE123!');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('NoNumbers!');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('NoSpecial123');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Password must contain at least one special character');
    });

    it('should accept password with various special characters', () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', ';', ':', '"', '\\', '|', ',', '.', '<', '>', '/', '?'];
      
      specialChars.forEach(char => {
        const result = validatePasswordStrength(`ValidPass123${char}`);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: hacker-news-clone, Property 1: Password Hashing Invariant
     * For any user registration with a valid password, the stored password_hash 
     * should never equal the plaintext password and should be a valid bcrypt hash.
     * **Validates: Requirements 1.2**
     */
    it('should never store plaintext passwords and always produce valid bcrypt hashes', async () => {
      // Custom generator for valid passwords
      const validPasswordArbitrary = fc.tuple(
        fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'), { minLength: 1, maxLength: 3 }),
        fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'), { minLength: 1, maxLength: 3 }),
        fc.stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), { minLength: 1, maxLength: 3 }),
        fc.stringOf(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*'), { minLength: 1, maxLength: 3 }),
        fc.string({ minLength: 0, maxLength: 10 })
      ).map(([upper, lower, num, special, extra]) => upper + lower + num + special + extra);

      await fc.assert(
        fc.asyncProperty(
          validPasswordArbitrary,
          async (password) => {
            // Hash the password
            const hash = await hashPassword(password);
            
            // Property 1: Hash should never equal plaintext password
            expect(hash).not.toBe(password);
            
            // Property 2: Hash should be a valid bcrypt hash
            // bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
            expect(hash).toMatch(/^\$2[aby]\$/);
            expect(hash.length).toBe(60);
            
            // Property 3: Hash should be verifiable with the original password
            const isValid = await comparePassword(password, hash);
            expect(isValid).toBe(true);
            
            // Property 4: Hash should not verify with a different password
            const differentPassword = password + 'X';
            const isInvalid = await comparePassword(differentPassword, hash);
            expect(isInvalid).toBe(false);
          }
        ),
        { numRuns: 3 } // Reduced from 100 due to bcrypt performance
      );
    }, 60000); // 60 second timeout for property-based test
  });
});
