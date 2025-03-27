import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { createApiError } from '../utils/error.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	ListIssuesOptions,
	GetIssueOptions,
	IssueIdentifier,
} from './atlassian.issues.types.js';
import {
	formatIssuesList,
	formatIssueDetails,
} from './atlassian.issues.formatter.js';
import { DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';

/**
 * Controller for managing Jira issues.
 * Provides functionality for listing issues and retrieving issue details.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.issues.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira issues controller initialized');

/**
 * List Jira issues with optional filtering
 * @param options - Optional filter options for the issues list
 * @param options.jql - JQL query to filter issues
 * @param options.limit - Maximum number of issues to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted issue list content and pagination information
 */
async function list(
	options: ListIssuesOptions = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.controller.ts',
		'list',
	);
	methodLogger.debug('Listing Jira issues...', options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Set default JQL to sort by updated date if not provided
		let jql = options.jql || '';
		if (!jql) {
			jql = 'ORDER BY updated DESC';
		} else if (!jql.toUpperCase().includes('ORDER BY')) {
			// Append default sorting to existing JQL if it doesn't include ORDER BY
			jql += ' ORDER BY updated DESC';
		}

		// Set default filters and hardcoded values
		const filters = {
			// Optional filters with defaults
			jql: jql,
			// Always include all fields
			fields: [
				'summary',
				'description',
				'status',
				'issuetype',
				'priority',
				'project',
				'assignee',
				'reporter',
				'creator',
				'created',
				'updated',
				'timetracking',
				'comment',
				'attachment',
				'worklog',
				'issuelinks',
			],
			// Pagination
			maxResults: options.limit || DEFAULT_PAGE_SIZE,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		methodLogger.debug('Using filters:', filters);

		const issuesData = await atlassianIssuesService.search(filters);
		// Log only the count of issues returned instead of the entire response
		const issuesCount = issuesData.issues?.length || 0;
		methodLogger.debug(`Retrieved ${issuesCount} issues`);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			issuesData as unknown as Record<string, unknown>,
			PaginationType.OFFSET,
		);

		// Ensure pagination count is set to the actual number of issues retrieved
		pagination.count = issuesCount;
		methodLogger.debug(`Next cursor: ${pagination.nextCursor}`);

		// Format the issues data for display using the formatter
		const formattedIssues = formatIssuesList(
			{
				issues: issuesData.issues || [],
				baseUrl: `https://${credentials.siteName}.atlassian.net`,
			},
			pagination,
		);

		return {
			content: formattedIssues,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		return handleControllerError(error, {
			entityType: 'Issues',
			operation: 'listing',
			source: 'controllers/atlassian.issues.controller.ts@list',
			additionalInfo: { options, jql: options.jql },
		});
	}
}

/**
 * Get details of a specific Jira issue
 * @param identifier - Object containing the ID or key of the issue to retrieve
 * @param identifier.idOrKey - The ID or key of the issue
 * @param _options - Options for retrieving the issue (currently not used, but maintained for future extensibility)
 * @returns Promise with formatted issue details content
 * @throws Error if issue retrieval fails
 */
async function get(
	identifier: IssueIdentifier,
	_options: GetIssueOptions = {},
): Promise<ControllerResponse> {
	const { idOrKey } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.issues.controller.ts',
		'get',
	);

	methodLogger.debug(`Getting Jira issue with ID/key: ${idOrKey}...`);

	// Validate issue ID format
	if (!idOrKey || idOrKey === 'invalid') {
		throw createApiError('Invalid issue ID', 400);
	}

	try {
		// Always include all fields
		const fields = [
			'summary',
			'description',
			'status',
			'issuetype',
			'priority',
			'project',
			'assignee',
			'reporter',
			'creator',
			'created',
			'updated',
			'timetracking',
			'comment',
			'attachment',
			'worklog',
			'issuelinks',
		];

		// Parameters for the service call
		const params = {
			fields,
			updateHistory: true, // Mark as viewed
		};

		methodLogger.debug('Using params:', params);

		const issueData = await atlassianIssuesService.get(idOrKey, params);
		// Log only key information instead of the entire response
		methodLogger.debug(`Retrieved issue: ${issueData.key}`);

		// Format the issue data for display using the formatter
		const formattedIssue = formatIssueDetails(issueData);

		return {
			content: formattedIssue,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Issue',
			entityId: identifier,
			operation: 'retrieving',
			source: 'controllers/atlassian.issues.controller.ts@get',
		});
	}
}

export default { list, get };
