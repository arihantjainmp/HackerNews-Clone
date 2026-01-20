import { User } from '../User';
import { describe, it, expect } from 'vitest';

describe('User Model', () => {

  describe('Schema Validation', () => {
    it('should create a valid user with all required fields', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      };

      const user = new User(userData);
      await expect(user.validate()).resolves.not.toThrow();

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.password_hash).toBe('hashedpassword123');
      expect(user.created_at).toBeInstanceOf(Date);
    });

    it('should automatically set created_at timestamp', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.created_at.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should trim whitespace from username', () => {
      const user = new User({
        username: '  testuser  ',
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      expect(user.username).toBe('testuser');
    });

    it('should convert email to lowercase', () => {
      const user = new User({
        username: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        password_hash: 'hashedpassword123'
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', () => {
      const user = new User({
        username: 'testuser',
        email: '  test@example.com  ',
        password_hash: 'hashedpassword123'
      });

      expect(user.email).toBe('test@example.com');
    });
  });

  describe('Username Validation', () => {
    it('should reject username shorter than 3 characters', () => {
      const user = new User({
        username: 'ab',
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.username).toBeDefined();
      expect(error?.errors?.username.message).toMatch(/Username must be at least 3 characters/);
    });

    it('should reject username longer than 20 characters', () => {
      const user = new User({
        username: 'a'.repeat(21),
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.username).toBeDefined();
      expect(error?.errors?.username.message).toMatch(/Username must not exceed 20 characters/);
    });

    it('should accept username with exactly 3 characters', () => {
      const user = new User({
        username: 'abc',
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
      expect(user.username).toBe('abc');
    });

    it('should accept username with exactly 20 characters', () => {
      const username = 'a'.repeat(20);
      const user = new User({
        username,
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
      expect(user.username).toBe(username);
    });

    it('should require username field', () => {
      const user = new User({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.username).toBeDefined();
      expect(error?.errors?.username.message).toMatch(/Username is required/);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@example-domain.com'
      ];

      for (const email of validEmails) {
        const user = new User({
          username: `user${validEmails.indexOf(email)}`,
          email,
          password_hash: 'hashedpassword123'
        });
        
        const error = user.validateSync();
        expect(error).toBeUndefined();
        expect(user.email).toBe(email.toLowerCase());
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
        'user..name@example.com'
      ];

      for (const email of invalidEmails) {
        const user = new User({
          username: `user${invalidEmails.indexOf(email)}`,
          email,
          password_hash: 'hashedpassword123'
        });

        const error = user.validateSync();
        expect(error).toBeDefined();
        expect(error?.errors?.email).toBeDefined();
        expect(error?.errors?.email.message).toMatch(/Invalid email format/);
      }
    });

    it('should require email field', () => {
      const user = new User({
        username: 'testuser',
        password_hash: 'hashedpassword123'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.email).toBeDefined();
      expect(error?.errors?.email.message).toMatch(/Email is required/);
    });
  });



  describe('Password Hash', () => {
    it('should require password_hash field', () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com'
      });

      const error = user.validateSync();
      expect(error).toBeDefined();
      expect(error?.errors?.password_hash).toBeDefined();
      expect(error?.errors?.password_hash.message).toMatch(/Password hash is required/);
    });

    it('should store password_hash as provided', () => {
      const passwordHash = 'hashedpassword123';
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: passwordHash
      });

      const error = user.validateSync();
      expect(error).toBeUndefined();
      expect(user.password_hash).toBe(passwordHash);
    });
  });

  describe('Indexes', () => {
    it('should have index on username', () => {
      const indexes = User.schema.indexes();
      const usernameIndex = indexes.find(idx => 
        idx[0].username !== undefined
      );
      expect(usernameIndex).toBeDefined();
    });

    it('should have index on email', () => {
      const indexes = User.schema.indexes();
      const emailIndex = indexes.find(idx => 
        idx[0].email !== undefined
      );
      expect(emailIndex).toBeDefined();
    });
  });
});
