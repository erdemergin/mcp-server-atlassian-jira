import { Command } from 'commander';
import { logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import atlassianIssuesController from '../controllers/atlassian.issues.controller.js';
import { ListIssuesOptions } from '../controllers/atlassian.issues.types.js';
import { formatHeading, formatPagination } from '../utils/formatter.util.js';

/**
 * CLI module for managing Jira issues.
 * Provides commands for listing issues and retrieving issue details.
 * All commands require valid Atlassian credentials.
 */

/**
 * Register Jira Issues CLI commands with the Commander program
 * @param program - The Commander program instance to register commands with
 * @throws Error if command registration fails
 */
function register(program: Command): void {
	const logPrefix = '[src/cli/atlassian.issues.cli.ts@register]';
	logger.debug(`${logPrefix} Registering Jira Issues CLI commands...`);

	registerListIssuesCommand(program);
	registerGetIssueCommand(program);

	logger.debug(`${logPrefix} CLI commands registered successfully`);
}

/**
 * Register the command for listing Jira issues
 * @param program - The Commander program instance
 */
function registerListIssuesCommand(program: Command): void {
	program
		.command('list-issues')
		.description(
			'List Jira issues with optional filtering\n\n' +
				'Retrieves issues from your Jira instance with filtering and pagination options.\n\n' +
				'Examples:\n' +
				'  $ list-issues --project-key TEAM --status "In Progress"\n' +
				'  $ list-issues --limit 50 --query "assignee = currentUser()"\n' +
				'  $ list-issues --project-key TEAM --query "priority = High"',
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
		.option('-q, --query <jql>', 'Filter issues using JQL syntax')
		.option('--project-key <key>', 'Filter by project key')
		.option('--status <status>', 'Filter by issue status')
		.action(async (options) => {
			const logPrefix = '[src/cli/atlassian.issues.cli.ts@list-issues]';
			try {
				logger.debug(
					`${logPrefix} Processing command options:`,
					options,
				);

				// Build JQL from options
				let jql = '';
				if (options.projectKey) {
					jql += `project = "${options.projectKey}"`;
				}
				if (options.status) {
					jql +=
						(jql ? ' AND ' : '') + `status = "${options.status}"`;
				}
				if (options.query) {
					jql += (jql ? ' AND ' : '') + `(${options.query})`;
				}

				const filterOptions: ListIssuesOptions = {
					...(jql && { jql }),
					...(options.limit && {
						limit: parseInt(options.limit, 10),
					}),
					...(options.cursor && { cursor: options.cursor }),
				};

				logger.debug(
					`${logPrefix} Fetching issues with filters:`,
					filterOptions,
				);

				const result =
					await atlassianIssuesController.list(filterOptions);

				logger.debug(`${logPrefix} Successfully retrieved issues`);

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
				logger.error(`${logPrefix} Operation failed:`, error);
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
			'Get detailed information about a specific Jira issue\n\n' +
				'Retrieves comprehensive details for an issue including status, comments, attachments, and metadata.\n\n' +
				'Examples:\n' +
				'  $ get-issue PROJ-123',
		)
		.argument('<entity-id>', 'ID or key of the issue to retrieve')
		.action(async (entityId: string) => {
			const logPrefix = '[src/cli/atlassian.issues.cli.ts@get-issue]';
			try {
				logger.debug(
					`${logPrefix} Fetching details for issue ID/key: ${entityId}`,
				);

				const result = await atlassianIssuesController.get({
					idOrKey: entityId,
				});

				logger.debug(
					`${logPrefix} Successfully retrieved issue details`,
				);

				console.log(result.content);
			} catch (error) {
				logger.error(`${logPrefix} Operation failed:`, error);
				handleCliError(error);
			}
		});
}

export default { register };
