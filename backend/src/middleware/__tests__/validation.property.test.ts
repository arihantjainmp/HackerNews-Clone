import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  signupSchema,
  loginSchema,
  createPostSchema,
  createCommentSchema,
} from '../validation';
import { sanitizeText, sanitizeUrl } from '../../utils/sanitize';

/**
 * Property 32: Input Validation Universality
 * 
 * For any user input received by the backend, validation should be 
 * performed against expected format and constraints before processing.
 * 
 * **Validates: Requirements 12.1**
 */
describe('Property 32: Input Validation Universality', () => {
  it('should validate all signup inputs against expected format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.oneof(
            fc.string({ minLength: 3, maxLength: 20 }), // Valid
            fc.string({ minLength: 0, maxLength: 2 }), // Too short
            fc.string({ minLength: 21, maxLength: 50 }), // Too long
            fc.constant(undefined), // Missing
          ),
          email: fc.oneof(
            fc.emailAddress(), // Valid
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('@')), // Invalid format
            fc.constant(undefined), // Missing
          ),
          password: fc.oneof(
            fc.string({ minLength: 8, maxLength: 50 }), // Valid length
            fc.string({ minLength: 0, maxLength: 7 }), // Too short
            fc.constant(undefined), // Missing
          ),
        }),
        async (input) => {
          const result = signupSchema.validate(input, { abortEarly: false });
          
          // Property: Validation must always return a result (either success or error)
          expect(result).toBeDefined();
          
          // Property: If any field is invalid, error must be defined
          const hasInvalidUsername = !input.username || input.username.length < 3 || input.username.length > 20;
          const hasInvalidEmail = !input.email || !input.email.includes('@');
          const hasInvalidPassword = !input.password || input.password.length < 8;
          
          if (hasInvalidUsername || hasInvalidEmail || hasInvalidPassword) {
            expect(result.error).toBeDefined();
            expect(result.error?.details).toBeDefined();
            expect(result.error!.details.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate all login inputs against expected format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.oneof(
            fc.emailAddress(), // Valid
            fc.string().filter(s => !s.includes('@')), // Invalid
            fc.constant(undefined), // Missing
          ),
          password: fc.oneof(
            fc.string({ minLength: 1, maxLength: 100 }), // Valid
            fc.constant(undefined), // Missing
          ),
        }),
        async (input) => {
          const result = loginSchema.validate(input, { abortEarly: false });
          
          // Property: Validation must always return a result
          expect(result).toBeDefined();
          
          // Property: If any field is invalid, error must be defined
          const hasInvalidEmail = !input.email || !input.email.includes('@');
          const hasInvalidPassword = !input.password;
          
          if (hasInvalidEmail || hasInvalidPassword) {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate all post creation inputs against expected format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.oneof(
            fc.string({ minLength: 1, maxLength: 300 }), // Valid
            fc.string({ minLength: 301, maxLength: 500 }), // Too long
            fc.constant(''), // Empty
            fc.constant(undefined), // Missing
          ),
          url: fc.option(fc.webUrl()),
          text: fc.option(fc.string({ maxLength: 10000 })),
        }),
        async (input) => {
          const result = createPostSchema.validate(input, { abortEarly: false });
          
          // Property: Validation must always return a result
          expect(result).toBeDefined();
          
          // Property: Invalid inputs must produce errors
          const hasInvalidTitle = !input.title || input.title.length === 0 || input.title.length > 300;
          const hasBothUrlAndText = input.url && input.text;
          const hasNeitherUrlNorText = !input.url && !input.text;
          
          if (hasInvalidTitle || hasBothUrlAndText || hasNeitherUrlNorText) {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate all comment inputs against expected format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          content: fc.oneof(
            fc.string({ minLength: 1, maxLength: 10000 }), // Valid
            fc.string({ minLength: 10001, maxLength: 15000 }), // Too long
            fc.constant(''), // Empty
            fc.constant(undefined), // Missing
          ),
        }),
        async (input) => {
          const result = createCommentSchema.validate(input, { abortEarly: false });
          
          // Property: Validation must always return a result
          expect(result).toBeDefined();
          
          // Property: Invalid inputs must produce errors
          const hasInvalidContent = !input.content || input.content.length === 0 || input.content.length > 10000;
          
          if (hasInvalidContent) {
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 33: XSS Prevention
 * 
 * For any text content submitted by users, HTML and script tags should be 
 * sanitized or escaped to prevent XSS attacks.
 * 
 * **Validates: Requirements 12.2**
 */
describe('Property 33: XSS Prevention', () => {
  it('should sanitize any HTML tags from text content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        fc.constantFrom(
          '<script>',
          '</script>',
          '<img src=x onerror=alert(1)>',
          '<iframe>',
          '<object>',
          '<embed>',
          '<style>',
          '<link>',
          '<meta>',
          '<div>',
          '<span>',
          '<a href="javascript:alert(1)">',
        ),
        async (text, xssPayload) => {
          const maliciousContent = text + xssPayload + text;
          const sanitized = sanitizeText(maliciousContent);
          
          // Property: Sanitized content must not contain HTML tags
          expect(sanitized).not.toContain('<script');
          expect(sanitized).not.toContain('</script>');
          expect(sanitized).not.toContain('<img');
          expect(sanitized).not.toContain('<iframe');
          expect(sanitized).not.toContain('<object');
          expect(sanitized).not.toContain('<embed');
          expect(sanitized).not.toContain('<style');
          expect(sanitized).not.toContain('<link');
          expect(sanitized).not.toContain('<meta');
          expect(sanitized).not.toContain('<div');
          expect(sanitized).not.toContain('<span');
          expect(sanitized).not.toContain('<a ');
          
          // Property: Sanitized content must not contain dangerous attributes
          expect(sanitized).not.toContain('onerror=');
          expect(sanitized).not.toContain('onclick=');
          expect(sanitized).not.toContain('onload=');
          expect(sanitized).not.toContain('javascript:');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sanitize any script injection attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.constantFrom(
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>',
            '<body onload=alert(1)>',
            '<iframe src="javascript:alert(1)">',
            '"><script>alert(String.fromCharCode(88,83,83))</script>',
            '<script>document.cookie</script>',
            '<img src="x" onerror="eval(atob(\'YWxlcnQoMSk=\'))">',
          ),
          { minLength: 1, maxLength: 5 }
        ),
        async (xssPayloads) => {
          for (const payload of xssPayloads) {
            const sanitized = sanitizeText(payload);
            
            // Property: All script tags must be removed
            expect(sanitized).not.toContain('<script');
            expect(sanitized).not.toContain('</script>');
            
            // Property: All event handlers must be removed
            expect(sanitized.toLowerCase()).not.toContain('onerror');
            expect(sanitized.toLowerCase()).not.toContain('onload');
            expect(sanitized.toLowerCase()).not.toContain('onclick');
            
            // Property: All javascript: protocols must be removed
            expect(sanitized.toLowerCase()).not.toContain('javascript:');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve safe text content while removing dangerous elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 })
          .filter(s => !s.includes('<') && !s.includes('>') && !s.includes('&')),
        async (safeText) => {
          const sanitized = sanitizeText(safeText);
          
          // Property: Safe text without HTML or special characters should remain unchanged
          expect(sanitized).toBe(safeText);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 34: URL Format Validation
 * 
 * For any URL submitted by users, it should be validated against proper 
 * URL format standards, and invalid URLs should be rejected.
 * 
 * **Validates: Requirements 12.3**
 */
describe('Property 34: URL Format Validation', () => {
  it('should accept any valid HTTP/HTTPS URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl(),
        async (url) => {
          const result = createPostSchema.validate({
            title: 'Test Post',
            url: url,
          });
          
          // Property: Valid URLs should pass validation
          if (url.startsWith('http://') || url.startsWith('https://')) {
            expect(result.error).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any URL with dangerous protocols', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'javascript:',
          'data:',
          'vbscript:',
          'file:',
        ),
        fc.string({ minLength: 5, maxLength: 50 }),
        async (protocol, path) => {
          const dangerousUrl = protocol + path;
          const result = createPostSchema.validate({
            title: 'Test Post',
            url: dangerousUrl,
          });
          
          // Property: Dangerous protocol URLs must be rejected
          expect(result.error).toBeDefined();
          expect(result.error?.message).toMatch(/protocol|not allowed|security/i);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any malformed URL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('://')),
          fc.constant('not a url'),
          fc.constant('htp://missing-t.com'),
          fc.constant('://no-protocol.com'),
        ),
        async (invalidUrl) => {
          const result = createPostSchema.validate({
            title: 'Test Post',
            url: invalidUrl,
          });
          
          // Property: Malformed URLs must be rejected
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sanitize dangerous URLs to empty string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'javascript:alert(1)',
          'data:text/html,<script>alert(1)</script>',
          'vbscript:msgbox(1)',
          'file:///etc/passwd',
        ),
        async (dangerousUrl) => {
          const sanitized = sanitizeUrl(dangerousUrl);
          
          // Property: Dangerous URLs must be sanitized to empty string
          expect(sanitized).toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve valid HTTP/HTTPS URLs during sanitization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.webUrl().filter(url => url.startsWith('http://') || url.startsWith('https://')),
        async (validUrl) => {
          const sanitized = sanitizeUrl(validUrl);
          
          // Property: Valid URLs should be preserved
          expect(sanitized).toBe(validUrl);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 35: Email Format Validation
 * 
 * For any email submitted by users, it should be validated against email 
 * format standards (containing @ and domain), and invalid emails should be rejected.
 * 
 * **Validates: Requirements 12.4**
 */
describe('Property 35: Email Format Validation', () => {
  it('should accept any valid email format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        fc.constantFrom('com', 'org', 'net', 'edu', 'gov', 'io', 'co'),
        async (localPart, domain, tld) => {
          const email = `${localPart}@${domain}.${tld}`;
          const result = signupSchema.validate({
            username: 'testuser',
            email: email,
            password: 'Password123!',
          });
          
          // Property: Well-formed emails should pass validation
          expect(result.error).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any email without @ symbol', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }).filter(s => !s.includes('@')),
        async (invalidEmail) => {
          const result = signupSchema.validate({
            username: 'testuser',
            email: invalidEmail,
            password: 'Password123!',
          });
          
          // Property: Emails without @ must be rejected
          expect(result.error).toBeDefined();
          expect(result.error?.details.some(d => d.path.includes('email'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any email without domain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        async (localPart) => {
          const invalidEmail = localPart + '@';
          const result = signupSchema.validate({
            username: 'testuser',
            email: invalidEmail,
            password: 'Password123!',
          });
          
          // Property: Emails without domain must be rejected
          expect(result.error).toBeDefined();
          expect(result.error?.details.some(d => d.path.includes('email'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject any malformed email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('not-an-email'),
          fc.constant('@nodomain'),
          fc.constant('noat.com'),
          fc.constant('multiple@@at.com'),
          fc.constant('spaces in@email.com'),
        ),
        async (invalidEmail) => {
          const result = signupSchema.validate({
            username: 'testuser',
            email: invalidEmail,
            password: 'Password123!',
          });
          
          // Property: Malformed emails must be rejected
          expect(result.error).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 36: Validation Error Response Format
 * 
 * For any validation failure, the backend should return a 400 status code 
 * with specific error messages describing which fields failed validation and why.
 * 
 * **Validates: Requirements 12.5**
 */
describe('Property 36: Validation Error Response Format', () => {
  it('should return structured error format for any validation failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.option(fc.string({ minLength: 0, maxLength: 2 })), // Invalid
          email: fc.option(fc.string().filter(s => !s.includes('@'))), // Invalid
          password: fc.option(fc.string({ minLength: 0, maxLength: 7 })), // Invalid
        }),
        async (invalidInput) => {
          const result = signupSchema.validate(invalidInput, { abortEarly: false });
          
          if (result.error) {
            // Property: Error must have details array
            expect(result.error.details).toBeDefined();
            expect(Array.isArray(result.error.details)).toBe(true);
            expect(result.error.details.length).toBeGreaterThan(0);
            
            // Property: Each error detail must have path and message
            for (const detail of result.error.details) {
              expect(detail.path).toBeDefined();
              expect(Array.isArray(detail.path)).toBe(true);
              expect(detail.message).toBeDefined();
              expect(typeof detail.message).toBe('string');
              expect(detail.message.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide specific field names in error messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('username', 'email', 'password'),
        async (fieldName) => {
          const invalidInput: any = {
            username: 'validuser',
            email: 'valid@example.com',
            password: 'ValidPass123!',
          };
          
          // Make the specific field invalid
          if (fieldName === 'username') {
            invalidInput.username = 'ab'; // Too short
          } else if (fieldName === 'email') {
            invalidInput.email = 'invalid-email'; // No @
          } else if (fieldName === 'password') {
            invalidInput.password = 'short'; // Too short
          }
          
          const result = signupSchema.validate(invalidInput, { abortEarly: false });
          
          // Property: Error must reference the specific field
          expect(result.error).toBeDefined();
          expect(result.error?.details.some(d => d.path.includes(fieldName))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide descriptive error messages for any validation failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.oneof(
            fc.constant(''), // Empty
            fc.string({ minLength: 301, maxLength: 500 }), // Too long
          ),
          url: fc.option(fc.constant('invalid-url')),
          text: fc.option(fc.string({ minLength: 10001, maxLength: 15000 })),
        }),
        async (invalidInput) => {
          const result = createPostSchema.validate(invalidInput, { abortEarly: false });
          
          if (result.error) {
            // Property: Each error message must be descriptive (not just "invalid")
            for (const detail of result.error.details) {
              expect(detail.message).toBeDefined();
              expect(detail.message.length).toBeGreaterThan(10); // More than just "invalid"
              expect(typeof detail.message).toBe('string');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return all validation errors when multiple fields are invalid', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // Only 3 fields exist: username, email, password
        async (numInvalidFields) => {
          const invalidInput: any = {};
          
          // Create multiple invalid fields
          const fields = ['username', 'email', 'password'];
          for (let i = 0; i < Math.min(numInvalidFields, fields.length); i++) {
            if (fields[i] === 'username') {
              invalidInput.username = 'a'; // Too short
            } else if (fields[i] === 'email') {
              invalidInput.email = 'invalid'; // No @
            } else if (fields[i] === 'password') {
              invalidInput.password = 'short'; // Too short
            }
          }
          
          const result = signupSchema.validate(invalidInput, { abortEarly: false });
          
          // Property: All invalid fields must be reported
          expect(result.error).toBeDefined();
          expect(result.error!.details.length).toBeGreaterThanOrEqual(numInvalidFields);
        }
      ),
      { numRuns: 100 }
    );
  });
});
