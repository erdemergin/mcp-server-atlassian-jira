import { z } from 'zod';

/**
 * Schema for listing worklogs for an issue
 */
export const ListWorklogsToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe('The ID or key of the issue (e.g., "PROJ-123" or "10001")'),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(25)
		.describe('Maximum number of worklogs to return (1-100)'),
	startAt: z
		.number()
		.int()
		.min(0)
		.optional()
		.default(0)
		.describe('The index of the first worklog to return (0-based)'),
	expand: z
		.array(z.string())
		.optional()
		.describe(
			'Use expand to include additional information in the response',
		),
});

export type ListWorklogsToolArgsType = z.infer<
	typeof ListWorklogsToolArgsSchema
>;

/**
 * Schema for adding a worklog to an issue
 */
export const AddWorklogToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe('The ID or key of the issue (e.g., "PROJ-123" or "10001")'),
	timeSpent: z
		.string()
		.min(1)
		.describe(
			'Time spent working in Jira duration format (e.g., "2h 30m", "1d", "45m")',
		),
	comment: z
		.string()
		.optional()
		.describe('Worklog comment/description in Markdown format'),
	started: z
		.string()
		.describe(
			'When the work was started in ISO 8601 format (e.g., "2024-01-22T10:00:00.000+0000")',
		),
	adjustEstimate: z
		.enum(['new', 'leave', 'manual', 'auto'])
		.optional()
		.describe(
			"How to adjust the remaining estimate: new (set new estimate), leave (don't change), manual (reduce by amount), auto (reduce by time spent)",
		),
	newEstimate: z
		.string()
		.optional()
		.describe(
			'The new estimate when adjustEstimate is "new" (e.g., "3d 4h")',
		),
	reduceBy: z
		.string()
		.optional()
		.describe(
			'Amount to reduce remaining estimate when adjustEstimate is "manual" (e.g., "2h")',
		),
});

export type AddWorklogToolArgsType = z.infer<typeof AddWorklogToolArgsSchema>;

/**
 * Schema for updating an existing worklog
 */
export const UpdateWorklogToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe('The ID or key of the issue (e.g., "PROJ-123" or "10001")'),
	worklogId: z.string().min(1).describe('The ID of the worklog to update'),
	timeSpent: z
		.string()
		.optional()
		.describe(
			'New time spent value in Jira duration format (e.g., "3h 15m")',
		),
	comment: z
		.string()
		.optional()
		.describe('New worklog comment/description in Markdown format'),
	started: z
		.string()
		.optional()
		.describe(
			'New start time in ISO 8601 format (e.g., "2024-01-22T10:00:00.000+0000")',
		),
});

export type UpdateWorklogToolArgsType = z.infer<
	typeof UpdateWorklogToolArgsSchema
>;

/**
 * Schema for deleting a worklog
 */
export const DeleteWorklogToolArgsSchema = z.object({
	issueIdOrKey: z
		.string()
		.min(1)
		.describe('The ID or key of the issue (e.g., "PROJ-123" or "10001")'),
	worklogId: z.string().min(1).describe('The ID of the worklog to delete'),
	adjustEstimate: z
		.enum(['new', 'leave', 'manual', 'auto'])
		.optional()
		.describe(
			"How to adjust the remaining estimate: new (set new estimate), leave (don't change), manual (increase by amount), auto (increase by time that was logged)",
		),
	newEstimate: z
		.string()
		.optional()
		.describe('The new estimate when adjustEstimate is "new" (e.g., "5d")'),
	increaseBy: z
		.string()
		.optional()
		.describe(
			'Amount to increase remaining estimate when adjustEstimate is "manual" (e.g., "3h")',
		),
});

export type DeleteWorklogToolArgsType = z.infer<
	typeof DeleteWorklogToolArgsSchema
>;
