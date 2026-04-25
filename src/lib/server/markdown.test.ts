import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { renderMarkdown } = await import('./markdown');

describe('renderMarkdown', () => {
	it('returns empty for empty input', () => {
		expect(renderMarkdown('')).toBe('');
		expect(renderMarkdown(undefined)).toBe('');
	});

	it('renders bold and links', () => {
		const html = renderMarkdown('A **strong** word and a [link](https://example.com).');
		expect(html).toContain('<strong>strong</strong>');
		expect(html).toContain('<a href="https://example.com"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	it('does not add target=_blank to reddit.com links', () => {
		const html = renderMarkdown('See [thread](https://www.reddit.com/r/x/comments/y/).');
		expect(html).not.toContain('target="_blank"');
	});

	it('embeds standalone image links as figures', () => {
		const html = renderMarkdown('https://i.redd.it/abc123.jpg');
		expect(html).toContain('<figure class="image-embed">');
		expect(html).toContain('<img src="https://i.redd.it/abc123.jpg"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('referrerpolicy="no-referrer"');
	});

	it('embeds image link with custom anchor text', () => {
		const html = renderMarkdown('[here](https://i.imgur.com/x.png)');
		expect(html).toContain('<figure class="image-embed">');
		expect(html).toContain('<img src="https://i.imgur.com/x.png"');
		expect(html).toContain('alt="here"');
	});

	it('keeps inline image links as plain anchors', () => {
		const html = renderMarkdown('See [this](https://i.redd.it/x.jpg) for context.');
		expect(html).not.toContain('<figure');
		expect(html).toContain('<a href="https://i.redd.it/x.jpg"');
	});

	it('does not embed non-image URLs', () => {
		const html = renderMarkdown('https://news.example.com/article');
		expect(html).not.toContain('<figure');
	});

	it('does not embed image URLs with javascript: protocol', () => {
		const html = renderMarkdown('[bad](javascript:alert(1))');
		// Sanitiser drops the dangerous href entirely.
		expect(html).not.toContain('javascript:');
	});

	it('strips script tags', () => {
		const html = renderMarkdown('<script>alert(1)</script>hello');
		expect(html).not.toContain('<script>');
	});

	it('handles image URLs with query strings', () => {
		const html = renderMarkdown('https://preview.redd.it/x.jpg?width=320&auto=webp');
		expect(html).toContain('<figure class="image-embed">');
		expect(html).toContain('<img src="https://preview.redd.it/x.jpg?width=320&amp;auto=webp"');
	});
});
