import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

/**
 * Project identifier for retrieving specific projects.
 * Used as the parameter to get() method.
 */
export interface ProjectIdentifier extends EntityIdentifier {
	/**
	 * The ID or key of the project to retrieve.
	 * Can be either a numeric ID or a string project key.
	 */
	idOrKey: string;
}

/**
 * Options for listing Jira projects.
 * These options control filtering and pagination of project listings.
 */
export interface ListProjectsOptions extends PaginationOptions {
	/**
	 * Filter projects by query (project name or key).
	 * Performs a case-insensitive partial match on project name and key.
	 */
	query?: string;
}
