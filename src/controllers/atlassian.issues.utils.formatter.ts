/**
 * Utility functions for formatting Jira issue data
 */

/**
 * Get emoji for issue status
 * Maps common Jira statuses to appropriate emoji for visual cues
 *
 * @param status - Status name from Jira
 * @returns Emoji representing the status
 */
export function getStatusEmoji(status: string | undefined): string {
	if (!status) return '';

	// Convert to lowercase for case-insensitive matching
	const statusLower = status.toLowerCase();

	// Map common statuses to emoji
	if (
		statusLower.includes('to do') ||
		statusLower.includes('todo') ||
		statusLower.includes('open') ||
		statusLower.includes('new')
	) {
		return '⚪ '; // White circle for open/to do
	} else if (
		statusLower.includes('in progress') ||
		statusLower.includes('started')
	) {
		return '🔵 '; // Blue circle for in progress
	} else if (
		statusLower.includes('done') ||
		statusLower.includes('closed') ||
		statusLower.includes('resolved') ||
		statusLower.includes('complete')
	) {
		return '✅ '; // Checkmark for done/completed
	} else if (
		statusLower.includes('review') ||
		statusLower.includes('testing')
	) {
		return '🔍 '; // Magnifying glass for review/testing
	} else if (
		statusLower.includes('block') ||
		statusLower.includes('impediment')
	) {
		return '🛑 '; // Stop sign for blocked
	} else if (statusLower.includes('backlog')) {
		return '📋 '; // Clipboard for backlog
	} else if (
		statusLower.includes('cancel') ||
		statusLower.includes("won't") ||
		statusLower.includes('wont')
	) {
		return '❌ '; // X for canceled/won't do
	}

	// Default for unknown status
	return '⚫ '; // Black circle for unknown status
}

/**
 * Get emoji for issue priority
 * Maps common Jira priority levels to appropriate emoji for visual cues
 *
 * @param priority - Priority name from Jira
 * @returns Emoji representing the priority
 */
export function getPriorityEmoji(priority: string | undefined): string {
	if (!priority) return '';

	// Convert to lowercase for case-insensitive matching
	const priorityLower = priority.toLowerCase();

	// Map common priority levels to emoji
	if (
		priorityLower.includes('highest') ||
		priorityLower.includes('critical') ||
		priorityLower.includes('blocker')
	) {
		return '🔴 '; // Red circle for highest/critical
	} else if (priorityLower.includes('high')) {
		return '🔺 '; // Red triangle for high
	} else if (
		priorityLower.includes('medium') ||
		priorityLower.includes('normal')
	) {
		return '⚠️ '; // Warning for medium
	} else if (priorityLower.includes('low')) {
		return '🔽 '; // Down triangle for low
	} else if (
		priorityLower.includes('lowest') ||
		priorityLower.includes('minor') ||
		priorityLower.includes('trivial')
	) {
		return '⬇️ '; // Down arrow for lowest
	}

	// Default for unknown priority
	return ''; // No emoji for unknown priority
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
