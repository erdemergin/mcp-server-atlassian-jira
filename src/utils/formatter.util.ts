// Test comment to verify edit functionality

import { Logger } from './logger.util.js';
import { ResponsePagination } from '../types/common.types.js';

/**
 * Markdown formatting utilities
 */

/**
 * Standardized formatting utilities for consistent output across all CLI and Tool interfaces.
 * These functions should be used by all formatters to ensure consistent formatting.
 */

/**
 * Format a URL as a markdown link
 * @param url - URL to format
 * @param title - Link title
 * @returns Formatted markdown link
 */
export function formatUrl(url?: string, title?: string): string {
	if (!url) {
		return 'Not available';
	}

	const linkTitle = title || url;
	return `[${linkTitle}](${url})`;
}

/**
 * Format a heading with consistent style
 * @param text - Heading text
 * @param level - Heading level (1-6)
 * @returns Formatted heading
 */
export function formatHeading(text: string, level: number = 1): string {
	const validLevel = Math.min(Math.max(level, 1), 6);
	const prefix = '#'.repeat(validLevel);
	return `${prefix} ${text}`;
}

/**
 * Format a list of key-value pairs as a bullet list
 * @param items - Object with key-value pairs
 * @param keyFormatter - Optional function to format keys
 * @returns Formatted bullet list
 */
export function formatBulletList(
	items: Record<string, unknown>,
	keyFormatter?: (key: string) => string,
): string {
	const lines: string[] = [];

	for (const [key, value] of Object.entries(items)) {
		if (value === undefined || value === null) {
			continue;
		}

		const formattedKey = keyFormatter ? keyFormatter(key) : key;
		const formattedValue = formatValue(value);
		lines.push(`- **${formattedKey}**: ${formattedValue}`);
	}

	return lines.join('\n');
}

/**
 * Format a value based on its type
 * @param value - Value to format
 * @returns Formatted value
 */
function formatValue(value: unknown): string {
	if (value === undefined || value === null) {
		return 'Not available';
	}

	if (value instanceof Date) {
		// Use toLocaleString for Dates
		try {
			return value.toLocaleString();
		} catch {
			return 'Invalid date';
		}
	}

	// Handle URL objects with url and title properties
	if (typeof value === 'object' && value !== null && 'url' in value) {
		const urlObj = value as { url: string; title?: string };
		if (typeof urlObj.url === 'string') {
			return formatUrl(urlObj.url, urlObj.title);
		}
	}

	if (typeof value === 'string') {
		// Check if it's a URL
		if (value.startsWith('http://') || value.startsWith('https://')) {
			return formatUrl(value);
		}

		// Check if it might be a date string and format it
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
			try {
				return new Date(value).toLocaleString();
			} catch {
				return 'Invalid date string'; // Or return original string?
			}
		}

		return value;
	}

	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	return String(value);
}

/**
 * Format a separator line
 * @returns Separator line
 */
export function formatSeparator(): string {
	return '---';
}

/**
 * Format a numbered list of items
 * @param items - Array of items to format
 * @param formatter - Function to format each item
 * @returns Formatted numbered list
 */
export function formatNumberedList<T>(
	items: T[],
	formatter: (item: T, index: number) => string,
): string {
	if (items.length === 0) {
		return 'No items.';
	}

	return items
		.map((item, index) => formatter(item, index))
		.join('\n\n' + formatSeparator() + '\n\n');
}

/**
 * Format a date in a standardized way: YYYY-MM-DD HH:MM:SS UTC
 * @param dateInput - ISO date string, Date object, or timestamp number
 * @returns Formatted date string
 */
export function formatDate(dateInput?: string | Date | number): string {
	if (dateInput === undefined || dateInput === null) {
		return 'Not available';
	}

	try {
		// Create Date object correctly from string, Date, or number (timestamp)
		const date =
			dateInput instanceof Date ? dateInput : new Date(dateInput);

		// Check if the date is valid after creation
		if (isNaN(date.getTime())) {
			return 'Invalid date input';
		}

		// Format: YYYY-MM-DD HH:MM:SS UTC
		return date
			.toISOString()
			.replace('T', ' ')
			.replace(/\.\d+Z$/, ' UTC');
	} catch {
		return 'Invalid date';
	}
}

/**
 * Format pagination information in a standardized way for CLI output.
 * Includes separator, item counts, availability message, next page instructions, and timestamp.
 * @param pagination - The ResponsePagination object containing pagination details.
 * @returns Formatted pagination footer string for CLI.
 */
export function formatPagination(pagination: ResponsePagination): string {
	const methodLogger = Logger.forContext(
		'utils/formatter.util.ts',
		'formatPagination',
	);
	const parts: string[] = [formatSeparator()]; // Start with separator

	const { count = 0, hasMore, nextCursor, total } = pagination;

	// Showing count and potentially total
	if (total !== undefined && total >= 0) {
		parts.push(`*Showing ${count} of ${total} total items.*`);
	} else if (count >= 0) {
		parts.push(`*Showing ${count} item${count !== 1 ? 's' : ''}.*`);
	}

	// More results availability
	if (hasMore) {
		parts.push('More results are available.');
	}

	// Prompt for the next action (using next startAt value for Jira)
	if (hasMore && nextCursor) {
		// nextCursor holds the next startAt value for OFFSET pagination
		parts.push(`*Use --start-at ${nextCursor} to view more.*`);
	}

	// Add standard timestamp
	parts.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	const result = parts.join('\n').trim(); // Join with newline
	methodLogger.debug(`Formatted pagination footer: ${result}`);
	return result;
}
