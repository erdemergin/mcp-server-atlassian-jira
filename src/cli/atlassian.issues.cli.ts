import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';
import { ListIssuesOptions } from '../controllers/atlassian.issues.types.js';
import { formatHeading, formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Jira issues.
 * Provides commands for listing issues and retrieving issue details.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.issues.cli.ts');

// Log CLI module initialization
cliLogger.debug('Jira issues CLI module initialized');

/**
 * Register Jira Issues CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.issues.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Jira Issues CLI commands...');

	registerListIssuesCommand(program);
	registerGetIssueCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Jira issues
 * @param program - The Commander program instance
 */
function registerListIssuesCommand(program: Command): void {
	program
		.command('ls-issues')
		.description(
			'Search for Jira issues using JQL (Jira Query Language), with pagination.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
			'25',
		)
		.option(
			'-c, --start-at <number>',
			'Index of the first item to return (0-based offset, starts at 0). Note: Jira uses offset-based pagination with startAt instead of cursor-based pagination used in other servers.',
		)
		.option(
			'-q, --jql <jql>',
			'Filter issues using JQL syntax. Use this for complex queries like "project = TEAM AND status = \'In Progress\'" or "assignee = currentUser()". If omitted, returns issues according to your Jira default search.',
		)
		.option(
			'-p, --project-key-or-id <keyOrId>',
			'Filter by a specific project key or ID.',
		)
		.option(
			'-s, --statuses <statuses...>',
			'Filter by one or more status names (repeatable).',
		)
		.option(
			'-o, --order-by <field>',
			'JQL ORDER BY clause (e.g., "priority DESC").',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.issues.cli.ts',
				'ls-issues',
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

				const filterOptions: ListIssuesOptions = {
					...(options.jql && { jql: options.jql }),
					...(options.projectKeyOrId && {
						projectKeyOrId: options.projectKeyOrId,
					}),
					...(options.statuses && { statuses: options.statuses }),
					...(options.orderBy && { orderBy: options.orderBy }),
					...(limit !== undefined && { limit: limit }),
					...(startAt !== undefined && { startAt: startAt }),
				};

				actionLogger.debug(
					'Fetching issues with filters:',
					filterOptions,
				);

				const result =
					await atlassianIssuesController.list(filterOptions);

				actionLogger.debug('Successfully retrieved issues');

				// Print the main content
				console.log(formatHeading('Issues', 2));
				console.log(result.content);

				// Print pagination information if available
				if (result.pagination) {
					// Use the actual number of items displayed rather than potentially zero count
					// The count comes from the controller - it should be the number of items in the current batch
					// We extract this from the controller response.
					// If the response has no items but has more results, show 0 but indicate more are available
					const displayCount = result.pagination.count ?? 0;

					console.log(
						'\n' +
							formatPagination(
								displayCount,
								result.pagination.hasMore,
								result.pagination.nextCursor,
								result.pagination.total,
							),
					);
				}
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

/**
 * Register the command for retrieving a specific Jira issue
 * @param program - The Commander program instance
 */
function registerGetIssueCommand(program: Command): void {
	program
		.command('get-issue')
		.description(
			'Get detailed information about a specific Jira issue using its ID or key.',
		)
		.requiredOption(
			'--issue-id-or-key <idOrKey>',
			'The ID or key of the Jira issue to retrieve (e.g., "10001" or "PROJ-123"). This is required and must be a valid issue ID or key from your Jira instance.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.issues.cli.ts',
				'get-issue',
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

				actionLogger.debug(`Fetching issue: ${options.issueIdOrKey}`);

				const result = await atlassianIssuesController.get({
					issueIdOrKey: options.issueIdOrKey,
				});

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
