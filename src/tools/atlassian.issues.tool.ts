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
		// Build JQL from args
		let jql = '';
		if (args.projectKey) {
			jql += `project = "${args.projectKey}"`;
		}
		if (args.status) {
			jql += (jql ? ' AND ' : '') + `status = "${args.status}"`;
		}
		if (args.query) {
			jql += (jql ? ' AND ' : '') + `(${args.query})`;
		}

		// Pass the options to the controller
		const message = await atlassianIssuesController.list({
			...(jql && { jql }),
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
 * Returns a formatted markdown response with issue data.
 *
 * @param {GetIssueToolArgsType} args - Tool arguments containing the issue ID/key
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(
	args: GetIssueToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.issues.tool.ts@getIssue]';

	logger.debug(
		`${logPrefix} Retrieving issue details for ID/key: ${args.issueIdOrKey}`,
	);

	try {
		const message = await atlassianIssuesController.get({
			idOrKey: args.issueIdOrKey,
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
		`List Jira issues with powerful filtering capabilities using JQL.

PURPOSE: Helps you find and explore issues across projects or within a specific project, with comprehensive filtering options.

WHEN TO USE:
- When you need to find issues matching specific criteria
- When you need to browse issues in a project
- When you need issue keys for use with other Jira tools
- When you need to build complex queries with JQL
- When you need to filter by project, status, assignee, etc.

WHEN NOT TO USE:
- When you already know the specific issue key (use get-issue instead)
- When you need detailed information about a single issue (use get-issue instead)
- When you need to list projects rather than issues (use list-projects instead)
- When you need extremely complex queries (consider using the Jira UI)

RETURNS: Formatted list of issues with keys, summaries, types, statuses, assignees, and URLs.

EXAMPLES:
- All issues: {}
- Project issues: {projectKey: "TEAM"}
- With status: {projectKey: "TEAM", status: "In Progress"}
- JQL query: {query: "assignee = currentUser() AND status = 'To Do'"}
- With pagination: {limit: 10, cursor: "next-page-token"}

ERRORS:
- Invalid JQL: Check syntax of your query
- Authentication failures: Verify your Jira credentials
- No results: Try broadening your filters
- Rate limiting: Use more specific queries, include pagination`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'get-issue',
		`Get detailed information about a specific Jira issue by ID or key.

PURPOSE: Retrieves comprehensive issue information including description, comments, attachments, and workflow details.

WHEN TO USE:
- When you need detailed information about a specific issue
- When you need to check issue status, comments, or history
- When you need to find linked issues or attachments
- After using list-issues to identify the issue key you're interested in
- When you need full information about an issue's fields and metadata

WHEN NOT TO USE:
- When you don't know which issue to look for (use list-issues first)
- When you need to browse multiple issues (use list-issues instead)
- When you need project information rather than issue details (use get-project instead)

RETURNS: Detailed issue information including summary, description, status, assignee, reporter, comments, and attachments.

EXAMPLES:
- By key: {issueIdOrKey: "TEAM-123"}
- By ID: {issueIdOrKey: "10001"}

ERRORS:
- Issue not found: Verify the issue key or ID is correct
- Permission errors: Ensure you have access to the requested issue
- Rate limiting: Cache issue information when possible for frequently referenced issues`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	logger.debug(`${logPrefix} Successfully registered Atlassian Issues tools`);
}

export default { register };
