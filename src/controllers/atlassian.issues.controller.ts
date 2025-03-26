import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import { logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import {
	ListIssuesOptions,
	GetIssueOptions,
	ControllerResponse,
	IssueIdentifier,
} from './atlassian.issues.type.js';
import {
	formatIssuesList,
	formatIssueDetails,
} from './atlassian.issues.formatter.js';

/**
 * Controller for managing Jira issues.
 * Provides functionality for listing issues and retrieving issue details.
 */

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
	const source = `[src/controllers/atlassian.issues.controller.ts@list]`;
	logger.debug(`${source} Listing Jira issues...`, options);

	try {
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw new Error(
				'Atlassian credentials are required for this operation',
			);
		}

		// Set default filters and hardcoded values
		const filters = {
			// Optional filters with defaults
			jql: options.jql,
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
			maxResults: options.limit || 50,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		logger.debug(`${source} Using filters:`, filters);

		const issuesData = await atlassianIssuesService.search(filters);
		// Log only the count of issues returned instead of the entire response
		logger.debug(
			`${source} Retrieved ${issuesData.issues?.length || 0} issues`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			issuesData,
			PaginationType.OFFSET,
			source,
		);

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
			source: 'src/controllers/atlassian.issues.controller.ts@list',
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

	logger.debug(
		`[src/controllers/atlassian.issues.controller.ts@get] Getting Jira issue with ID/key: ${idOrKey}...`,
	);

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

		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@get] Using params:`,
			params,
		);

		const issueData = await atlassianIssuesService.get(idOrKey, params);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.issues.controller.ts@get] Retrieved issue: ${issueData.key}`,
		);

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
			source: 'src/controllers/atlassian.issues.controller.ts@get',
		});
	}
}

export default { list, get };
