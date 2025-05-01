/**
 * Options for the Jira search controller.
 * Defines filtering and pagination parameters for JQL searches.
 */
export interface SearchOptions {
	/**
	 * Index of the first item to return (0-based offset).
	 */
	startAt?: number;

	/**
	 * Maximum number of items to return (1-100).
	 */
	limit?: number;

	/**
	 * The Jira Query Language (JQL) string to execute.
	 * Example: 'project = CM AND status = Done'
	 * If provided alongside specific filters (projectKeyOrId, statuses, etc.),
	 * the specific filters will be combined with this JQL using AND.
	 */
	jql?: string;

	/**
	 * Filter results by a specific project key or ID.
	 */
	projectKeyOrId?: string;

	/**
	 * Filter results to content tagged with specific status names.
	 */
	statuses?: string[];

	/**
	 * Order by field and direction (e.g., "priority DESC", "created ASC")
	 * Will be appended to JQL as "ORDER BY" clause if not already present
	 */
	orderBy?: string;

	/**
	 * Legacy pagination parameter for backwards compatibility.
	 * This should be used alongside startAt for Jira's offset-based pagination.
	 */
	cursor?: string;

	// Limit is already inherited from PaginationOptions
	// cursor should be ignored in favor of startAt for Jira
}
