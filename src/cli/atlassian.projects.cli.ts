import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { ListProjectsToolArgsType } from '../tools/atlassian.projects.types.js';
import atlassianProjectsController from '../controllers/atlassian.projects.controller.js';

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
			'List Jira projects with optional filtering and pagination.',
		)
		.option(
			'-n, --name <n>',
			'Filter projects by name (case-insensitive partial match).',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100). Default is 25.',
			'25',
		)
		.option(
			'-c, --start-at <number>',
			"Index of the first item to return (0-based offset, starts at 0). Used for pagination with Jira's offset-based pagination.",
		)
		.option(
			'-S, --order-by <field>',
			'Sort field, can be "name", "key", "id", or "lastIssueUpdatedTime" (default).',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'ls-projects',
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

				const filterOptions: ListProjectsToolArgsType = {
					...(options.name && { name: options.name }),
					...(options.orderBy && { orderBy: options.orderBy }),
					...(limit !== undefined && { limit: limit }),
					...(startAt !== undefined && { startAt: startAt }),
				};

				actionLogger.debug(
					'Fetching projects with filters:',
					filterOptions,
				);

				const result =
					await atlassianProjectsController.list(filterOptions);

				actionLogger.debug('Successfully retrieved projects');

				// Print the full content (now includes pagination info)
				console.log(result.content);
			} catch (error) {
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
		.description('Get detailed information about a specific Jira project.')
		.requiredOption(
			'-p, --project-key-or-id <projectKeyOrId>',
			'The key or ID of the project to retrieve. This is required and must be a valid project key or numeric ID from your Jira instance.',
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
					throw new Error('Project key or ID cannot be empty.');
				}

				actionLogger.debug(
					`Fetching project details: ${options.projectKeyOrId}`,
				);

				const result = await atlassianProjectsController.get({
					projectKeyOrId: options.projectKeyOrId,
				});

				// Print the main content (already includes timestamp footer from formatter)
				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
