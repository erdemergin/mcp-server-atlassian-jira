import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import {
	ListCommentsToolArgs,
	ListCommentsToolArgsType,
	AddCommentToolArgs,
	AddCommentToolArgsType,
} from './atlassian.comments.types.js';
import atlassianCommentsController from '../controllers/atlassian.comments.controller.js';

// Create a contextualized logger for this file
const toolLogger = Logger.forContext('tools/atlassian.comments.tool.ts');

// Log tool module initialization
toolLogger.debug('Jira comments tool module initialized');

/**
 * MCP Tool: List Comments for a Jira Issue
 *
 * Lists comments for a specific Jira issue with pagination support.
 * Returns a formatted markdown response with comments list and pagination info.
 *
 * @param {ListCommentsToolArgsType} args - Tool arguments containing the issue ID/key and optional pagination params
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }>, metadata: { pagination: { startAt: number, limit: number, total: number } } }>} MCP response with formatted comments list
 * @throws Will return error message if comment listing fails
 */
async function handleListComments(args: ListCommentsToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'handleListComments',
	);

	methodLogger.debug('Listing comments for issue', args);

	try {
		const result = await atlassianCommentsController.listComments({
			issueIdOrKey: args.issueIdOrKey,
			limit: args.limit,
			startAt: args.startAt,
			orderBy: args.orderBy,
		});

		methodLogger.debug('Successfully retrieved comments list', {
			issueIdOrKey: args.issueIdOrKey,
			hasPagination: !!result.pagination,
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
		methodLogger.error('Failed to list issue comments', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * MCP Tool: Add Comment to a Jira Issue
 *
 * Adds a new comment to a specific Jira issue.
 * Returns a formatted markdown response confirming the comment was added.
 *
 * @param {AddCommentToolArgsType} args - Tool arguments containing the issue ID/key and comment content
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} MCP response with formatted confirmation
 * @throws Will return error message if comment addition fails
 */
async function handleAddComment(args: AddCommentToolArgsType) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'handleAddComment',
	);

	methodLogger.debug('Adding comment to issue', {
		issueIdOrKey: args.issueIdOrKey,
		commentLength: args.commentBody.length,
	});

	try {
		const result = await atlassianCommentsController.addComment({
			issueIdOrKey: args.issueIdOrKey,
			commentBody: args.commentBody,
		});

		methodLogger.debug('Successfully added comment to issue', {
			issueIdOrKey: args.issueIdOrKey,
		});

		return {
			content: [
				{
					type: 'text' as const,
					text: result.content,
				},
			],
		};
	} catch (error) {
		methodLogger.error('Failed to add comment to issue', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Register Atlassian Comments MCP Tools
 *
 * Registers the comment-related tools with the MCP server.
 * Each tool is registered with its schema, description, and handler function.
 *
 * @param {McpServer} server - The MCP server instance to register tools with
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/atlassian.comments.tool.ts',
		'registerTools',
	);
	methodLogger.debug('Registering Atlassian Comments tools...');

	// Register the list comments tool
	server.tool(
		'jira_ls_comments',
		`Lists comments for a specific Jira issue identified by \`issueIdOrKey\`. Comments are returned with author details, creation/edit dates, and complete content. Supports pagination via \`limit\` and \`startAt\`. Optionally sort results using \`orderBy\` (e.g., "created ASC" or "updated DESC"). Returns a formatted list of comments in Markdown format. Requires Jira credentials to be configured.`,
		ListCommentsToolArgs.shape,
		handleListComments,
	);

	// Register the add comment tool
	server.tool(
		'jira_add_comment',
		`Adds a new comment to a Jira issue identified by \`issueIdOrKey\`. Provide the comment text in \`commentBody\` parameter. Markdown formatting (including headings, lists, code blocks, links) is supported and will be converted to Jira's rich text format (ADF). Returns a confirmation message with the newly created comment details. Use this tool to reply to issues or add new information. Requires Jira credentials to be configured.`,
		AddCommentToolArgs.shape,
		handleAddComment,
	);

	methodLogger.debug('Successfully registered Atlassian Comments tools');
}

export default { registerTools };
