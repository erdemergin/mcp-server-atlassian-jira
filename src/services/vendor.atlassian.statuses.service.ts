import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	JiraGlobalStatusesResponse,
	JiraProjectStatusesResponse,
	ListStatusesParams,
} from './vendor.atlassian.statuses.types.js';
import { createAuthMissingError } from '../utils/error.util.js';

const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.statuses.service.ts',
);

serviceLogger.debug('Jira statuses service initialized');

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
		// This endpoint returns JiraProjectStatusesResponse
		return fetchAtlassian<JiraProjectStatusesResponse>(credentials, path);
	} else {
		methodLogger.debug('Fetching global statuses');
		path = `${API_PATH}/status`;
		// This endpoint returns JiraGlobalStatusesResponse
		return fetchAtlassian<JiraGlobalStatusesResponse>(credentials, path);
	}
}

export default { listStatuses };
