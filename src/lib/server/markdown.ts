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
 * Convert paragraphs that consist solely of a link to a direct image — or a
 * standalone <img> from markdown's ![alt](url) syntax (used for embedded
 * gifs) — into an embedded image preview. Inline image URLs inside prose
 * stay as links: we don't want to disrupt sentence flow.
 */
function autoEmbedImages(html: string): string {
	const wrapped = html.replace(
		/<p>\s*(<img\s[^>]*?\/?>)\s*<\/p>/gi,
		(match, imgTag) => {
			const srcMatch = /\bsrc="([^"]+)"/i.exec(imgTag);
			const src = srcMatch?.[1];
			if (!src || !/^https?:\/\//i.test(src)) return match;
			return (
				`<figure class="image-embed">` +
				`<a href="${src}" target="_blank" rel="noopener noreferrer">` +
				imgTag +
				`</a>` +
				`</figure>`
			);
		}
	);
	return wrapped.replace(
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

// Content-keyed LRU memo. marked + DOMPurify + the regex passes are pure
// functions of the input body, so the same body always yields the same HTML.
// Comment bodies are mostly small and frequently re-rendered (re-navigation,
// streamed batches, "load more" expansions), and this turns those repeats
// into a Map lookup.
const RENDER_CACHE_MAX = 5000;
const renderCache = new Map<string, string>();

export function renderMarkdown(body: string | undefined | null): string {
	if (!body) return '';
	const cached = renderCache.get(body);
	if (cached !== undefined) {
		// Refresh LRU position.
		renderCache.delete(body);
		renderCache.set(body, cached);
		return cached;
	}
	const html = marked.parse(body, { async: false }) as string;
	const sanitised = DOMPurify.sanitize(html, PURIFY_CONFIG);
	const out = autoEmbedImages(sanitised);
	renderCache.set(body, out);
	if (renderCache.size > RENDER_CACHE_MAX) {
		const oldest = renderCache.keys().next().value;
		if (oldest !== undefined) renderCache.delete(oldest);
	}
	return out;
}

export function _clearRenderCache() {
	renderCache.clear();
}
