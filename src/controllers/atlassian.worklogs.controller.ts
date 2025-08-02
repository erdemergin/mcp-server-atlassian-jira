import { Logger } from '../utils/logger.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { createApiError } from '../utils/error.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import {
	formatWorklogsList,
	formatAddedWorklogConfirmation,
	formatUpdatedWorklogConfirmation,
	formatDeletedWorklogConfirmation,
} from './atlassian.worklogs.formatter.js';
import {
	ListWorklogsToolArgsType,
	AddWorklogToolArgsType,
	UpdateWorklogToolArgsType,
	DeleteWorklogToolArgsType,
} from '../tools/atlassian.worklogs.types.js';
import { formatPagination } from '../utils/formatter.util.js';
import { markdownToAdf } from '../utils/adf-from-markdown.util.js';
import { textToAdf } from '../utils/adf-from-text.util.js';

// Types for worklog API parameters
interface WorklogApiParams {
	timeSpentSeconds?: number;
	started?: string;
	comment?: string | { type: string; version: number; content: unknown[] };
	visibility?: {
		type: string;
		identifier?: string;
		value?: string;
	};
}

interface WorklogEstimateParams {
	adjustEstimate?: string;
	newEstimate?: string;
	reduceBy?: string;
	increaseBy?: string;
}

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.worklogs.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira worklogs controller initialized');

/**
 * Parse time duration string to seconds
 * Supports formats like "2h 30m", "1d", "45m", "1d 2h 30m"
 * @param timeString Time string in Jira format
 * @returns Number of seconds
 */
function parseTimeToSeconds(timeString: string): number {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.worklogs.controller.ts',
		'parseTimeToSeconds',
	);
	methodLogger.debug(`Parsing time string: ${timeString}`);

	const regex = /(\d+)([dwhmsDWHMS])/g;
	let totalSeconds = 0;
	let match;

	while ((match = regex.exec(timeString)) !== null) {
		const value = parseInt(match[1]);
		const unit = match[2].toLowerCase();

		switch (unit) {
			case 'w':
				totalSeconds += value * 5 * 8 * 3600; // 5 days * 8 hours
				break;
			case 'd':
				totalSeconds += value * 8 * 3600; // 8 hours per day
				break;
			case 'h':
				totalSeconds += value * 3600;
				break;
			case 'm':
				totalSeconds += value * 60;
				break;
			case 's':
				totalSeconds += value;
				break;
		}
	}

	methodLogger.debug(`Parsed ${timeString} to ${totalSeconds} seconds`);
	return totalSeconds;
}

/**
 * List worklogs for a Jira issue
 * @param options Options for listing worklogs
 * @returns Promise with formatted worklog list
 */
async function listWorklogs(
	options: ListWorklogsToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.worklogs.controller.ts',
		'listWorklogs',
	);
	methodLogger.debug('Listing worklogs for issue:', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Apply defaults
		const defaults: Partial<ListWorklogsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			startAt: 0,
		};

		const mergedOptions = applyDefaults<ListWorklogsToolArgsType>(
			options,
			defaults,
		);

		// Get worklogs from service
		const worklogsData = await atlassianIssuesService.getWorklogs(
			mergedOptions.issueIdOrKey,
			{
				startAt: mergedOptions.startAt,
				maxResults: mergedOptions.limit,
				expand: mergedOptions.expand,
			},
		);

		methodLogger.debug(
			`Retrieved ${worklogsData.worklogs?.length || 0} worklogs out of ${worklogsData.total || 0} total`,
		);

		// Extract pagination info
		const pagination = extractPaginationInfo(
			worklogsData as unknown as Record<string, unknown>,
			PaginationType.OFFSET,
			'Worklog',
		);

		// Format worklogs
		const formattedWorklogs = formatWorklogsList(
			worklogsData.worklogs || [],
			mergedOptions.issueIdOrKey,
		);

		// Add pagination if needed
		let contentWithPagination = formattedWorklogs;
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			contentWithPagination += '\n\n' + paginationString;
		}

		return {
			content: contentWithPagination,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Worklogs',
				'listing',
				'controllers/atlassian.worklogs.controller.ts@listWorklogs',
				options.issueIdOrKey,
				{ issueIdOrKey: options.issueIdOrKey },
			),
		);
	}
}

/**
 * Add a worklog to a Jira issue
 * @param options Options for adding worklog
 * @returns Promise with confirmation message
 */
