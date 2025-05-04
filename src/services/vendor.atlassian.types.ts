/**
 * Common types for Atlassian Jira API
 */

/**
 * Optional field metadata
 */
export interface OptionalFieldMeta {
	hasMore: boolean;
}

/**
 * Optional field links
 */
export interface OptionalFieldLinks {
	next?: string;
}

/**
 * Content property object
 */
export interface ContentProperty {
	id: string;
	key: string;
	value: string;
}

/**
 * Generic content representation
 */
export interface ContentRepresentation {
	value: string;
	representation: string;
}
