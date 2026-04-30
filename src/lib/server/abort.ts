export function createAbortError(): Error {
	if (typeof DOMException === 'function') {
		return new DOMException('The operation was aborted.', 'AbortError');
	}
	const err = new Error('The operation was aborted.');
	err.name = 'AbortError';
	return err;
}

export function isAbortError(err: unknown): err is Error {
	return err instanceof Error && err.name === 'AbortError';
}

export function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw createAbortError();
}

export function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
	if (!signal) return promise;
	throwIfAborted(signal);

	return new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(createAbortError());
		signal.addEventListener('abort', onAbort, { once: true });
		promise.then(resolve, reject).finally(() => {
			signal.removeEventListener('abort', onAbort);
		});
	});
}

export function abortedResponse(): Response {
	return new Response(null, {
		status: 499,
		statusText: 'Client Closed Request'
	});
}
