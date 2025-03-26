import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListIssuesToolArgs,
	ListIssuesToolArgsType,
	GetIssueToolArgs,
	GetIssueToolArgsType,
} from './atlassian.issues.types.js';

import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';

/**
 * MCP Tool: List Jira Issues
 *
 * Lists Jira issues with optional filtering by JQL query, fields, and limit.
 * Returns a formatted markdown response with issue details and pagination info.
 *
 * @param {ListIssuesToolArgsType} args - Tool arguments for filtering issues
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(
	args: ListIssuesToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@listIssues]';
	logger.debug(`${logPrefix} Listing Jira issues with filters:`, args);

	try {
		// Handle both new standardized parameters and legacy parameters
		const jqlQuery = args.filter || args.jql;

		// Pass the filter options to the controller
		const message = await atlassianIssuesController.list({
			jql: jqlQuery,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved issues from controller`,
			message,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		logger.error(`${logPrefix} Failed to list issues`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Issue Details
 *
 * Retrieves detailed information about a specific Jira issue.
 * Returns a formatted markdown response with issue metadata, description, comments, etc.
 *
 * @param {GetIssueToolArgsType} args - Tool arguments containing the issue ID or key
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(
	args: GetIssueToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@getIssue]';

	// Handle both new standardized parameters and legacy parameters
	const issueIdOrKey = args.entityId || args.idOrKey;

	logger.debug(
		`${logPrefix} Retrieving issue details for ID/key: ${issueIdOrKey}`,
	);

	try {
		const message = await atlassianIssuesController.get({
			idOrKey: issueIdOrKey,
		});
		logger.debug(
			`${logPrefix} Successfully retrieved issue details from controller`,
			message,
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		logger.error(`${logPrefix} Failed to get issue details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Issues MCP Tools
 *
 * Registers the list-issues and get-issue tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Issues tools...`);

	// Register the list issues tool
	server.tool(
		'list-issues',
		`List Jira issues with optional filtering using JQL queries.

PURPOSE: Finds issues across projects with their keys, summaries, statuses, and assignees to help you understand available tasks.

WHEN TO USE:
- Discover issues that match specific criteria (status, assignee, etc.)
- Find issues within a specific project
- Browse available issues before accessing specific details
- Get issue keys for use with other tools
- Track status of multiple issues at once

WHEN NOT TO USE:
- When you already know the specific issue key (use get-issue instead)
- When you need detailed issue content or comments (use get-issue instead)
- When you need to find projects rather than issues (use list-projects instead)

RETURNS: Formatted list of issues with keys, types, summaries, statuses, assignees, and URLs, plus pagination info.

EXAMPLES:
- Basic project filter: {filter: "project = DEV"} or {jql: "project = DEV"}
- Status filter: {filter: "status = 'In Progress'"}
- Combined filters: {filter: "project = DEV AND assignee = currentUser()"}
- With pagination: {filter: "project = DEV", limit: 10, cursor: "10"}

ERRORS:
- Invalid JQL: Check JQL syntax
- Authentication failures: Check credentials
- No results: Try broadening your query`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'get-issue',
		`Get detailed information about a specific Jira issue by ID or key.

PURPOSE: Retrieves comprehensive issue data including description, comments, attachments, and history.

WHEN TO USE:
- When you need the full description and context of an issue
- When you need to see comments, attachments, or custom fields
- When you need detailed status, assignee, reporter information
- After using list-issues to identify the relevant issue key

WHEN NOT TO USE:
- When you don't know which issue to look for (use list-issues first)
- When you need to browse multiple issues (use list-issues instead)
- When you only need basic issue information (use list-issues if querying multiple)

RETURNS: Detailed issue information including key, summary, description, status, assignee, reporter, comments, and relevant dates.

EXAMPLES:
- By key: {entityId: "DEV-123"} or {idOrKey: "DEV-123"}
- By ID: {entityId: "10001"} or {idOrKey: "10001"}

ERRORS:
- Issue not found: Verify the issue key or ID
- Permission errors: Ensure you have access to the requested issue
- Rate limiting: Cache issue information when possible`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	logger.debug(`${logPrefix} Successfully registered Atlassian Issues tools`);
}

export default { register };
