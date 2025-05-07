import { z } from 'zod';

/**
 * Base pagination arguments for comment operations
 */
const PaginationArgs = {
	limit: z
		.number()
		.min(1)
		.max(100)
		.optional()
		.describe(
			'Maximum number of comments to return (1-100). Default is 25.',
		),

	startAt: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe(
			'Index of the first comment to return (0-based offset). Used with limit for pagination.',
		),
};

/**
 * Arguments for listing comments on a Jira issue
 */
export const ListCommentsToolArgs = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe(
			'The ID or key of the Jira issue to get comments from (e.g., "PROJ-123" or "10001").',
		),
	...PaginationArgs,
	orderBy: z
		.string()
		.optional()
		.describe(
			'Field and direction to sort results by (e.g., "created ASC" or "updated DESC").',
		),
});
export type ListCommentsToolArgsType = z.infer<typeof ListCommentsToolArgs>;

/**
 * Arguments for adding a comment to a Jira issue
 */
export const AddCommentToolArgs = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe(
			'The ID or key of the Jira issue to add a comment to (e.g., "PROJ-123" or "10001").',
		),
	commentBody: z
		.string()
		.min(1)
		.describe(
			'The text content of the comment to add. Supports Markdown formatting including headings, lists, code blocks, tables, and other common markdown elements.',
		),
});
export type AddCommentToolArgsType = z.infer<typeof AddCommentToolArgs>;
