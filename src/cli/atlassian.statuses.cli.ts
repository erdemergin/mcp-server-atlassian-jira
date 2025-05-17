import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianStatusesController from '../controllers/atlassian.statuses.controller.js';

/**
 * CLI module for managing Jira statuses.
 * Provides the ls-statuses command for listing available statuses.
 * Requires valid Atlassian credentials.
 */

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.statuses.cli.ts');

// Log CLI module initialization
cliLogger.debug('Jira statuses CLI module initialized');

/**
 * Register Jira Statuses CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.statuses.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Jira Statuses CLI commands...');

	registerListStatusesCommand(program);

	methodLogger.debug('CLI commands registered successfully');
}

/**
 * Register the command for listing Jira statuses
 * @param program - The Commander program instance
 */
function registerListStatusesCommand(program: Command): void {
	program
		.command('ls-statuses')
		.description(
			'List available Jira statuses. Lists *all* statuses globally or for a specific project. **Important:** This command returns all statuses in a single response - the underlying Jira API does not support pagination for this endpoint, so parameters like --limit or --start-at are not applicable.',
		)
		.option(
			'-p, --project-key-or-id <keyOrId>',
			"Optional project key or ID to filter statuses relevant to that project's workflows.",
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.statuses.cli.ts',
				'ls-statuses',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Extract options
				const filterOptions = {
					projectKeyOrId: options.projectKeyOrId,
				};

				actionLogger.debug(
					'Fetching statuses with filters:',
					filterOptions,
				);

				const result =
					await atlassianStatusesController.listStatuses(
						filterOptions,
					);

				actionLogger.debug('Successfully retrieved statuses');

				// Print the main content (already includes header and timestamp footer from formatter)
				console.log(result.content);

				// No pagination footer needed for statuses
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
