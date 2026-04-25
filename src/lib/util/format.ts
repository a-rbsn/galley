/**
 * 14200 → "14.2k", 4156 → "4,156", 612 → "612".
 * Matches the mock's score formatting.
 */
export function formatScore(n: number): string {
	const abs = Math.abs(n);
	if (abs >= 100000) return `${Math.round(n / 1000)}k`;
	if (abs >= 10000) return `${(n / 1000).toFixed(1)}k`;
	return n.toLocaleString('en-GB');
}

export function formatCount(n: number): string {
	return n.toLocaleString('en-GB');
}
