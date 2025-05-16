import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	JiraGlobalStatusesResponse,
	JiraGlobalStatusesResponseSchema,
	JiraProjectStatusesResponse,
	JiraProjectStatusesResponseSchema,
	ListStatusesParams,
} from './vendor.atlassian.statuses.types.js';
import { createAuthMissingError, McpError } from '../utils/error.util.js';
import { validateResponse } from '../utils/validation.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.statuses.service.ts',
);

const API_PATH = '/rest/api/3';

/**
 * List available Jira statuses.
 *
 * If projectKeyOrId is provided, fetches statuses relevant to that specific project's workflows.
 * Otherwise, fetches all statuses available in the Jira instance.
 *
 * @param {ListStatusesParams} params - Parameters including optional projectKeyOrId.
 * @returns {Promise<JiraGlobalStatusesResponse | JiraProjectStatusesResponse>} Raw API response.
 * @throws {Error} If credentials are missing or API request fails.
 */
async function listStatuses(
	params: ListStatusesParams = {},
): Promise<JiraGlobalStatusesResponse | JiraProjectStatusesResponse> {
	const methodLogger = serviceLogger.forMethod('listStatuses');
	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError('List statuses');
	}

	let path: string;
	if (params.projectKeyOrId) {
		methodLogger.debug(
			`Fetching statuses for project: ${params.projectKeyOrId}`,
		);
		path = `${API_PATH}/project/${encodeURIComponent(params.projectKeyOrId)}/statuses`;

		try {
			const rawData = await fetchAtlassian(credentials, path);
			return validateResponse(
				rawData,
				JiraProjectStatusesResponseSchema,
				`project statuses for ${params.projectKeyOrId}`,
				'statuses.service',
			);
		} catch (error) {
			// McpError is already properly structured from fetchAtlassian or validation
			if (error instanceof McpError) {
				throw error;
			}

			// Unexpected errors need to be wrapped
			methodLogger.error(
				`Unexpected error fetching statuses for project ${params.projectKeyOrId}:`,
				error,
			);
			throw error;
		}
	} else {
		methodLogger.debug('Fetching global statuses');
		path = `${API_PATH}/status`;

		try {
			const rawData = await fetchAtlassian(credentials, path);
			return validateResponse(
				rawData,
				JiraGlobalStatusesResponseSchema,
				'global statuses',
				'statuses.service',
			);
		} catch (error) {
			// McpError is already properly structured from fetchAtlassian or validation
			if (error instanceof McpError) {
				throw error;
			}

			// Unexpected errors need to be wrapped
			methodLogger.error(
				'Unexpected error fetching global statuses:',
				error,
			);
			throw error;
		}
	}
}

export default { listStatuses };
