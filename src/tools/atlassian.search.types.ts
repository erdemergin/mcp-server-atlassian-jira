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
 * Arguments for searching Jira content
 * Matches the controller's search function parameters
 */
const SearchToolArgs = z.object({
	jql: z
		.string()
		.optional()
		.describe(
			'Filter issues using Jira Query Language (JQL) syntax. Use this for complex queries like "project = TEAM AND status = \'In Progress\'" or "assignee = currentUser()". If omitted, returns issues according to your Jira default search.',
		),

	...PaginationArgs,
});

type SearchToolArgsType = z.infer<typeof SearchToolArgs>;

export { SearchToolArgs, type SearchToolArgsType };
