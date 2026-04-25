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
