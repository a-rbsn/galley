export type Sort = 'hot' | 'new' | 'top' | 'rising';
export type TopRange = 'day' | 'week' | 'month' | 'year' | 'all';

export const SORTS: Sort[] = ['hot', 'new', 'top', 'rising'];
export const TOP_RANGES: TopRange[] = ['day', 'week', 'month', 'year', 'all'];
export const DEFAULT_TOP_RANGE: TopRange = 'day';

export function isSort(s: string | null): s is Sort {
	return s === 'hot' || s === 'new' || s === 'top' || s === 'rising';
}

export function isTopRange(s: string | null): s is TopRange {
	return s === 'day' || s === 'week' || s === 'month' || s === 'year' || s === 'all';
}

export function rangeLabel(range: TopRange): string {
	if (range === 'day') return 'Day';
	if (range === 'week') return 'Week';
	if (range === 'month') return 'Month';
	if (range === 'year') return 'Year';
	return 'All';
}
