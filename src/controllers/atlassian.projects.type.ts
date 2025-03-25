import {
	ControllerResponse,
	PaginationOptions,
	EntityIdentifier,
} from './atlassian.type.js';

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

/**
 * Options for getting detailed project information.
 * These options control what additional data is included in the response.
 */
export interface GetProjectOptions {
	/**
	 * Whether to include components in the response.
	 * When true, retrieves the list of components defined in the project.
	 * Default: true
	 */
	includeComponents?: boolean;

	/**
	 * Whether to include versions in the response.
	 * When true, retrieves the list of versions defined in the project.
	 * Default: true
	 */
	includeVersions?: boolean;
}

// Re-export from base types for backward compatibility
export type { ControllerResponse };
