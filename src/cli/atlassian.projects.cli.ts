import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';
import { ListProjectsOptions } from '../controllers/atlassian.projects.types.js';
import { formatHeading, formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Jira projects.
 * Provides commands for listing projects and retrieving project details.
 * All commands require valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.projects.cli.ts');

// Log CLI module initialization
cliLogger.debug('Jira projects CLI module initialized');

/**
 * Register Jira Projects CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.projects.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Jira Projects CLI commands...');

	registerListProjectsCommand(program);
	registerGetProjectCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Jira projects
 * @param program - The Commander program instance
 */
function registerListProjectsCommand(program: Command): void {
	program
		.command('ls-projects')
		.description(
			'List Jira projects accessible to the user, with filtering, sorting, and pagination.',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Use this to control the response size. Useful for pagination or when you only need a few results.',
			'25',
		)
		.option(
			'--start-at <number>',
			'Index of the first item to return (0-based offset, starts at 0). Note: Jira uses offset-based pagination with startAt instead of cursor-based pagination used in other servers.',
		)
		.option(
			'--name <n>',
			'Filter projects by name or key (case-insensitive). Use this to find specific projects by their display name or project key.',
		)
		.option(
			'--order-by <field>',
			'Field to sort projects by (e.g., "name", "key", "lastIssueUpdatedTime"). Default is "lastIssueUpdatedTime", which shows the most recently active projects first.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'ls-projects',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate limit if provided
				if (options.limit) {
					const limit = parseInt(options.limit, 10);
					if (isNaN(limit) || limit <= 0) {
						throw new Error(
							'Invalid --limit value: Must be a positive integer.',
						);
					}
				}

				// Validate sort if provided - only allow valid sort fields
				if (
					options.orderBy &&
					!['key', 'name', '-key', '-name'].includes(options.orderBy)
				) {
					throw new Error(
						'Invalid --order-by value: Must be one of: key, name, -key, -name.',
					);
				}

				// Validate name value format if provided
				if (options.name && typeof options.name !== 'string') {
					throw new Error(
						'Invalid --name value: Must be a valid search string.',
					);
				}

				const filterOptions: ListProjectsOptions = {
					...(options.name && { name: options.name }),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.startAt !== undefined && {
						startAt: parseInt(options.startAt, 10),
					}),
					...(options.orderBy && { orderBy: options.orderBy }),
				};

				actionLogger.debug(
					'Fetching projects with filters:',
					filterOptions,
				);

				const result =
					await atlassianProjectsController.list(filterOptions);

				actionLogger.debug('Successfully retrieved projects');

				// Print the main content
				console.log(formatHeading('Projects', 2));
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
 * Register the command for retrieving a specific Jira project
 * @param program - The Commander program instance
 */
function registerGetProjectCommand(program: Command): void {
	program
		.command('get-project')
		.description(
			'Get detailed information about a specific Jira project using its key or ID.',
		)
		.requiredOption(
			'--project-key-or-id <keyOrId>',
			'The key or numeric ID of the Jira project to retrieve (e.g., "PROJ" or "10001"). This is required and must be a valid project key or ID from your Jira instance.',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'get-project',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate project key/ID
				if (
					!options.projectKeyOrId ||
					options.projectKeyOrId.trim() === ''
				) {
					throw new Error('Project key or ID must not be empty.');
				}

				actionLogger.debug(
					`Fetching project: ${options.projectKeyOrId}`,
				);

				const result = await atlassianProjectsController.get({
					projectKeyOrId: options.projectKeyOrId,
				});

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
