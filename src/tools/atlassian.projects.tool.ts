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
 * Returns a formatted markdown response with project metadata.
 *
 * @param {GetProjectToolArgsType} args - Tool arguments containing the project ID/key
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
		`${logPrefix} Retrieving project details for ID/key: ${args.projectKeyOrId}`,
	);

	try {
		const message = await atlassianProjectsController.get({
			idOrKey: args.projectKeyOrId,
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
		`List Jira projects with optional filtering by name or key.

PURPOSE: Helps you discover available projects in your Jira instance with their keys, names, and metadata.

WHEN TO USE:
- When you need to find available projects for issue exploration
- When you need project keys for use with other Jira tools
- When you want to browse projects before accessing specific issues
- When you need to filter projects by name or key
- When you need to find recently updated projects

WHEN NOT TO USE:
- When you already know the specific project key (use get-project instead)
- When you need detailed information about a single project (use get-project instead)
- When looking for issues rather than projects (use list-issues instead)
- When you need to search issues across projects (use list-issues with JQL instead)

RETURNS: Formatted list of projects with keys, names, types, categories, and lead information.

EXAMPLES:
- List all projects: {}
- Filter by keyword: {query: "team"}
- With pagination: {limit: 10, cursor: "next-page-token"}

ERRORS:
- Authentication failures: Check your Jira credentials
- No projects found: You may not have permission to view any projects
- Rate limiting: Use pagination and reduce query frequency`,
		ListProjectsToolArgs.shape,
		listProjects,
	);

	// Register the get project details tool
	server.tool(
		'get-project',
		`Get detailed information about a specific Jira project by ID or key.

PURPOSE: Retrieves comprehensive project information including components, versions, leads, and issue types.

WHEN TO USE:
- When you need detailed information about a specific project
- When you need to verify project existence or accessibility
- When you need to find available components or versions
- After using list-projects to identify the project key you're interested in
- When you need information about project issue types or workflows

WHEN NOT TO USE:
- When you don't know which project to look for (use list-projects first)
- When you need to list issues within a project (use list-issues instead)
- When you need to search issues with complex criteria (use list-issues with JQL instead)

RETURNS: Detailed project information including key, name, description, components, versions, lead, and other metadata.

EXAMPLES:
- By key: {projectKeyOrId: "TEAM"}
- By ID: {projectKeyOrId: "10001"}

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
