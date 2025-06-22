import { Command } from 'commander';
import { Logger } from '../utils/logger.util.js';
import { handleCliError } from '../utils/error.util.js';
import { formatHeading } from '../utils/formatter.util.js';
import atlassianWorklogsController from '../controllers/atlassian.worklogs.controller.js';

// Create a contextualized logger for this file
const cliLogger = Logger.forContext('cli/atlassian.worklogs.cli.ts');

// Log CLI initialization
cliLogger.debug('Jira worklogs CLI initialized');

/**
 * Register Jira worklog CLI commands
 * @param program The Commander program instance
 */
export function register(program: Command): void {
	const methodLogger = Logger.forContext(
		'cli/atlassian.worklogs.cli.ts',
		'register',
	);
	methodLogger.debug('Registering Jira Worklogs CLI commands...');

	// List worklogs command
	program
		.command('ls-worklogs')
		.description('List worklogs for a specific Jira issue.')
		.requiredOption(
			'-i, --issue-id-or-key <issueIdOrKey>',
			'Issue ID or key (e.g., "PROJ-123")',
		)
		.option(
			'-l, --limit <limit>',
			'Maximum number of worklogs to return',
			'25',
		)
		.option('-s, --start-at <startAt>', 'Start index for pagination', '0')
		.option(
			'-e, --expand <expand...>',
			'Additional information to include in the response',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.worklogs.cli.ts',
				'ls-worklogs-action',
			);
			try {
				actionLogger.debug(
					'Executing ls-worklogs command with options:',
					options,
				);

				const result = await atlassianWorklogsController.listWorklogs({
					issueIdOrKey: options.issueIdOrKey,
					limit: parseInt(options.limit),
					startAt: parseInt(options.startAt),
					expand: options.expand,
				});

				console.log(formatHeading('Worklogs', 2));
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// Add worklog command
	program
		.command('add-worklog')
		.description('Add a worklog entry to a Jira issue.')
		.requiredOption(
			'-i, --issue-id-or-key <issueIdOrKey>',
			'Issue ID or key (e.g., "PROJ-123")',
		)
		.requiredOption(
			'-t, --time-spent <timeSpent>',
			'Time spent in Jira format (e.g., "2h 30m", "1d")',
		)
		.requiredOption(
			'-s, --started <started>',
			'Start time in ISO 8601 format (e.g., "2024-01-22T10:00:00.000+0000")',
		)
		.option('-c, --comment <comment>', 'Worklog comment in Markdown format')
		.option(
			'-a, --adjust-estimate <adjustEstimate>',
			'How to adjust remaining estimate: new, leave, manual, auto',
		)
		.option(
			'-n, --new-estimate <newEstimate>',
			'New estimate when adjust-estimate is "new"',
		)
		.option(
			'-r, --reduce-by <reduceBy>',
			'Amount to reduce when adjust-estimate is "manual"',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.worklogs.cli.ts',
				'add-worklog-action',
			);
			try {
				actionLogger.debug(
					'Executing add-worklog command with options:',
					options,
				);

				const result = await atlassianWorklogsController.addWorklog({
					issueIdOrKey: options.issueIdOrKey,
					timeSpent: options.timeSpent,
					started: options.started,
					comment: options.comment,
					adjustEstimate: options.adjustEstimate,
					newEstimate: options.newEstimate,
					reduceBy: options.reduceBy,
				});

				console.log(formatHeading('Add Worklog', 2));
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// Update worklog command
	program
		.command('update-worklog')
		.description('Update an existing worklog entry.')
		.requiredOption(
			'-i, --issue-id-or-key <issueIdOrKey>',
			'Issue ID or key (e.g., "PROJ-123")',
		)
		.requiredOption('-w, --worklog-id <worklogId>', 'Worklog ID to update')
		.option('-t, --time-spent <timeSpent>', 'New time spent in Jira format')
		.option('-c, --comment <comment>', 'New worklog comment')
		.option('-s, --started <started>', 'New start time in ISO 8601 format')
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.worklogs.cli.ts',
				'update-worklog-action',
			);
			try {
				actionLogger.debug(
					'Executing update-worklog command with options:',
					options,
				);

				const result = await atlassianWorklogsController.updateWorklog({
					issueIdOrKey: options.issueIdOrKey,
					worklogId: options.worklogId,
					timeSpent: options.timeSpent,
					comment: options.comment,
					started: options.started,
				});

				console.log(formatHeading('Update Worklog', 2));
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	// Delete worklog command
	program
		.command('delete-worklog')
		.description('Delete a worklog entry from a Jira issue.')
		.requiredOption(
			'-i, --issue-id-or-key <issueIdOrKey>',
			'Issue ID or key (e.g., "PROJ-123")',
		)
		.requiredOption('-w, --worklog-id <worklogId>', 'Worklog ID to delete')
		.option(
			'-a, --adjust-estimate <adjustEstimate>',
			'How to adjust remaining estimate: new, leave, manual, auto',
		)
		.option(
			'-n, --new-estimate <newEstimate>',
			'New estimate when adjust-estimate is "new"',
		)
		.option(
			'-e, --increase-by <increaseBy>',
			'Amount to increase when adjust-estimate is "manual"',
		)
		.action(async (options) => {
			const actionLogger = Logger.forContext(
				'cli/atlassian.worklogs.cli.ts',
				'delete-worklog-action',
			);
			try {
				actionLogger.debug(
					'Executing delete-worklog command with options:',
					options,
				);

				const result = await atlassianWorklogsController.deleteWorklog({
					issueIdOrKey: options.issueIdOrKey,
					worklogId: options.worklogId,
					adjustEstimate: options.adjustEstimate,
					newEstimate: options.newEstimate,
					increaseBy: options.increaseBy,
				});

				console.log(formatHeading('Delete Worklog', 2));
				console.log(result.content);
			} catch (error) {
				actionLogger.error('Operation failed:', error);
				handleCliError(error);
			}
		});

	methodLogger.debug('CLI commands registered successfully');
}

export default { register };
