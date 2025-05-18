import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { applyDefaults, DEFAULT_PAGE_SIZE } from '../utils/defaults.util.js';
import { ControllerResponse } from '../types/common.types.js';
import { ListIssuesToolArgsType } from '../tools/atlassian.issues.types.js';

import atlassianIssuesController from './atlassian.issues.controller.js';

/**
 * Search for Jira issues using JQL
 *
 * @param {ListIssuesToolArgsType} options - Options for the search
 * @returns {Promise<ControllerResponse>} Formatted search results in Markdown
 */
async function search(
	options: ListIssuesToolArgsType = {},
): Promise<ControllerResponse> {
	const controllerLogger = Logger.forContext(
		'controllers/atlassian.search.controller.ts',
		'search',
	);
	controllerLogger.debug('Searching Jira content with options:', options);

	try {
		// Apply defaults to options
		const mergedOptions = applyDefaults<ListIssuesToolArgsType>(options, {
			limit: DEFAULT_PAGE_SIZE,
			jql: '',
			startAt: 0,
			projectKeyOrId: '',
			statuses: [],
			orderBy: '',
		});

		// Search issues using the issues controller
		const result = await atlassianIssuesController.list({
			jql: mergedOptions.jql,
			limit: mergedOptions.limit,
			startAt: mergedOptions.startAt,
			projectKeyOrId: mergedOptions.projectKeyOrId,
			statuses: mergedOptions.statuses,
			orderBy: mergedOptions.orderBy,
		});

		// Format the search results
		// Note: result.content from issues controller already includes JQL and pagination info
		const formattedContent = `# Jira Search Results\n\n${result.content}`;

		controllerLogger.debug(
			'Successfully retrieved and formatted search results',
		);

		return {
			content: formattedContent,
		};
	} catch (error) {
		return handleControllerError(error, {
			source: 'Jira',
			operation: 'search',
			entityType: 'issues',
		});
	}
}

export default {
	search,
};
