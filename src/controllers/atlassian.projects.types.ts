import { EntityIdentifier } from '../types/common.types.js';

/**
 * Project identifier for retrieving specific projects.
 * Used as the parameter to get() method.
 */
export interface ProjectIdentifier extends EntityIdentifier {
	/**
	 * The key or numeric ID of the project to retrieve.
	 * Can be either a string project key (e.g., "PROJ") or a numeric ID (e.g., "10001").
	 */
	projectKeyOrId: string;
}

/**
 * Options for listing Jira projects.
 * These options control filtering and pagination of project listings.
 */
export interface ListProjectsOptions {
	/**
	 * Index of the first item to return (0-based offset).
	 */
	startAt?: number;

	/**
	 * Maximum number of items to return (1-100).
	 */
	limit?: number;

	/**
	 * Filter projects by name or key.
	 * Performs a case-insensitive partial match on project name and key.
	 */
	name?: string;

	/**
	 * Property to sort projects by (e.g., 'key', 'lastIssueUpdatedTime')
	 * Default: 'lastIssueUpdatedTime' (most recently updated first)
	 */
	orderBy?: string;
}
