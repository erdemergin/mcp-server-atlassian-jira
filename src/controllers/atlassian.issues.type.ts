import {
	PaginationOptions,
	ControllerResponse,
	EntityIdentifier,
} from '../types/common.types.js';

/**
 * Issue identifier for retrieving specific issues
 */
export interface IssueIdentifier extends EntityIdentifier {
	/**
	 * The ID or key of the issue to retrieve
	 */
	idOrKey: string;
}

/**
 * Options for listing Jira issues
 */
export interface ListIssuesOptions extends PaginationOptions {
	/**
	 * JQL query string to filter issues
	 */
	jql?: string;
}

/**
 * Options for getting issue details
 *
 * Note: This interface is intentionally kept minimal as all necessary fields
 * are now hardcoded in the controller for consistent results across all requests.
 * The empty interface is maintained for backward compatibility and future extensibility.
 */
export type GetIssueOptions = Record<string, unknown>;

// Re-export ControllerResponse for backward compatibility
export { ControllerResponse };

// For backward compatibility
export type SearchIssuesOptions = ListIssuesOptions;
