import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
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
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issues list
 * @throws Will return error message if issue listing fails
 */
async function listIssues(
	args: ListIssuesToolArgsType,
	_extra: RequestHandlerExtra,
) {
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
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted issue details
 * @throws Will return error message if issue retrieval fails
 */
async function getIssue(
	args: GetIssueToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'getIssue',
	);

	methodLogger.debug(
		`Retrieving issue details for ID/key: ${args.issueIdOrKey}`,
	);

	try {
		const message = await atlassianIssuesController.get({
			idOrKey: args.issueIdOrKey,
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
function register(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.issues.tool.ts',
		'register',
	);
	methodLogger.debug('Registering Atlassian Issues tools...');

	// Register the list issues tool
	server.tool(
		'list-issues',
		`Search for Jira issues using JQL (Jira Query Language), with pagination.

        PURPOSE: Find and explore issues across one or more projects using the powerful JQL syntax. Essential for locating specific issues or groups of issues based on criteria like project, status, assignee, text content, labels, dates, etc. Provides issue keys/IDs needed for the 'get-issue' tool.

        WHEN TO USE:
        - To find issues matching specific criteria (status, assignee, project, keywords, labels, priority, dates).
        - To get an overview of issues in a project or filter.
        - To find issue keys/IDs for use with the 'get-issue' tool.
        - Requires formulating a valid JQL query (refer to Jira JQL documentation if unsure).

        WHEN NOT TO USE:
        - When you already know the specific issue key/ID (use 'get-issue').
        - When you only need project information (use 'list-projects' or 'get-project').
        - If the search is very broad (might hit limits or be slow; refine JQL).

        RETURNS: Formatted list of issues matching the JQL query, including key, summary, type, status, priority, project, assignee, reporter, creation/update dates, and URL. Includes pagination details if applicable (Jira uses offset-based pagination, so the 'cursor' represents the 'startAt' index).
        
        SORTING: By default, issues are sorted by updated date in descending order (most recently updated first). This behavior can be overridden by including an explicit ORDER BY clause in your JQL query.

        EXAMPLES:
        - Find open issues in project TEAM: { jql: "project = TEAM AND status = Open" }
        - Find issues assigned to me: { jql: "assignee = currentUser() AND resolution = Unresolved" }
        - Find high priority bugs updated recently: { jql: "type = Bug AND priority = High AND updated >= -7d" }
        - Paginate results (get page 3, assuming limit 25): { jql: "project = TEAM", limit: 25, cursor: "50" }
        - Simple issue retrieval with default sorting: { }  # Returns all accessible issues, sorted by most recently updated first

        ERRORS:
        - Invalid JQL: Check the syntax of your JQL query. Ensure field names and values are correct.
        - Authentication failures: Verify Jira credentials.
        - No results: The JQL query returned no matching issues, or you lack permission to view them.`,
		ListIssuesToolArgs.shape,
		listIssues,
	);

	// Register the get issue details tool
	server.tool(
		'get-issue',
		`Get detailed information about a specific Jira issue using its ID or key. Requires 'issueIdOrKey'.

        PURPOSE: Retrieves comprehensive details for a *known* issue, including its summary, description (in Markdown), status, priority, assignee, reporter, comments, attachments, linked issues, worklogs, and all standard fields.

        WHEN TO USE:
        - When you need the full content, comments, or metadata of a *specific* issue.
        - After using 'list-issues' to identify the target issue key/ID.
        - To get all context associated with an issue for analysis or summarization.
        - Requires a known 'issueIdOrKey' (e.g., "PROJ-123" or "10001").

        WHEN NOT TO USE:
        - When you don't know the issue key/ID (use 'list-issues' with JQL first).
        - When you only need a list of issues (use 'list-issues').
        - When you need project-level information (use project tools).

        RETURNS: Detailed issue information including key, summary, description (converted to Markdown), status, priority, assignee, reporter, dates, time tracking, attachments, comments (converted to Markdown), linked issues, and worklogs. Fetches all available standard details by default.

        EXAMPLES:
        - Get issue by Key: { issueIdOrKey: "PROJ-123" }
        - Get issue by ID: { issueIdOrKey: "10001" }

        ERRORS:
        - Issue not found: Verify the 'issueIdOrKey' is correct and exists.
        - Permission errors: Ensure you have access to view the specified issue.`,
		GetIssueToolArgs.shape,
		getIssue,
	);

	methodLogger.debug('Successfully registered Atlassian Issues tools');
}

export default { register };
