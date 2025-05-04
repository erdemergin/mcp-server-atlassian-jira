import atlassianStatusesService from '../services/vendor.atlassian.statuses.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { ListStatusesToolArgsType } from '../tools/atlassian.statuses.types.js';
import { formatStatusesList } from './atlassian.statuses.formatter.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	JiraStatusDetail,
	JiraGlobalStatusesResponse,
	JiraProjectStatusesResponse,
} from '../services/vendor.atlassian.statuses.types.js';

const controllerLogger = Logger.forContext(
	'controllers/atlassian.statuses.controller.ts',
);
controllerLogger.debug('Jira statuses controller initialized');

/**
 * List Jira statuses, optionally filtering by project.
 *
 * Handles fetching statuses either globally or for a specific project,
 * processing the potentially different API responses, and formatting the result.
 *
 * @param {ListStatusesToolArgsType} options - Options including optional projectKeyOrId.
 * @returns {Promise<ControllerResponse>} Formatted list of statuses.
 */
async function listStatuses(
	options: ListStatusesToolArgsType = {},
): Promise<ControllerResponse> {
	const methodLogger = controllerLogger.forMethod('listStatuses');
	methodLogger.debug('Listing Jira statuses...', options);

	try {
		const rawResponse =
			await atlassianStatusesService.listStatuses(options);

		let uniqueStatuses: JiraStatusDetail[] = [];

		if (options.projectKeyOrId) {
			// Handle project-specific response (array of issue types with nested statuses)
			methodLogger.debug('Processing project-specific status response');
			const projectResponse = rawResponse as JiraProjectStatusesResponse;
			const statusMap = new Map<string, JiraStatusDetail>();

			projectResponse.forEach((issueType) => {
				issueType.statuses.forEach((status) => {
					if (!statusMap.has(status.id)) {
						statusMap.set(status.id, status);
					}
				});
			});
			uniqueStatuses = Array.from(statusMap.values());
			methodLogger.debug(
				`Found ${uniqueStatuses.length} unique statuses for project`,
			);
		} else {
			// Handle global response (simple array of statuses)
			methodLogger.debug('Processing global status response');
			uniqueStatuses = rawResponse as JiraGlobalStatusesResponse;
			methodLogger.debug(
				`Found ${uniqueStatuses.length} global statuses`,
			);
		}

		// Sort statuses alphabetically by name for consistent output
		uniqueStatuses.sort((a, b) => a.name.localeCompare(b.name));

		// Format the unique statuses
		const formattedContent = formatStatusesList(
			uniqueStatuses,
			options.projectKeyOrId,
		);

		return {
			content: formattedContent,
			// Pagination is not typically supported/needed for status lists
		};
	} catch (error) {
		throw handleControllerError(error, {
			entityType: 'Statuses',
			operation: 'listing',
			source: 'controllers/atlassian.statuses.controller.ts@listStatuses',
			additionalInfo: options as unknown as Record<string, unknown>,
		});
	}
}

export default { listStatuses };
