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
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(args: ListIssuesToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'listIssues',
	);
	methodLogger.debug('Listing Jira issues with filters:', args);

	try {
		// Pass the options to the controller
		const message = await atlassianIssuesController.list({
			jql: args.jql,
			limit: args.limit,
			cursor: args.cursor,
		});

		methodLogger.debug('Successfully retrieved issues from controller');

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
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
		const message = await atlassianIssuesController.get({
			issueIdOrKey: args.issueIdOrKey,
		});
		methodLogger.debug(
			'Successfully retrieved issue details from controller',
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
		methodLogger.error('Failed to get issue details', error);
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
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Issues tools...');

	// Register the list issues tool
	server.tool(
		'jira_ls_issues',
		`Searches for Jira issues using a JQL query (\`jql\`),\n\twith pagination support (\`limit\`, \`cursor\`).\n\n- Use this to find issues matching specific criteria (project, status, assignee, text, etc.).\n- Provides issue keys/IDs needed for \`jira_get_issue\`.\nReturns a formatted list of matching issues including key, summary, type, status, priority, project, and dates.\n**Note:** Requires valid JQL syntax. See Jira documentation for JQL details. Default sort is by last updated.`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'jira_get_issue',
		`Retrieves comprehensive details for a specific Jira issue using its key or ID (\`issueIdOrKey\`).\n- Includes full description (Markdown), status, priority, assignee, reporter, comments (Markdown), attachments, and linked issues.\n- Also fetches linked development information (commits, branches, PRs) if available.\nUse this after finding an issue key/ID to get its complete context.\nReturns detailed issue information formatted as Markdown.`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	methodLogger.debug('Successfully registered Atlassian Issues tools');
}

export default { registerTools };
