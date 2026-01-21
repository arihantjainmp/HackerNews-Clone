import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeUrl } from '../sanitize';

describe('sanitizeText', () => {
  it('should remove HTML tags from text', () => {
    const input = '<script>alert("XSS")</script>Hello World';
    const result = sanitizeText(input);
    expect(result).toBe('Hello World');
  });

  it('should remove all HTML tags including nested ones', () => {
    const input = '<div><p>Hello <strong>World</strong></p></div>';
    const result = sanitizeText(input);
    expect(result).toBe('Hello World');
  });

  it('should remove script tags and their content', () => {
    const input = 'Safe text <script>malicious()</script> more text';
    const result = sanitizeText(input);
    expect(result).toBe('Safe text  more text');
  });

  it('should handle text without HTML tags', () => {
    const input = 'Plain text without any HTML';
    const result = sanitizeText(input);
    expect(result).toBe('Plain text without any HTML');
  });

  it('should remove event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">Text';
    const result = sanitizeText(input);
    expect(result).toBe('Text');
  });

  it('should handle empty string', () => {
    const result = sanitizeText('');
    expect(result).toBe('');
  });

  it('should remove style tags', () => {
    const input = '<style>body { display: none; }</style>Content';
    const result = sanitizeText(input);
    expect(result).toBe('Content');
  });

  it('should remove iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe>Safe content';
    const result = sanitizeText(input);
    expect(result).toBe('Safe content');
  });

  it('should encode special HTML characters', () => {
    const input = 'Text with & < > " \' characters';
    const result = sanitizeText(input);
    // sanitize-html encodes HTML entities for safety
    expect(result).toBe('Text with &amp; &lt; &gt; " \' characters');
  });
});

describe('sanitizeUrl', () => {
  it('should allow valid http URLs', () => {
    const input = 'http://example.com';
    const result = sanitizeUrl(input);
    expect(result).toBe('http://example.com');
  });

  it('should allow valid https URLs', () => {
    const input = 'https://example.com/path?query=value';
    const result = sanitizeUrl(input);
    expect(result).toBe('https://example.com/path?query=value');
  });

  it('should reject javascript: protocol', () => {
    const input = 'javascript:alert(1)';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should reject data: protocol', () => {
    const input = 'data:text/html,<script>alert(1)</script>';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should reject vbscript: protocol', () => {
    const input = 'vbscript:msgbox(1)';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should reject file: protocol', () => {
    const input = 'file:///etc/passwd';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should reject URLs without http(s) protocol', () => {
    const input = 'ftp://example.com';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should handle case-insensitive protocol detection', () => {
    const input = 'JaVaScRiPt:alert(1)';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });

  it('should trim whitespace from URLs', () => {
    const input = '  https://example.com  ';
    const result = sanitizeUrl(input);
    expect(result).toBe('https://example.com');
  });

  it('should handle empty string', () => {
    const result = sanitizeUrl('');
    expect(result).toBe('');
  });

  it('should reject relative URLs', () => {
    const input = '/path/to/page';
    const result = sanitizeUrl(input);
    expect(result).toBe('');
  });
});
