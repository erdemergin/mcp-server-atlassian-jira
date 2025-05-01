import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListStatusesToolArgs,
	ListStatusesToolArgsType,
} from './atlassian.statuses.types.js';
import atlassianStatusesController from '../controllers/atlassian.statuses.controller.js';

const toolLogger = Logger.forContext('tools/atlassian.statuses.tool.ts');
toolLogger.debug('Jira statuses tool module initialized');

/**
 * Handler for jira_ls_statuses tool.
 * Lists available Jira statuses, optionally filtering by project.
 *
 * @param {ListStatusesToolArgsType} args - Tool arguments with optional projectKeyOrId
 * @returns {Promise<object>} MCP response object with formatted Markdown
 */
async function handleListStatuses(args: ListStatusesToolArgsType) {
	const methodLogger = toolLogger.forMethod('handleListStatuses');
	methodLogger.debug('Listing Jira statuses with arguments:', args);

	try {
		const result = await atlassianStatusesController.listStatuses({
			projectKeyOrId: args.projectKeyOrId,
		});

		methodLogger.debug('Successfully retrieved statuses');

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to list statuses', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register the jira_ls_statuses tool with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance
 */
function registerTools(server: McpServer) {
	const methodLogger = toolLogger.forMethod('registerTools');
	methodLogger.debug('Registering Jira statuses tools...');

	server.tool(
		'jira_ls_statuses',
		`**PURPOSE**: Discover available Jira status names and IDs for filtering issues.

**WHEN TO USE**: Use this tool before filtering issues by status to ensure you're using valid status names.

**RETURNS**: Markdown-formatted list of Jira statuses with names, IDs, categories, and descriptions.

**EXAMPLES**:
- \`{}\` - Lists all globally available statuses
- \`{ "projectKeyOrId": "PROJ" }\` - Lists statuses relevant to the specified project

**ERRORS**: 
- "Not Found" if the specified project doesn't exist
- "Authentication Required" if Atlassian credentials are missing or invalid
- "Permission Denied" if you don't have access to the requested resources`,
		ListStatusesToolArgs.shape,
		handleListStatuses,
	);

	methodLogger.debug('Successfully registered Jira statuses tools');
}

export default { registerTools };
