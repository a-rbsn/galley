import { describe, it, expect } from 'vitest';
import { relativeTime } from './time';

const NOW = 1_700_000_000;

describe('relativeTime', () => {
	it('renders seconds for < 1 minute', () => {
		expect(relativeTime(NOW - 30, NOW)).toBe('30s');
	});

	it('renders minutes for < 1 hour', () => {
		expect(relativeTime(NOW - 60 * 7, NOW)).toBe('7m');
	});

	it('renders hours for < 1 day', () => {
		expect(relativeTime(NOW - 3600 * 11, NOW)).toBe('11h');
	});

	it('renders days for < 1 month', () => {
		expect(relativeTime(NOW - 86400 * 5, NOW)).toBe('5d');
	});

	it('renders months for < 1 year', () => {
		expect(relativeTime(NOW - 86400 * 92, NOW)).toBe('3mo');
	});

	it('renders years for >= 1 year', () => {
		expect(relativeTime(NOW - 86400 * 365 * 2, NOW)).toBe('2y');
	});

	it('clamps negative diffs to 0s (future timestamps)', () => {
		expect(relativeTime(NOW + 1000, NOW)).toBe('0s');
	});
});
