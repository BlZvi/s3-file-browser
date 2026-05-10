export interface MultipartUploadOptions {
	file: File;
	bucket: string;
	key: string;
	chunkSize?: number; // Default: 10MB (10 * 1024 * 1024)
	concurrency?: number; // Default: 3 (parallel part uploads)
	onProgress?: (progress: MultipartProgress) => void;
	onComplete?: () => void;
	onError?: (error: Error) => void;
	signal?: AbortSignal; // For cancellation
}

export interface MultipartProgress {
	uploadId: string;
	totalParts: number;
	completedParts: number;
	bytesUploaded: number;
	totalBytes: number;
	percentComplete: number;
	currentSpeed: number; // bytes/sec
	estimatedTimeRemaining: number; // seconds
}

export interface MultipartUploadState {
	uploadId: string;
	bucket: string;
	key: string;
	fileName: string;
	fileSize: number;
	chunkSize: number;
	completedParts: Array<{ PartNumber: number; ETag: string }>;
	startedAt: number;
}

/** Threshold for using multipart upload (files >= 100MB) */
export const MULTIPART_THRESHOLD = 100 * 1024 * 1024;

/** Check if a file should use multipart upload */
export function shouldUseMultipart(fileSize: number): boolean {
	return fileSize >= MULTIPART_THRESHOLD;
}

export async function performMultipartUpload(options: MultipartUploadOptions): Promise<void> {
	const {
		file,
		bucket,
		key,
		chunkSize = 10 * 1024 * 1024,
		concurrency = 3,
		onProgress,
		onComplete,
		onError,
		signal
	} = options;

	try {
		// 1. Check for resumable upload in localStorage
		const resumeState = getResumeState(bucket, key, file.size);
		let uploadId: string;
		let completedParts: Array<{ PartNumber: number; ETag: string }> = [];

		if (resumeState) {
			// Resume: use existing uploadId and skip completed parts
			uploadId = resumeState.uploadId;
			completedParts = resumeState.completedParts;
		} else {
			// Initiate new multipart upload
			const initRes = await fetch('/api/s3/multipart/initiate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					bucket,
					key,
					contentType: file.type || 'application/octet-stream'
				})
			});
			if (!initRes.ok) throw new Error('Failed to initiate multipart upload');
			const initData = await initRes.json();
			uploadId = initData.uploadId;
		}

		// 2. Calculate parts
		const totalParts = Math.ceil(file.size / chunkSize);
		const completedPartNumbers = new Set(completedParts.map((p) => p.PartNumber));
		const remainingParts = Array.from({ length: totalParts }, (_, i) => i + 1).filter(
			(n) => !completedPartNumbers.has(n)
		);

		let bytesUploaded = completedParts.reduce((sum, p) => {
			// Estimate bytes from completed parts
			return sum + Math.min(chunkSize, file.size - (p.PartNumber - 1) * chunkSize);
		}, 0);
		const startTime = Date.now();

		// Track per-chunk progress for accurate reporting
		const chunkProgress = new Map<number, number>();

		// 3. Upload parts in parallel with concurrency limit
		const uploadPart = async (
			partNumber: number
		): Promise<{ PartNumber: number; ETag: string }> => {
			if (signal?.aborted) throw new Error('Upload cancelled');

			// Get presigned URL for this part
			const presignRes = await fetch('/api/s3/multipart/presign-part', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ bucket, key, uploadId, partNumber })
			});
			if (!presignRes.ok)
				throw new Error(`Failed to get presigned URL for part ${partNumber}`);
			const { url } = await presignRes.json();

			// Slice the file chunk
			const start = (partNumber - 1) * chunkSize;
			const end = Math.min(start + chunkSize, file.size);
			const chunk = file.slice(start, end);

			// Upload the chunk via XHR (for progress events)
			const etag = await uploadChunkWithProgress(url, chunk, signal, (chunkBytes) => {
				// Track this chunk's progress
				chunkProgress.set(partNumber, chunkBytes);

				// Calculate total uploaded bytes
				const activeChunkBytes = Array.from(chunkProgress.values()).reduce(
					(sum, b) => sum + b,
					0
				);
				const currentUploaded = bytesUploaded + activeChunkBytes;
				const elapsed = (Date.now() - startTime) / 1000;
				const speed = elapsed > 0 ? currentUploaded / elapsed : 0;
				const remaining = speed > 0 ? (file.size - currentUploaded) / speed : 0;

				onProgress?.({
					uploadId,
					totalParts,
					completedParts: completedParts.length,
					bytesUploaded: currentUploaded,
					totalBytes: file.size,
					percentComplete: Math.round((currentUploaded / file.size) * 100),
					currentSpeed: speed,
					estimatedTimeRemaining: remaining
				});
			});

			// Part completed — update tracking
			const partSize = end - start;
			bytesUploaded += partSize;
			chunkProgress.delete(partNumber);

			const part = { PartNumber: partNumber, ETag: etag };
			completedParts.push(part);

			// Save state for resume
			saveResumeState({
				uploadId,
				bucket,
				key,
				fileName: file.name,
				fileSize: file.size,
				chunkSize,
				completedParts,
				startedAt: startTime
			});

			return part;
		};

		// Parallel upload with concurrency limit
		await parallelMap(remainingParts, uploadPart, concurrency);

		// 4. Complete the multipart upload
		const completeRes = await fetch('/api/s3/multipart/complete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ bucket, key, uploadId, parts: completedParts })
		});
		if (!completeRes.ok) throw new Error('Failed to complete multipart upload');

		// 5. Clean up resume state
		clearResumeState(bucket, key);

		onComplete?.();
	} catch (err: unknown) {
		const error = err instanceof Error ? err : new Error(String(err));
		if (error.message !== 'Upload cancelled') {
			// Don't clear resume state on cancel — allow resume later
			onError?.(error);
		}
		throw error;
	}
}

