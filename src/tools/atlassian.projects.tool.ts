import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListProjectsToolArgs,
	ListProjectsToolArgsType,
	GetProjectToolArgs,
	GetProjectToolArgsType,
} from './atlassian.projects.types.js';

import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.projects.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira projects tool module initialized');

/**
 * MCP Tool: List Jira Projects
 *
 * Lists Jira projects with optional filtering.
 * Returns a formatted markdown response with project details and pagination info.
 *
 * @param {ListProjectsToolArgsType} args - Tool arguments for filtering projects
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted projects list
 * @throws Will return error message if project listing fails
 */
async function listProjects(args: ListProjectsToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.projects.tool.ts',
		'listProjects',
	);
	methodLogger.debug('Listing Jira projects with filters:', args);

	try {
		// Pass the options to the controller
		const message = await atlassianProjectsController.list({
			name: args.name,
			limit: args.limit,
			cursor: args.cursor,
			orderBy: args.orderBy,
		});

		methodLogger.debug('Successfully retrieved projects from controller');

		return {
			content: [
				{
					type: 'text' as const,
					text: message.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list projects', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Get Jira Project Details
 *
 * Retrieves detailed information about a specific Jira project.
 * Returns a formatted markdown response with project data.
 *
 * @param {GetProjectToolArgsType} args - Tool arguments containing the project ID/key
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted project details
 * @throws Will return error message if project retrieval fails
 */
async function getProject(args: GetProjectToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.projects.tool.ts',
		'getProject',
	);

	methodLogger.debug(
		`Retrieving project details for key/ID: ${args.projectKeyOrId}`,
	);

	try {
		const message = await atlassianProjectsController.get({
			projectKeyOrId: args.projectKeyOrId,
		});
		methodLogger.debug(
			'Successfully retrieved project details from controller',
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
		methodLogger.error('Failed to get project details', error);
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
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.projects.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Projects tools...');

	// Register the list projects tool
	server.tool(
		'jira_list_projects',
		`Lists Jira projects accessible to the user, optionally filtering by name/key (\`name\`) or sorting (\`orderBy\`).\n- Use this to discover available projects and find project keys/IDs needed for other tools (like \`jira_get_project\` or \`jira_list_issues\`).\n- Supports pagination via \`limit\` and \`cursor\`.\nReturns a formatted list of projects including key, name, type, style, lead, and URL.\n**Note:** Default sort is by most recently updated issue time.`,
		ListProjectsToolArgs.shape,
		listProjects,
	);

	// Register the get project details tool
	server.tool(
		'jira_get_project',
		`Retrieves comprehensive details for a specific Jira project using its key or ID (\`projectKeyOrId\`).\n- Includes description, lead, components, versions, and other metadata.\nUse this after finding a project key/ID via \`jira_list_projects\` to get its full details.\nReturns detailed project information formatted as Markdown.`,
		GetProjectToolArgs.shape,
		getProject,
	);

	methodLogger.debug('Successfully registered Atlassian Projects tools');
}

export default { registerTools };
