import { z } from 'zod';

/**
 * Zod schema definition for the jira_ls_statuses tool arguments.
 */
export const ListStatusesToolArgs = z.object({
	projectKeyOrId: z
		.string()
		.optional()
		.describe(
			'Optional project key or ID (e.g. "PROJ" or "10001") to filter statuses relevant to that project workflows.',
		),
	// Pagination args can be added here if needed
});

/**
 * Type inferred from the ListStatusesToolArgs Zod schema.
 */
export type ListStatusesToolArgsType = z.infer<typeof ListStatusesToolArgs>;
