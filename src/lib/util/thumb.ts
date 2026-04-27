import type { PostView } from '$lib/types';

function hashHue(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) | 0;
	}
	return Math.abs(h) % 360;
}

/**
 * Hue-derived gradient used as a thumbnail placeholder when Reddit returns
 * no usable thumbnail or when one is blocked by the host. The mock uses the
 * same gradient construction.
 */
export function placeholderBg(seed: string | number): string {
	const h = typeof seed === 'number' ? Math.abs(seed) % 360 : hashHue(seed);
	const h2 = (h + 20) % 360;
	return `linear-gradient(135deg, oklch(74% 0.07 ${h}) 0%, oklch(48% 0.10 ${h}) 70%, oklch(32% 0.08 ${h2}) 100%)`;
}

export function isUsableThumb(url: string | undefined | null): boolean {
	if (!url) return false;
	if (!/^https?:/.test(url)) return false; // 'self', 'default', 'nsfw', 'spoiler', etc.
	return true;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;

/**
 * Smallest preview image at least `minWidth` wide, or the largest available
 * if none is that big. Falls through to thumbnail if Reddit didn't return a
 * preview block.
 */
export function pickPreview(post: PostView, minWidth: number): string | undefined {
	const imgs = post.previewImages;
	if (imgs && imgs.length > 0) {
		const m = imgs.find((r) => r.width >= minWidth) ?? imgs[imgs.length - 1];
		return m.url;
	}
	return isUsableThumb(post.thumbnail) ? post.thumbnail : undefined;
}

/**
 * The largest reasonable image to show on the thread page. Prefers a Reddit
 * preview around 1080px wide — full source images can be 4–10 MB and slow to
 * load on mobile, while a ~1080px preview is indistinguishable on screen.
 * Falls back to source URL or thumbnail if no suitable preview exists.
 */
const HERO_TARGET_WIDTH = 1080;

export function pickHero(post: PostView): string | undefined {
	const imgs = post.previewImages;
	if (imgs && imgs.length > 0) {
		// Smallest preview at least as wide as our target; if none reach the
		// target, the largest preview Reddit generated (still capped well below
		// most originals).
		const m = imgs.find((r) => r.width >= HERO_TARGET_WIDTH) ?? imgs[imgs.length - 1];
		return m.url;
	}
	if (post.url && IMAGE_EXT.test(post.url) && /^https?:/.test(post.url)) {
		return post.url;
	}
	return isUsableThumb(post.thumbnail) ? post.thumbnail : undefined;
}
