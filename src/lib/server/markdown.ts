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
	if (node.tagName === 'IMG') {
		// Force lazy load + drop referrer for any <img> that survives sanitisation
		// (i.e., from markdown image syntax). Block non-http(s) sources entirely.
		const src = node.getAttribute('src') ?? '';
		if (!/^https?:\/\//i.test(src)) {
			node.removeAttribute('src');
			return;
		}
		node.setAttribute('loading', 'lazy');
		node.setAttribute('referrerpolicy', 'no-referrer');
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
		'div',
		'img',
		'figure'
	],
	ALLOWED_ATTR: [
		'href',
		'title',
		'alt',
		'target',
		'rel',
		'src',
		'loading',
		'referrerpolicy',
		'class'
	]
};

marked.setOptions({ gfm: true, breaks: false });

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)$/i;

/**
 * Convert paragraphs that consist solely of a link to a direct image into
 * an embedded image preview. Inline image URLs inside prose stay as links —
 * we don't want to disrupt sentence flow.
 */
function autoEmbedImages(html: string): string {
	return html.replace(
		/<p>\s*<a\s+([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>\s*<\/p>/gi,
		(match, _pre, href, _post, text) => {
			let pathname: string;
			try {
				pathname = new URL(href).pathname;
			} catch {
				return match;
			}
			if (!IMAGE_EXT.test(pathname)) return match;
			const safeText = String(text).trim() || 'image';
			// safeText is sanitised HTML at this point — it came out of DOMPurify.
			return (
				`<figure class="image-embed">` +
				`<a href="${href}" target="_blank" rel="noopener noreferrer">` +
				`<img src="${href}" alt="${safeText.replace(/<[^>]*>/g, '')}" loading="lazy" referrerpolicy="no-referrer" />` +
				`</a>` +
				`</figure>`
			);
		}
	);
}

/**
 * Render Reddit-style markdown to a sanitised HTML string. Server-only.
 * Standalone image-link paragraphs are turned into embedded thumbnails;
 * everything else passes through marked + DOMPurify.
 */
export function renderMarkdown(body: string | undefined | null): string {
	if (!body) return '';
	const html = marked.parse(body, { async: false }) as string;
	const sanitised = DOMPurify.sanitize(html, PURIFY_CONFIG);
	return autoEmbedImages(sanitised);
}
