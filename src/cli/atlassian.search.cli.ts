import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { formatHeading, formatPagination } from '../utils/formatter.util.js';

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
		.description(
			`Search for Jira issues using JQL (Jira Query Language), with pagination.

        PURPOSE: Find and explore issues across projects using the powerful JQL syntax for precise filtering and complex search patterns.

        USE CASE: Use for advanced content searches across Jira, supporting complex issue filtering with logical operators (AND, OR, NOT), custom fields, and specific values. Essential for locating issues matching multiple criteria like project, status, assignee, text content, and dates.

        OUTPUT: Formatted list of issues matching the JQL query, including key, summary, type, status, priority, project, assignee, reporter, and dates. Includes pagination info.
        
        SORTING: By default, issues are sorted by updated date in descending order (most recently updated first). This behavior can be overridden by including an explicit ORDER BY clause in your JQL query.

        EXAMPLES:
  $ mcp-atlassian-jira search --jql "project = TEAM AND status = 'In Progress' ORDER BY updated DESC"
  $ mcp-atlassian-jira search --limit 50 --jql "assignee = currentUser() AND resolution = Unresolved"
  $ mcp-atlassian-jira search --jql "created >= '2023-01-01' AND type = Bug AND priority = High"
  $ mcp-atlassian-jira search --jql "text ~ 'performance issue'" --cursor "50"`,
		)
		.option(
			'-q, --jql <query>',
			'Filter issues using Jira Query Language (JQL) syntax (e.g., "project = TEAM AND status = \'In Progress\'")',
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
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.search.cli.ts',
				'search',
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

				const result = await atlassianSearchController.search({
					jql: options.jql,
					limit: options.limit
						? parseInt(options.limit, 10)
						: undefined,
					cursor: options.cursor,
				});

				actionLogger.debug('Successfully retrieved search results');

				// Print the main content
				console.log(formatHeading('Search Results', 2));
				console.log(result.content);

				if (result.pagination) {
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

	cliLogger.debug('Successfully registered Atlassian Jira search commands');
}

export default { register };
