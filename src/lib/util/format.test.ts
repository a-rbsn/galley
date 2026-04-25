import { describe, it, expect } from 'vitest';
import { formatScore, formatCount } from './format';

describe('formatScore', () => {
	it('formats < 10k with thousands separators', () => {
		expect(formatScore(847)).toBe('847');
		expect(formatScore(4156)).toBe('4,156');
		expect(formatScore(9999)).toBe('9,999');
	});

	it('formats 10k–99k with one decimal', () => {
		expect(formatScore(14200)).toBe('14.2k');
		expect(formatScore(22400)).toBe('22.4k');
		expect(formatScore(11700)).toBe('11.7k');
	});

	it('formats >= 100k with whole-thousand rounding', () => {
		expect(formatScore(123456)).toBe('123k');
		expect(formatScore(2_100_000)).toBe('2100k');
	});
});

describe('formatCount', () => {
	it('formats with British thousands separators', () => {
		expect(formatCount(1847)).toBe('1,847');
		expect(formatCount(42)).toBe('42');
	});
});
