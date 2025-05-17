import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianCommentsController from '../controllers/atlassian.comments.controller.js';
import { formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Jira issue comments.
 * Provides commands for listing comments and adding new comments to issues.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.comments.cli.ts');

// Log CLI module initialization
cliLogger.debug('Jira comments CLI module initialized');

/**
 * Register Jira Comments CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.comments.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Jira Comments CLI commands...');

	registerListCommentsCommand(program);
	registerAddCommentCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing comments on a Jira issue
 * @param program - The Commander program instance
 */
function registerListCommentsCommand(program: Command): void {
	program
		.command('ls-comments')
		.description(
			'List comments for a specific Jira issue, with pagination support.',
		)
		.requiredOption(
			'-i, --issue-id-or-key <idOrKey>',
			'The ID or key of the Jira issue to get comments from (e.g., "PROJ-123" or "10001"). This is required.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of comments to return (1-100). Default is 25.',
			'25',
		)
		.option(
			'-c, --start-at <number>',
			'Index of the first comment to return (0-based offset, starts at 0). Used for pagination.',
		)
		.option(
			'-S, --order-by <field>',
			'Field and direction to sort comments by (e.g., "created ASC" or "updated DESC").',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.comments.cli.ts',
				'ls-comments',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate limit if provided
				let limit: number | undefined;
				if (options.limit) {
					limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				// Validate startAt if provided
				let startAt: number | undefined;
				if (options.startAt !== undefined) {
					startAt = parseInt(options.startAt, 10);
					if (isNaN(startAt) || startAt < 0) {
						throw new Error(
							'Invalid --start-at value: Must be a non-negative integer.',
						);
					}
				}

				const params = {
					issueIdOrKey: options.issueIdOrKey,
					limit,
					startAt,
					orderBy: options.orderBy,
				};

				actionLogger.debug('Fetching comments with params:', params);

				const result =
					await atlassianCommentsController.listComments(params);

				actionLogger.debug('Successfully retrieved comments');

				// Print the main content (already includes timestamp footer from formatter)
				console.log(result.content);

				// Conditionally print the standardized pagination footer
				if (result.pagination) {
					console.log('\n' + formatPagination(result.pagination));
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for adding a comment to a Jira issue
 * @param program - The Commander program instance
 */
function registerAddCommentCommand(program: Command): void {
	program
		.command('add-comment')
		.description('Add a new comment to a specific Jira issue.')
		.requiredOption(
			'-i, --issue-id-or-key <idOrKey>',
			'The ID or key of the Jira issue to add a comment to (e.g., "PROJ-123" or "10001"). This is required.',
		)
		.requiredOption(
			'-m, --body <text>',
			'The text content of the comment to add. This is required.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.comments.cli.ts',
				'add-comment',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate issue ID/key
				if (
					!options.issueIdOrKey ||
					options.issueIdOrKey.trim() === ''
				) {
					throw new Error('Issue ID or key must not be empty.');
				}

				// Validate comment body
				if (!options.body || options.body.trim() === '') {
					throw new Error('Comment body must not be empty.');
				}

				const params = {
					issueIdOrKey: options.issueIdOrKey,
					commentBody: options.body,
				};

				actionLogger.debug('Adding comment with params:', {
					issueIdOrKey: params.issueIdOrKey,
					commentBodyLength: params.commentBody.length,
				});

				const result =
					await atlassianCommentsController.addComment(params);

				actionLogger.debug('Successfully added comment');

				// Print the main content (already includes timestamp footer from formatter)
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
