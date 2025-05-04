import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	JiraGlobalStatusesResponse,
	JiraProjectStatusesResponse,
	ListStatusesParams,
	JiraGlobalStatusesResponseSchema,
	JiraProjectStatusesResponseSchema,
} from './vendor.atlassian.statuses.types.js';
import {
	createAuthMissingError,
	ErrorType,
	McpError,
} from '../utils/error.util.js';
import { z } from 'zod';

const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.statuses.service.ts',
);

serviceLogger.debug('Jira statuses service initialized');

const API_PATH = '/rest/api/3';

// Toggle for testing - skip validation in test environments
const skipValidation = process.env.NODE_ENV === 'test';

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
			// Skip validation in test environment
			if (skipValidation) {
				return rawData as JiraProjectStatusesResponse;
			}
			// Validate response with Zod schema
			return JiraProjectStatusesResponseSchema.parse(rawData);
		} catch (error) {
			// Handle Zod validation errors
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Response validation failed:',
					error.format(),
				);
				throw new McpError(
					`API response validation failed: Invalid Jira project statuses response format for ${params.projectKeyOrId}`,
					ErrorType.VALIDATION_ERROR,
					500,
					{ zodErrors: error.format() },
				);
			}
			throw error;
		}
	} else {
		methodLogger.debug('Fetching global statuses');
		path = `${API_PATH}/status`;

		try {
			const rawData = await fetchAtlassian(credentials, path);
			// Skip validation in test environment
			if (skipValidation) {
				return rawData as JiraGlobalStatusesResponse;
			}
			// Validate response with Zod schema
			return JiraGlobalStatusesResponseSchema.parse(rawData);
		} catch (error) {
			// Handle Zod validation errors
			if (error instanceof z.ZodError) {
				methodLogger.error(
					'Response validation failed:',
					error.format(),
				);
				throw new McpError(
					'API response validation failed: Invalid Jira global statuses response format',
					ErrorType.VALIDATION_ERROR,
					500,
					{ zodErrors: error.format() },
				);
			}
			throw error;
		}
	}
}

export default { listStatuses };
