import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.util.js';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListProjectsToolArgs,
	ListProjectsToolArgsType,
	GetProjectToolArgs,
	GetProjectToolArgsType,
} from './atlassian.projects.types.js';

import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';

/**
 * MCP Tool: List Jira Projects
 *
 * Lists Jira projects with optional filtering by query and limit.
 * Returns a formatted markdown response with project details and pagination info.
 *
 * @param {ListProjectsToolArgsType} args - Tool arguments for filtering projects
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted projects list
 * @throws Will return error message if project listing fails
 */
async function listProjects(
	args: ListProjectsToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@listProjects]';
	logger.debug(`${logPrefix} Listing Jira projects with filters:`, args);

	try {
		// Pass the filter options to the controller
		const message = await atlassianProjectsController.list({
			query: args.query,
			limit: args.limit,
			cursor: args.cursor,
		});

		logger.debug(
			`${logPrefix} Successfully retrieved projects from controller`,
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
		logger.error(`${logPrefix} Failed to list projects`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Project Details
 *
 * Retrieves detailed information about a specific Jira project.
 * Returns a formatted markdown response with project metadata, components, and versions.
 *
 * @param {GetProjectToolArgsType} args - Tool arguments containing the project ID or key
 * @param {RequestHandlerExtra} _extra - Extra request handler information (unused)
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted project details
 * @throws Will return error message if project retrieval fails
 */
async function getProject(
	args: GetProjectToolArgsType,
	_extra: RequestHandlerExtra,
) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@getProject]';

	logger.debug(
		`${logPrefix} Retrieving project details for ID/key: ${args.entityId}`,
	);

	try {
		const message = await atlassianProjectsController.get({
			idOrKey: args.entityId,
		});
		logger.debug(
			`${logPrefix} Successfully retrieved project details from controller`,
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
		logger.error(`${logPrefix} Failed to get project details`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Projects MCP Tools
 *
 * Registers the list-projects and get-project tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function register(server: McpServer) {
	const logPrefix = '[src/tools/atlassian.projects.tool.ts@register]';
	logger.debug(`${logPrefix} Registering Atlassian Projects tools...`);

	// Register the list projects tool
	server.tool(
		'list-projects',
		`List Jira projects with optional filtering capabilities.

PURPOSE: Provides key information such as project IDs, keys, names, and URLs to help you understand available projects.

WHEN TO USE:
- Discover what projects exist in a Jira instance
- Find a specific project by name or key
- Browse available projects before diving into specific issues
- Get project IDs or keys for use with other Jira tools

WHEN NOT TO USE:
- When you already know the specific project ID/key (use get-project instead)
- When you need detailed project information (use get-project instead)
- When you need to browse issues rather than projects (use list-issues instead)

RETURNS: Formatted list of projects with IDs, keys, names, types, and URLs, plus pagination info.

EXAMPLES:
- Basic usage: {query: "Marketing"}
- With pagination: {limit: 10, cursor: "10"}

ERRORS:
- Authentication failures: Check credentials
- No results: Try broadening your query
- Rate limiting: Use more specific queries, reduce frequency`,
		ListProjectsToolArgs.shape,
		listProjects,
	);

	// Register the get project details tool
	server.tool(
		'get-project',
		`Get detailed information about a specific Jira project by ID or key.

PURPOSE: Retrieves comprehensive metadata including components, versions, categories, and access URLs.

WHEN TO USE:
- When you need detailed information about a specific project
- When you need to list components or versions within a project
- When you need to verify project configuration or metadata
- After using list-projects to discover available projects

WHEN NOT TO USE:
- When you don't know which project to look for (use list-projects first)
- When you need to browse multiple projects (use list-projects instead)
- When you need to find issues within a project (use list-issues instead)

RETURNS: Detailed project information including name, key, ID, type, components, versions, and description.

EXAMPLES:
- By key: {entityId: "DEV"}
- By ID: {entityId: "10001"}

ERRORS:
- Project not found: Verify the project ID or key
- Permission errors: Ensure you have access to the requested project`,
		GetProjectToolArgs.shape,
		getProject,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Projects tools`,
	);
}

export default { register };
