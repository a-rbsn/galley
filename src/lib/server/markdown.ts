import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

// Force external links to open in a new tab with safe rel attributes.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
	if (node.tagName === 'A') {
		const href = (node.getAttribute('href') ?? '').toLowerCase();
		if (/^https?:\/\//.test(href) && !/^https?:\/\/(www\.)?reddit\.com/.test(href)) {
			node.setAttribute('target', '_blank');
			node.setAttribute('rel', 'noopener noreferrer');
		}
	}
});

const PURIFY_CONFIG = {
	ALLOWED_TAGS: [
		'a',
		'p',
		'br',
		'em',
		'strong',
		'code',
		'pre',
		'blockquote',
		'ul',
		'ol',
		'li',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'table',
		'thead',
		'tbody',
		'tr',
		'th',
		'td',
		'del',
		'sub',
		'sup',
		'hr',
		'span',
		'div'
	],
	ALLOWED_ATTR: ['href', 'title', 'alt', 'target', 'rel']
};

marked.setOptions({ gfm: true, breaks: false });

/**
 * Render Reddit-style markdown to a sanitised HTML string. Server-only.
 * `body` may be undefined or empty; we return an empty string in that case.
 */
export function renderMarkdown(body: string | undefined | null): string {
	if (!body) return '';
	const html = marked.parse(body, { async: false }) as string;
	return DOMPurify.sanitize(html, PURIFY_CONFIG);
}
