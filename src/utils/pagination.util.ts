import { Logger } from './logger.util.js';

// Create a contextualized logger for this file
const paginationLogger = Logger.forContext('utils/pagination.util.ts');

// Log pagination utility initialization
paginationLogger.debug('Pagination utility initialized');

/**
 * Types of pagination mechanisms used by different Atlassian APIs
 */
export enum PaginationType {
	/**
	 * Offset-based pagination (startAt, maxResults, total)
	 * Used by Jira APIs
	 */
	OFFSET = 'offset',

	/**
	 * Cursor-based pagination (cursor in URL)
	 * Used by Confluence APIs
	 */
	CURSOR = 'cursor',

	/**
	 * Page-based pagination (page parameter in URL)
	 * Used by Bitbucket APIs
	 */
	PAGE = 'page',
}

/**
 * Structure for offset-based pagination data
 */
export interface OffsetPaginationData {
	startAt?: number;
	maxResults?: number;
	total?: number;
	nextPage?: string;
	values?: unknown[];
}

/**
 * Structure for cursor-based pagination data (Confluence)
 */
export interface CursorPaginationData {
	_links: {
		next?: string;
	};
	results?: unknown[];
}

/**
 * Structure for page-based pagination data (Bitbucket)
 */
export interface PagePaginationData {
	next?: string;
	values?: unknown[];
}

/**
 * Union type for all pagination data types
 */
export type PaginationData =
	| OffsetPaginationData
	| CursorPaginationData
	| PagePaginationData;

/**
 * Response pagination information
 */
export interface ResponsePagination {
	/** The next cursor value (if applicable) */
	nextCursor?: string;
	/** Whether there are more results available */
	hasMore: boolean;
	/** Count of items in the current batch */
	count?: number;
}

/**
 * Extract pagination information from an API response
 * @param data API response data
 * @param type Pagination type (offset, cursor, or page)
 * @param source Optional source identifier for logging
 * @returns Response pagination information
 */
export function extractPaginationInfo(
	data: Record<string, any>,
	type: PaginationType,
	source?: string,
): ResponsePagination {
	const methodLogger = Logger.forContext(
		'utils/pagination.util.ts',
		'extractPaginationInfo',
	);

	methodLogger.debug(`Extracting pagination info using type: ${type}`);

	if (!data) {
		methodLogger.debug('No data provided for pagination extraction');
		return { hasMore: false };
	}

	let nextCursor: string | undefined;
	let count: number | undefined;
	let hasMore = false;

	try {
		// Extract count from the appropriate data field based on pagination type
		switch (type) {
			case PaginationType.OFFSET: {
				const offsetData = data as OffsetPaginationData;
				count = offsetData.values?.length;

				// Handle Jira's offset-based pagination
				if (
					offsetData.startAt !== undefined &&
					offsetData.maxResults !== undefined &&
					offsetData.total !== undefined &&
					offsetData.startAt + offsetData.maxResults <
						offsetData.total
				) {
					hasMore = true;
					nextCursor = String(
						offsetData.startAt + offsetData.maxResults,
					);
				} else if (offsetData.nextPage) {
					hasMore = true;
					nextCursor = offsetData.nextPage;
				}
				break;
			}

			case PaginationType.CURSOR: {
				const cursorData = data as CursorPaginationData;
				count = cursorData.results?.length;

				// Handle Confluence's cursor-based pagination
				if (cursorData._links && cursorData._links.next) {
					const nextUrl = cursorData._links.next;
					const cursorMatch = nextUrl.match(/cursor=([^&]+)/);
					if (cursorMatch && cursorMatch[1]) {
						hasMore = true;
						nextCursor = decodeURIComponent(cursorMatch[1]);
					}
				}
				break;
			}

			case PaginationType.PAGE: {
				const pageData = data as PagePaginationData;
				count = pageData.values?.length;

				// Handle Bitbucket's page-based pagination
				if (pageData.next) {
					try {
						const nextUrl = new URL(pageData.next);
						const nextPage = nextUrl.searchParams.get('page');
						if (nextPage) {
							hasMore = true;
							nextCursor = nextPage;
						}
					} catch (error) {
						methodLogger.warn(
							`${source} Failed to parse next URL: ${pageData.next}`,
							{ error },
						);
					}
				}
				break;
			}

			default:
				methodLogger.warn(`${source} Unknown pagination type: ${type}`);
		}

		if (nextCursor) {
			methodLogger.debug(`${source} Next cursor: ${nextCursor}`);
		}

		return {
			nextCursor,
			hasMore,
			count,
		};
	} catch (error) {
		methodLogger.warn(
			`${source} Error extracting pagination information: ${error instanceof Error ? error.message : String(error)}`,
		);
		return { hasMore: false };
	}
}
