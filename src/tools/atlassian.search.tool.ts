import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	SearchToolArgsType,
	SearchToolArgs,
} from './atlassian.search.types.js';

import atlassianSearchController from '../controllers/atlassian.search.controller.js';

/**
 * MCP Tool: Search Jira
 *
 * Searches Jira content using JQL (Jira Query Language).
 * Returns a formatted markdown response with search results.
 *
 * @param {SearchToolArgsType} args - Tool arguments for the search query
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted search results
 * @throws Will return error message if search fails
 */
async function search(args: SearchToolArgsType) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'search',
	);
	toolLogger.debug('Searching Jira with JQL:', args);

	try {
		// Pass the search options to the search controller
		const message = await atlassianSearchController.search({
			jql: args.jql,
			limit: args.limit,
			cursor: args.cursor,
		});

		toolLogger.debug('Search completed successfully');

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
function registerTools(server: McpServer) {
	const toolLogger = Logger.forContext(
		'tools/atlassian.search.tool.ts',
		'registerTools',
	);
	toolLogger.debug('Registering Atlassian Search tools');

	// Register the search tool
	server.tool(
		'jira_search_issues',
		`Searches for Jira issues using a JQL query (\`jql\`), with pagination support (\`limit\`, \`cursor\`).\n\n- Provides advanced search capabilities across projects using complex JQL.\n- Useful for combining multiple criteria or searching text content.\nReturns a formatted list of matching issues including key, summary, type, status, project, and dates.\n**Note:** Requires valid JQL syntax. See Jira documentation for JQL details.`,
		SearchToolArgs.shape,
		search,
	);

	toolLogger.debug('Successfully registered Atlassian Search tools');
}

export default { registerTools };
