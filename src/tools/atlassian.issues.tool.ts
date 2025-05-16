import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListIssuesToolArgs,
	ListIssuesToolArgsType,
	GetIssueToolArgs,
	GetIssueToolArgsType,
} from './atlassian.issues.types.js';
import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.issues.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira issues tool module initialized');

/**
 * MCP Tool: List Jira Issues
 *
 * Lists Jira issues with optional filtering by JQL query, fields, and limit.
 * Returns a formatted markdown response with issue details and pagination info.
 *
 * @param {ListIssuesToolArgsType} args - Tool arguments for filtering issues
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }>, metadata: { pagination: { startAt: number, limit: number, total: number } } }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(args: ListIssuesToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'listIssues',
	);
	methodLogger.debug('Listing Jira issues with filters:', args);

	try {
		// Map tool args to controller options, using startAt and statuses
		const options: ListIssuesToolArgsType = {
			jql: args.jql,
			projectKeyOrId: args.projectKeyOrId,
			statuses: args.statuses,
			orderBy: args.orderBy,
			limit: args.limit,
			startAt: args.startAt,
		};

		methodLogger.debug('Calling controller with options:', options);

		const result = await atlassianIssuesController.list(options);

		methodLogger.debug('Successfully retrieved issues list', {
			count: result.pagination?.count,
			hasMore: result.pagination?.hasMore,
			total: result.pagination?.total,
		});

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
			metadata: {
				pagination: result.pagination,
			},
		};
	} catch (error) {
		methodLogger.error('Failed to list issues', error);
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
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(args: GetIssueToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'getIssue',
	);

	methodLogger.debug(
		`Retrieving issue details for ID/key: ${args.issueIdOrKey}`,
	);

	try {
		const result = await atlassianIssuesController.get({
			issueIdOrKey: args.issueIdOrKey,
		});
		methodLogger.debug(
			'Successfully retrieved issue details from controller',
		);

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
			metadata: {
				issueKey: args.issueIdOrKey,
			},
		};
	} catch (error) {
		methodLogger.error('Failed to get issue details', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Issues MCP Tools
 *
 * Registers the issue-related tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Issues tools...');

	// Register the list issues tool
	server.tool(
		'jira_ls_issues',
		`Searches for Jira issues using flexible filtering criteria. You can provide a full JQL query via \`jql\` for complex filtering, or use specific filters like \`projectKeyOrId\` and \`statuses\`. Sort results using \`orderBy\` (e.g., "priority DESC"). Supports pagination via \`limit\` and \`startAt\`. Returns a formatted list of matching issues including key, summary, type, status, priority, and project. Default sort is by last updated date. 
+**Important Note:** JQL functions relying on user context (like \`currentUser()\`) may not work reliably with API token authentication and could cause errors; use specific account IDs (e.g., \`assignee = 'accountid:...'\`) instead when using JQL.
**Note:** If \`jql\` is provided and already includes an ORDER BY clause, the \`orderBy\` parameter will be ignored. Requires Jira credentials to be configured.`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'jira_get_issue',
		`Retrieves comprehensive details for a specific Jira issue identified by \`issueIdOrKey\`. Returns the issue's description, status, priority, assignee, reporter, comments, attachments, and linked issues as formatted Markdown. Also includes linked development information (commits, branches, PRs) when available. Use this after finding an issue key to get its complete context. Requires Jira credentials to be configured.`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	methodLogger.debug('Successfully registered Atlassian Issues tools');
}

export default { registerTools };
