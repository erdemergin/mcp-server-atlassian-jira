import { PaginationOptions, EntityIdentifier } from '../types/common.types.js';

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
 */
export type GetIssueOptions = Record<string, unknown>;
