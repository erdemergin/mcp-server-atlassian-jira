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

	startAt: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe(
			'Index of the first item to return (0-based offset). Use this for pagination instead of cursor, as Jira uses offset-based pagination.',
		),
};

/**
 * Arguments for listing Jira projects
 * Includes optional filters with defaults applied in the controller
 */
const ListProjectsToolArgs = z.object({
	/**
	 * Filter by project name or key
	 */
	name: z
		.string()
		.optional()
		.describe(
			'Filter projects by name or key (case-insensitive). Use this to find specific projects by their display name or project key.',
		),

	/**
	 * Maximum number of projects to return and pagination
	 */
	...PaginationArgs,

	/**
	 * Field to sort the projects by
	 */
	orderBy: z
		.string()
		.optional()
		.describe(
			'Field to sort projects by (e.g., "name", "key", "lastIssueUpdatedTime"). Default is "lastIssueUpdatedTime", which shows the most recently active projects first.',
		),
});

type ListProjectsToolArgsType = z.infer<typeof ListProjectsToolArgs>;

/**
 * Arguments for getting a specific Jira project
 */
const GetProjectToolArgs = z.object({
	/**
	 * Project key or numeric ID
	 */
	projectKeyOrId: z
		.string()
		.describe(
			'The key or numeric ID of the Jira project to retrieve (e.g., "PROJ" or "10001"). This is required and must be a valid project key or ID from your Jira instance.',
		),
});

type GetProjectToolArgsType = z.infer<typeof GetProjectToolArgs>;

export {
	ListProjectsToolArgs,
	type ListProjectsToolArgsType,
	GetProjectToolArgs,
	type GetProjectToolArgsType,
};
