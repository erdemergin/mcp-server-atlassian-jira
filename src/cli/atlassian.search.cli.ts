import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { formatPagination } from '../utils/formatter.util.js';

import atlassianSearchController from '../controllers/atlassian.search.controller.js';

/**
 * Register Atlassian Jira Search commands
 *
 * @param {Command} program - Commander program instance
 */
function register(program: Command) {
	const cliLogger = Logger.forContext(
		'cli/atlassian.search.cli.ts',
		'register',
	);
	cliLogger.debug('Registering Atlassian Jira search commands...');

	// Register the search command
	program
		.command('search')
		.description('Search for Jira issues using JQL (Jira Query Language)')
		.option(
			'-q, --jql <query>',
			'Filter issues using Jira Query Language (JQL) syntax (e.g., "project = TEAM AND status = \'In Progress\'")',
		)
		.option(
			'-l, --limit <number>',
			'Maximum number of items to return (1-100)',
		)
		.option(
			'-c, --cursor <string>',
			'Pagination cursor for retrieving the next set of results',
		)
		.action(async (options) => {
			try {
				const cliLogger = Logger.forContext(
					'cli/atlassian.search.cli.ts',
					'search',
				);
				cliLogger.debug(
					'Executing search command with options:',
					options,
				);

				// Parse limit as number if provided
				if (options.limit) {
					options.limit = parseInt(options.limit, 10);
				}

				const result = await atlassianSearchController.search(options);

				console.log(result.content);

				if (result.pagination) {
					console.log(
						formatPagination(
							result.pagination.count || 0,
							result.pagination.hasMore,
							result.pagination.nextCursor,
						),
					);
				}
			} catch (error) {
				handleCliError(error);
			}
		});

	cliLogger.debug('Successfully registered Atlassian Jira search commands');
}

export default { register };