async function addWorklog(
	options: AddWorklogToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.worklogs.controller.ts',
		'addWorklog',
	);
	methodLogger.debug('Adding worklog to issue:', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Convert time spent to seconds
		const timeSpentSeconds = parseTimeToSeconds(options.timeSpent);
		if (timeSpentSeconds === 0) {
			throw createApiError(
				`Invalid time format: "${options.timeSpent}". Use format like "2h 30m", "1d", etc.`,
				400,
			);
		}

		// Convert comment to ADF if provided
		let commentAdf;
		if (options.comment) {
			try {
				commentAdf = markdownToAdf(options.comment);
			} catch (error) {
				methodLogger.warn(
					'Failed to convert markdown to ADF, falling back to text',
					error,
				);
				commentAdf = textToAdf(options.comment);
			}
		}

		// Build request parameters
		const params: WorklogApiParams & WorklogEstimateParams = {
			timeSpentSeconds,
			started: options.started,
		};

		if (commentAdf) {
			params.comment = commentAdf;
		}

		// Handle estimate adjustment
		if (options.adjustEstimate) {
			params.adjustEstimate = options.adjustEstimate;
			if (options.adjustEstimate === 'new' && options.newEstimate) {
				params.newEstimate = options.newEstimate;
			} else if (
				options.adjustEstimate === 'manual' &&
				options.reduceBy
			) {
				params.reduceBy = options.reduceBy;
			}
		}

		// Add worklog via service
		const addedWorklog = await atlassianIssuesService.addWorklog(
			options.issueIdOrKey,
			params,
		);

		methodLogger.debug(
			`Successfully added worklog with ID: ${addedWorklog.id}`,
		);

		// Format confirmation
		const confirmation = formatAddedWorklogConfirmation(
			addedWorklog,
			options.issueIdOrKey,
		);

		return {
			content: confirmation,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Worklog',
				'adding',
				'controllers/atlassian.worklogs.controller.ts@addWorklog',
				options.issueIdOrKey,
				{
					issueIdOrKey: options.issueIdOrKey,
					timeSpent: options.timeSpent,
				},
			),
		);
	}
}

/**
 * Update an existing worklog
 * @param options Options for updating worklog
 * @returns Promise with confirmation message
 */
async function updateWorklog(
	options: UpdateWorklogToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.worklogs.controller.ts',
		'updateWorklog',
	);
	methodLogger.debug('Updating worklog:', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Build update parameters
		const params: WorklogApiParams = {};

		// Convert time spent to seconds if provided
		if (options.timeSpent) {
			const timeSpentSeconds = parseTimeToSeconds(options.timeSpent);
			if (timeSpentSeconds === 0) {
				throw createApiError(
					`Invalid time format: "${options.timeSpent}". Use format like "2h 30m", "1d", etc.`,
					400,
				);
			}
			params.timeSpentSeconds = timeSpentSeconds;
		}

		// Convert comment to ADF if provided
		if (options.comment) {
			try {
				params.comment = markdownToAdf(options.comment);
			} catch (error) {
				methodLogger.warn(
					'Failed to convert markdown to ADF, falling back to text',
					error,
				);
				params.comment = textToAdf(options.comment);
			}
		}

		// Add started time if provided
		if (options.started) {
			params.started = options.started;
		}

		// Update worklog via service
		const updatedWorklog = await atlassianIssuesService.updateWorklog(
			options.issueIdOrKey,
			options.worklogId,
			params,
		);

		methodLogger.debug(
			`Successfully updated worklog ID: ${options.worklogId}`,
		);

		// Format confirmation
		const confirmation = formatUpdatedWorklogConfirmation(
			updatedWorklog,
			options.issueIdOrKey,
		);

		return {
			content: confirmation,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Worklog',
				'updating',
				'controllers/atlassian.worklogs.controller.ts@updateWorklog',
				`${options.issueIdOrKey}/${options.worklogId}`,
				{
					issueIdOrKey: options.issueIdOrKey,
					worklogId: options.worklogId,
				},
			),
		);
	}
}

/**
 * Delete a worklog from a Jira issue
 * @param options Options for deleting worklog
 * @returns Promise with confirmation message
 */
async function deleteWorklog(
	options: DeleteWorklogToolArgsType,
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.worklogs.controller.ts',
		'deleteWorklog',
	);
	methodLogger.debug('Deleting worklog:', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Build delete parameters
		const params: WorklogEstimateParams = {};

		// Handle estimate adjustment
		if (options.adjustEstimate) {
			params.adjustEstimate = options.adjustEstimate;
			if (options.adjustEstimate === 'new' && options.newEstimate) {
				params.newEstimate = options.newEstimate;
			} else if (
				options.adjustEstimate === 'manual' &&
				options.increaseBy
			) {
				params.increaseBy = options.increaseBy;
			}
		}

		// Delete worklog via service
		await atlassianIssuesService.deleteWorklog(
			options.issueIdOrKey,
			options.worklogId,
			params,
		);

		methodLogger.debug(
			`Successfully deleted worklog ID: ${options.worklogId}`,
		);

		// Format confirmation
		const confirmation = formatDeletedWorklogConfirmation(
			options.issueIdOrKey,
			options.worklogId,
		);

		return {
			content: confirmation,
		};
	} catch (error) {
		throw handleControllerError(
			error,
			buildErrorContext(
				'Worklog',
				'deleting',
				'controllers/atlassian.worklogs.controller.ts@deleteWorklog',
				`${options.issueIdOrKey}/${options.worklogId}`,
				{
					issueIdOrKey: options.issueIdOrKey,
					worklogId: options.worklogId,
				},
			),
		);
	}
}

export default {
	listWorklogs,
	addWorklog,
	updateWorklog,
	deleteWorklog,
};
