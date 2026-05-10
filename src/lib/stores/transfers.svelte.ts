export type TransferType = 'upload' | 'download';
export type TransferStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface Transfer {
	id: string;
	type: TransferType;
	fileName: string;
	fileSize: number;
	bucket: string;
	key: string;
	status: TransferStatus;
	progress: number; // 0-100
	bytesTransferred: number;
	speed: number; // bytes/sec
	estimatedTimeRemaining: number; // seconds
	startedAt: number; // timestamp
	completedAt?: number; // timestamp
	error?: string;
	abortController?: AbortController;
}

// Module-level reactive state
let transfers = $state<Transfer[]>([]);
let isExpanded = $state(false);
let showHistory = $state(false);

// Exported getters
export function getTransfers(): Transfer[] {
	return transfers;
}
export function getIsExpanded(): boolean {
	return isExpanded;
}
export function getShowHistory(): boolean {
	return showHistory;
}
export function setExpanded(val: boolean) {
	isExpanded = val;
}
export function setShowHistory(val: boolean) {
	showHistory = val;
}

export function addTransfer(transfer: Omit<Transfer, 'id' | 'startedAt'>): string {
	const id = `transfer-${Date.now()}-${Math.random().toString(36).slice(2)}`;
	transfers = [...transfers, { ...transfer, id, startedAt: Date.now() }];
	isExpanded = true; // Auto-expand when new transfer starts
	return id;
}

export function updateTransfer(id: string, updates: Partial<Transfer>) {
	transfers = transfers.map((t) => (t.id === id ? { ...t, ...updates } : t));
}

export function removeTransfer(id: string) {
	transfers = transfers.filter((t) => t.id !== id);
}

export function cancelTransfer(id: string) {
	const transfer = transfers.find((t) => t.id === id);
	if (transfer?.abortController) {
		transfer.abortController.abort();
	}
	updateTransfer(id, { status: 'cancelled' });
}

export function clearCompleted() {
	transfers = transfers.filter((t) => t.status === 'active' || t.status === 'pending');
}

export function getActiveTransfers(): Transfer[] {
	return transfers.filter((t) => t.status === 'active' || t.status === 'pending');
}

export function getCompletedTransfers(): Transfer[] {
	return transfers.filter(
		(t) => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
	);
}

// Helper to format bytes
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper to format time
export function formatTime(seconds: number): string {
	if (!isFinite(seconds) || seconds <= 0) return '--';
	if (seconds < 60) return `${Math.round(seconds)}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
	return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
