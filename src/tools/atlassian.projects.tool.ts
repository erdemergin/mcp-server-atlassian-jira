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
			orderBy: args.orderBy,
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
		`List Jira projects accessible to the authenticated user, with optional filtering by name/key and pagination.

        PURPOSE: Discover available projects and retrieve their keys, names, and basic metadata. Essential for finding the correct 'projectKeyOrId' needed as input for the 'get-project' tool or for filtering issues using JQL in the 'list-issues' tool (e.g., "project = KEY").

        WHEN TO USE:
        - To find the 'projectKeyOrId' for a known project name.
        - To explore all projects you have access to.
        - To get a high-level overview before diving into specific projects or issues.
        - When you don't know the exact key/ID required by other tools.

        WHEN NOT TO USE:
        - When you already have the 'projectKeyOrId' and need full details (use 'get-project').
        - When you need to list *issues* (use 'list-issues').

        RETURNS: Formatted list of projects including name, key, ID, type, style, lead, and URL. Includes pagination details if applicable (Jira uses offset-based pagination, so the 'cursor' represents the 'startAt' index).
        
        SORTING: By default, projects are sorted by 'lastIssueUpdatedTime', showing the most recently active projects first. This can be changed by providing a different value in the 'orderBy' parameter.

        EXAMPLES:
        - List all accessible projects (first page): {}
        - Filter by name/key fragment: { query: "platform" }
        - Paginate results (get next page starting from index 50): { limit: 50, cursor: "50" }
        - Sort by key: { orderBy: "key" }

        ERRORS:
        - Authentication failures: Check Jira credentials.
        - No projects found: You may not have access to any projects, or the query filter is too restrictive.`,
		ListProjectsToolArgs.shape,
		listProjects,
	);

	// Register the get project details tool
	server.tool(
		'get-project',
		`Get detailed information about a specific Jira project using its ID or key. Requires 'projectKeyOrId'.

        PURPOSE: Retrieves comprehensive metadata for a *known* project, including its full description, lead, components, versions, style, and links.

        WHEN TO USE:
        - When you need full details about a *specific* project and you know its key ('PROJ') or ID ('10001').
        - After using 'list-projects' to identify the target project key/ID.
        - To get project metadata, components, or versions before analyzing its issues.

        WHEN NOT TO USE:
        - When you don't know the project key or ID (use 'list-projects' first).
        - When you only need a list of projects (use 'list-projects').
        - When you need issue information (use issue tools).

        RETURNS: Detailed project information including key, name, description, lead, components, versions, and links. Fetches all available details (components, versions) by default.

        EXAMPLES:
        - Get project by Key: { projectKeyOrId: "DEV" }
        - Get project by ID: { projectKeyOrId: "10001" }

        ERRORS:
        - Project not found: Verify the 'projectKeyOrId' is correct and exists.
        - Permission errors: Ensure you have access to view the specified project.`,
		GetProjectToolArgs.shape,
		getProject,
	);

	logger.debug(
		`${logPrefix} Successfully registered Atlassian Projects tools`,
	);
}

export default { register };
