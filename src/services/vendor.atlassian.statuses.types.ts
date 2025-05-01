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
