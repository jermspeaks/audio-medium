import DOMPurify from 'dompurify';

// Ensure links with target="_blank" get rel="noopener noreferrer" to avoid tab-napping.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Sanitizes HTML for safe rendering (e.g. in dangerouslySetInnerHTML).
 * Strips scripts, event handlers, javascript: URLs, and other dangerous markup.
 * Allows safe formatting tags (p, a, strong, em, ul, li, br, etc.) and adds
 * rel="noopener noreferrer" to links that have target="_blank".
 *
 * @param {string} html - Raw HTML string (e.g. from API/RSS).
 * @returns {string} Sanitized HTML, or empty string for falsy input.
 */
export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
  });
}
