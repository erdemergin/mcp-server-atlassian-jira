import { z } from 'zod';

/**
 * Base pagination arguments for all tools
 */
const PaginationArgs = {
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
		),

	cursor: z
		.string()
		.optional()
		.describe(
			'Pagination cursor for retrieving the next set of results. Use this to navigate through large result sets. The cursor value can be obtained from the pagination information in a previous response.',
		),
};

/**
 * Arguments for listing Jira issues
 * Includes optional filters with defaults applied in the controller
 */
const ListIssuesToolArgs = z.object({
	/**
	 * Standardized query parameter for JQL filtering
	 */
	query: z
		.string()
		.optional()
		.describe(
			'Filter issues using JQL syntax. Use this for complex queries like "project = TEAM AND status = \'In Progress\'" or "assignee = currentUser()".',
		),

	/**
	 * Project key filter
	 */
	projectKey: z
		.string()
		.optional()
		.describe(
			'Filter issues by project key (e.g., "TEAM" or "PROJ"). Will be combined with other filters using AND logic.',
		),

	/**
	 * Status filter
	 */
	status: z
		.string()
		.optional()
		.describe(
			'Filter issues by status (e.g., "In Progress" or "Done"). Will be combined with other filters using AND logic.',
		),

	/**
	 * Maximum number of issues to return and pagination
	 */
	...PaginationArgs,
});

type ListIssuesToolArgsType = z.infer<typeof ListIssuesToolArgs>;

/**
 * Arguments for getting a specific Jira issue
 */
const GetIssueToolArgs = z.object({
	/**
	 * Standardized entity identifier parameter
	 */
	entityId: z
		.string()
		.describe(
			'The ID or key of the Jira issue to retrieve (e.g., "10001" or "PROJ-123"). This is required and must be a valid issue ID or key from your Jira instance.',
		),
});

type GetIssueToolArgsType = z.infer<typeof GetIssueToolArgs>;

export {
	ListIssuesToolArgs,
	type ListIssuesToolArgsType,
	GetIssueToolArgs,
	type GetIssueToolArgsType,
};
