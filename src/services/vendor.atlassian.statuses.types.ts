/**
 * Types for Atlassian Jira Statuses API
 */
import { z } from 'zod';

/**
 * Represents the status category information returned by Jira API.
 */
export interface JiraStatusCategory {
	self: string;
	id: number;
	key: string;
	colorName: string;
	name: string;
}

/**
 * Represents the detailed status information returned by Jira API.
 * This is the common structure returned by both /status and nested within /project/.../statuses.
 */
export interface JiraStatusDetail {
	self: string;
	description?: string;
	iconUrl?: string;
	name: string;
	id: string; // Status IDs are strings (numeric but represented as string)
	statusCategory: JiraStatusCategory;
}

/**
 * Represents the response structure from the project-specific status endpoint
 * GET /rest/api/3/project/{projectIdOrKey}/statuses
 * It returns statuses grouped by issue type.
 */
export interface JiraProjectStatusByIssueType {
	self?: string; // Optional as it might not always be present depending on context
	id: string; // Issue Type ID
	name: string; // Issue Type Name
	statuses: JiraStatusDetail[];
}

export type JiraProjectStatusesResponse = JiraProjectStatusByIssueType[];

/**
 * Represents the response structure from the global status endpoint
 * GET /rest/api/3/status
 */
export type JiraGlobalStatusesResponse = JiraStatusDetail[];

/**
 * Parameters for the status service functions.
 */
export interface ListStatusesParams {
	projectKeyOrId?: string;
	// Add pagination params if needed
}

/**
 * Zod schema for JiraStatusCategory
 */
const JiraStatusCategorySchema = z.object({
	self: z.string().url(),
	id: z.number(),
	key: z.string(),
	colorName: z.string(),
	name: z.string(),
});

/**
 * Zod schema for JiraStatusDetail
 */
const JiraStatusDetailSchema = z.object({
	self: z.string().url(),
	description: z.string().optional(),
	iconUrl: z.string().optional(),
	name: z.string(),
	id: z.string(), // Status IDs are strings (numeric but represented as string)
	statusCategory: JiraStatusCategorySchema,
});

/**
 * Zod schema for JiraProjectStatusByIssueType
 */
const JiraProjectStatusByIssueTypeSchema = z.object({
	self: z.string().url().optional(),
	id: z.string(),
	name: z.string(),
	statuses: z.array(JiraStatusDetailSchema),
});

/**
 * Zod schema for JiraProjectStatusesResponse
 */
const JiraProjectStatusesResponseSchema = z.array(
	JiraProjectStatusByIssueTypeSchema,
);

/**
 * Zod schema for JiraGlobalStatusesResponse
 */
const JiraGlobalStatusesResponseSchema = z.array(JiraStatusDetailSchema);

// Export schemas
export {
	JiraStatusCategorySchema,
	JiraStatusDetailSchema,
	JiraProjectStatusByIssueTypeSchema,
	JiraProjectStatusesResponseSchema,
	JiraGlobalStatusesResponseSchema,
};
