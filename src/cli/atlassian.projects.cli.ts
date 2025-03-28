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
		.command('list-projects')
		.description(
			`List Jira projects with pagination and optional filtering.

        PURPOSE: Browse all accessible Jira projects for discovery, exploration, and finding project keys/IDs.

        Use Case: Get an overview of all Jira projects you have access to, with essential metadata including key, name, type, and lead. Useful for finding project keys needed for more specific operations.

        Output: Formatted list of projects with key, name, type, and lead information. Includes pagination support for large project collections.
        
        Examples:
  $ mcp-jira list-projects --limit 10
  $ mcp-jira list-projects --query "Marketing" --limit 25 --cursor "25"`,
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100)',
			'25',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.option(
			'-q, --query <query>',
			'Filter projects by name or key (case-insensitive)',
		)
		.option(
			'-s, --sort <sort>',
			'Sort projects by key or name (ascending or descending)',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'list-projects',
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
					options.sort &&
					!['key', 'name', '-key', '-name'].includes(options.sort)
				) {
					throw new Error(
						'Invalid --sort value: Must be one of: key, name, -key, -name.',
					);
				}

				// Validate query value format if provided
				if (options.query && typeof options.query !== 'string') {
					throw new Error(
						'Invalid --query value: Must be a valid search string.',
					);
				}

				const filterOptions: ListProjectsOptions = {
					...(options.query && { query: options.query }),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
					...(options.sort && { sort: options.sort }),
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
			`Get detailed information about a specific Jira project using its ID or key.

        PURPOSE: Retrieve comprehensive metadata for a *known* project, including its full description, lead, components, versions, style, and links.`,
		)
		.requiredOption(
			'-k, --key <keyOrId>',
			'ID or key of the project to retrieve (e.g., "TEAM" or "10001")',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.projects.cli.ts',
				'get-project',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate project ID/key
				if (!options.key || options.key.trim() === '') {
					throw new Error('Project ID or key must not be empty.');
				}

				actionLogger.debug(`Fetching project: ${options.key}`);

				const result = await atlassianProjectsController.get({
					keyOrId: options.key,
				});

				console.log(result.content);
			} catch (error) {
				handleCliError(error);
			}
		});
}

export default { register };
