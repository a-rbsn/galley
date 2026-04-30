import { isAbortError, throwIfAborted } from './abort';

export async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
	signal?: AbortSignal
): Promise<Array<PromiseSettledResult<R>>> {
	const out = new Array<PromiseSettledResult<R>>(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
		while (next < items.length) {
			throwIfAborted(signal);
			const index = next++;
			try {
				out[index] = { status: 'fulfilled', value: await fn(items[index], index) };
			} catch (reason) {
				if (isAbortError(reason)) throw reason;
				out[index] = { status: 'rejected', reason };
			}
		}
	});
	await Promise.all(workers);
	return out;
}
