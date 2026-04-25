const MIN = 60;
const HOUR = 3600;
const DAY = 86400;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * Short relative time: 30s, 12m, 7h, 2d, 8mo, 3y.
 * Reddit returns created_utc in seconds.
 */
export function relativeTime(createdUtc: number, nowSec = Date.now() / 1000): string {
	const diff = Math.max(0, Math.floor(nowSec - createdUtc));
	if (diff < MIN) return `${diff}s`;
	if (diff < HOUR) return `${Math.floor(diff / MIN)}m`;
	if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
	if (diff < MONTH) return `${Math.floor(diff / DAY)}d`;
	if (diff < YEAR) return `${Math.floor(diff / MONTH)}mo`;
	return `${Math.floor(diff / YEAR)}y`;
}
