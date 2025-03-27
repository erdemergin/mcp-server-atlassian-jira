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
	const methodLogger = Logger.forContext(
		'cli/atlassian.issues.cli.ts',
		'registerListIssuesCommand',
	);

	program
		.command('list-issues')
		.description(
			`Search for Jira issues using JQL (Jira Query Language), with pagination.

        PURPOSE: Find and explore issues across projects or within specific criteria using the powerful JQL syntax. Essential for finding issue keys/IDs for 'get-issue'.

        Use Case: Use this for any issue search, from simple text searches to complex filtering based on project, status, assignee, priority, dates, labels, etc.

        Output: Formatted list of issues matching the JQL query, including key, summary, type, status, priority, project, assignee, reporter, and dates. Includes pagination info.
        
        Sorting: By default, issues are sorted by updated date in descending order (most recently updated first). This behavior can be overridden by including an explicit ORDER BY clause in your JQL query.

        Examples:
  $ mcp-jira list-issues --jql "project = TEAM AND status = 'In Progress' ORDER BY updated DESC"
  $ mcp-jira list-issues --limit 50 --jql "assignee = currentUser() AND resolution = Unresolved"
  $ mcp-jira list-issues --jql "text ~ 'performance issue'" --cursor "50"
  $ mcp-jira list-issues  # Returns all issues, sorted by most recently updated first`,
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
			'-q, --jql <jql>',
			'Filter issues using Jira Query Language (JQL) syntax (e.g., "project = TEAM AND status = \'In Progress\'")',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.issues.cli.ts',
				'list-issues',
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

				const filterOptions: ListIssuesOptions = {
					...(options.jql && { jql: options.jql }),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
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
	const methodLogger = Logger.forContext(
		'cli/atlassian.issues.cli.ts',
		'registerGetIssueCommand',
	);

	program
		.command('get-issue')
		.description(
			`Get detailed information about a specific Jira issue using its ID or key.

        PURPOSE: Retrieve comprehensive details for a *known* issue, including description, status, comments, attachments, links, worklogs, and all standard fields. Requires the issue ID or key.

        Use Case: Essential for understanding the full context of a specific issue identified via 'list-issues' or prior knowledge. Provides all data needed for analysis or summarization.

        Output: Formatted details of the specified issue. Fetches all available standard fields, comments, attachments, links, and worklogs by default.

        Examples:
  $ mcp-jira get-issue --issue PROJ-123
  $ mcp-jira get-issue --issue 10001`,
		)
		.requiredOption(
			'--issue <idOrKey>',
			'ID or key of the issue to retrieve (e.g., "TEAM-123" or "10001")',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.issues.cli.ts',
				'get-issue',
			);

			try {
				actionLogger.debug('Processing command options:', options);

				// Validate issue ID/key
				if (!options.issue || options.issue.trim() === '') {
					throw new Error(
						'Issue ID/key must be a valid non-empty string',
					);
				}

				// Check if it follows the typical Jira issue key pattern or is numeric
				if (
					!(
						/^[A-Za-z]+-\d+$/.test(options.issue) ||
						/^\d+$/.test(options.issue)
					)
				) {
					throw new Error(
						'Issue ID/key must be either a project key with number (e.g., PROJ-123) or a numeric ID',
					);
				}

				actionLogger.debug(
					`Fetching details for issue ID/key: ${options.issue}`,
				);

				const result = await atlassianIssuesController.get({
					idOrKey: options.issue,
				});

				actionLogger.debug('Successfully retrieved issue details');

				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});
}

export default { register };
