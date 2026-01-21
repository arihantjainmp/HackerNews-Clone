import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize text content to prevent XSS attacks
 * Removes all HTML tags and script content
 * @param text - The text content to sanitize
 * @returns Sanitized text with HTML/script tags removed
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Remove all HTML tags and scripts
  return sanitizeHtml(text, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {}, // No attributes allowed
    disallowedTagsMode: 'discard', // Remove disallowed tags entirely
  });
}

/**
 * Sanitize post title to prevent XSS attacks
 * @param title - The post title to sanitize
 * @returns Sanitized title
 */
export function sanitizePostTitle(title: string): string {
  return sanitizeText(title);
}

/**
 * Sanitize post text content to prevent XSS attacks
 * @param text - The post text to sanitize
 * @returns Sanitized text
 */
export function sanitizePostText(text: string): string {
  return sanitizeText(text);
}

/**
 * Sanitize comment content to prevent XSS attacks
 * @param content - The comment content to sanitize
 * @returns Sanitized content
 */
export function sanitizeCommentContent(content: string): string {
  return sanitizeText(content);
}

/**
 * Sanitize URL to prevent XSS attacks via javascript: or data: URLs
 * Only allows http: and https: protocols
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if unsafe
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim();
  
  // Check for dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmedUrl.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return ''; // Return empty string for dangerous URLs
    }
  }

  // Only allow http and https protocols
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return ''; // Return empty string for non-http(s) URLs
  }

  return trimmedUrl;
}
