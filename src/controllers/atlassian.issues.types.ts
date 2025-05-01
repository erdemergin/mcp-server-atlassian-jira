import { EntityIdentifier } from '../types/common.types.js';

/**
 * Issue identifier for retrieving specific issues
 */
export interface IssueIdentifier extends EntityIdentifier {
	/**
	 * The ID or key of the issue to retrieve (e.g., "PROJ-123" or "10001")
	 */
	issueIdOrKey: string;
}

/**
 * Options for listing Jira issues
 */
export interface ListIssuesOptions {
	/**
	 * Index of the first item to return (0-based offset).
	 */
	startAt?: number;

	/**
	 * Maximum number of items to return (1-100).
	 */
	limit?: number;

	/**
	 * JQL query string to filter issues
	 */
	jql?: string;

	/**
	 * Project key or ID to filter issues by project
	 */
	projectKeyOrId?: string;

	/**
	 * Status names to filter issues by status
	 * For multiple statuses, will construct "status IN (...)" JQL clause
	 */
	statuses?: string[];

	/**
	 * Order by field and direction (e.g., "priority DESC", "created ASC")
	 * Will be appended to JQL as "ORDER BY" clause if not already present
	 */
	orderBy?: string;
}

/**
 * Options for getting issue details
 */
export type GetIssueOptions = Record<string, unknown>;