/** Upload a chunk using XHR for progress tracking */
function uploadChunkWithProgress(
	url: string,
	chunk: Blob,
	signal?: AbortSignal,
	onChunkProgress?: (bytesUploaded: number) => void
): Promise<string> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);

		if (signal) {
			signal.addEventListener('abort', () => {
				xhr.abort();
				reject(new Error('Upload cancelled'));
			});
		}

		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				onChunkProgress?.(e.loaded);
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				const etag = xhr.getResponseHeader('ETag') || '';
				resolve(etag.replace(/"/g, ''));
			} else {
				reject(new Error(`Upload failed with status ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error('Upload failed'));
		xhr.send(chunk);
	});
}

/** Parallel execution with concurrency limit */
async function parallelMap<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	concurrency: number
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let index = 0;

	async function worker() {
		while (index < items.length) {
			const i = index++;
			results[i] = await fn(items[i]);
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
	);
	return results;
}

// ── localStorage resume state management ────────────────────────────────

function getResumeKey(bucket: string, key: string): string {
	return `multipart-upload:${bucket}:${key}`;
}

function saveResumeState(state: MultipartUploadState): void {
	try {
		localStorage.setItem(getResumeKey(state.bucket, state.key), JSON.stringify(state));
	} catch {
		/* localStorage might be full or unavailable */
	}
}

function getResumeState(
	bucket: string,
	key: string,
	fileSize: number
): MultipartUploadState | null {
	try {
		const stored = localStorage.getItem(getResumeKey(bucket, key));
		if (!stored) return null;
		const state: MultipartUploadState = JSON.parse(stored);
		// Only resume if file size matches (same file)
		if (state.fileSize !== fileSize) return null;
		// Only resume if not too old (24 hours)
		if (Date.now() - state.startedAt > 24 * 60 * 60 * 1000) return null;
		return state;
	} catch {
		return null;
	}
}

function clearResumeState(bucket: string, key: string): void {
	try {
		localStorage.removeItem(getResumeKey(bucket, key));
	} catch {
		/* ignore */
	}
}
