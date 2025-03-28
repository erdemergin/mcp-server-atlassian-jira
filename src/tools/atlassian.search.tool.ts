import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	SearchToolArgsType,
	SearchToolArgs,
} from './atlassian.search.types.js';

import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';

/**
 * MCP Tool: Search Jira
 *
 * Searches Jira content using JQL (Jira Query Language).
 * Returns a formatted markdown response with search results.
 *
 * @param {SearchToolArgsType} args - Tool arguments for the search query
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted search results
 * @throws Will return error message if search fails
 */
async function search(args: SearchToolArgsType, _extra: RequestHandlerExtra) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'search',
	);
	toolLogger.debug('Searching Jira with JQL:', args);

	try {
		// Pass the search options to the issues controller
		// The list method already implements JQL search
		const message = await atlassianIssuesController.list({
			jql: args.jql,
			limit: args.limit,
			cursor: args.cursor,
		});

		toolLogger.debug(
			'Successfully retrieved search results from controller',
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
		toolLogger.error('Failed to search Jira', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Search MCP Tools
 *
 * Registers the search tool with the MCP server.
 * The tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'register',
	);
	toolLogger.debug('Registering Atlassian Search tools...');

	// Register the search tool
	server.tool(
		'search',
		`Search Jira content using JQL (Jira Query Language) for precise results.

        PURPOSE: Performs advanced content searches across Jira using JQL queries, allowing for complex search patterns, issue filtering, and targeted results. This is the most powerful search tool for Jira, supporting complex filtering and sorting.

        WHEN TO USE:
        - When you need to search for specific issues across projects or find issues matching complex criteria.
        - When you need to combine multiple search criteria (e.g., project + status + assignee + text).
        - When you need to search using complex logical operators (AND, OR, NOT).
        - When you need to search across all issues with custom fields, dates, or specific values.
        - When you need fine-grained sorting control over search results.

        WHEN NOT TO USE:
        - When you already know the issue key/ID (use 'get_issue' instead).
        - When you only need to list issues from a specific project with simple filtering (use 'list_issues').
        - When you need project information rather than issues (use project-related tools).

        RETURNS: Formatted search results including:
        - Issue key, summary, type, and status
        - Project, priority, assignee, and reporter information
        - Creation and update dates
        - Links to view issues in the browser
        
        Results can be paginated using the 'limit' and 'cursor' parameters.

        JQL EXAMPLES:
        - Basic text search: { jql: "text ~ 'login issue'" }
        - Combined criteria: { jql: "project = PROJ AND status = 'In Progress' AND assignee = currentUser()" }
        - Date filtering: { jql: "created >= '2023-01-01' AND created <= '2023-12-31'" }
        - Issues by specific user: { jql: "reporter = jsmith" }
        - High priority bugs: { jql: "type = Bug AND priority = High" }
        
        Common JQL fields:
        - text: Full-text content search
        - summary: Issue summary search
        - description: Issue description search
        - project: Project key
        - type: Issue type (Bug, Task, Story, etc.)
        - status: Issue status
        - assignee/reporter: User references
        - created/updated: Date criteria
        - priority: Issue priority
        - resolution: Issue resolution status

        ERRORS:
        - Invalid JQL syntax: Check query format against JQL documentation.
        - No results: Try broadening search criteria.
        - Authentication/permission failures: Ensure proper credentials.
        - Rate limiting: For large result sets, use pagination.`,
		SearchToolArgs.shape,
		search,
	);

	toolLogger.debug('Successfully registered Atlassian Search tools');
}

export default { register };
