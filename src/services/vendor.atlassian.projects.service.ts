import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	ProjectDetailed,
	ProjectsResponse,
	ListProjectsParams,
	GetProjectByIdParams,
	ProjectDetailedSchema,
	ProjectsResponseSchema,
} from './vendor.atlassian.projects.types.js';
import {
	createAuthMissingError,
	ErrorType,
	McpError,
} from '../utils/error.util.js';
import { validateResponse } from '../utils/validation.util.js';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.projects.service.ts',
);

// Log service initialization
serviceLogger.debug('Jira projects service initialized');

/**
 * Base API path for Jira REST API v3
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 * @constant {string}
 */
const API_PATH = '/rest/api/3';

/**
 * @namespace VendorAtlassianProjectsService
 * @description Service for interacting with Jira Projects API.
 * Provides methods for listing projects and retrieving project details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List Jira projects with optional filtering and pagination
 *
 * Retrieves a list of projects from Jira with support for various filters
 * and pagination options. Projects can be filtered by IDs, keys, query, etc.
 *
 * @async
 * @memberof VendorAtlassianProjectsService
 * @param {ListProjectsParams} [params={}] - Optional parameters for customizing the request
 * @param {string[]} [params.ids] - Filter by project IDs
 * @param {string[]} [params.keys] - Filter by project keys
 * @param {string} [params.query] - Filter by project name or key
 * @param {string} [params.typeKey] - Filter by project type
 * @param {string} [params.categoryId] - Filter by project category ID
 * @param {string} [params.action] - Filter by user action
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {string[]} [params.status] - Filter by project status
 * @param {string} [params.orderBy] - Sort order for results
 * @param {number} [params.startAt] - Pagination start index
 * @param {number} [params.maxResults] - Maximum number of results to return
 * @returns {Promise<ProjectsResponse>} Promise containing the projects response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // List projects with pagination
 * const response = await list({
 *   maxResults: 10,
 *   orderBy: 'key'
 * });
 */
async function list(
	params: ListProjectsParams = {},
): Promise<ProjectsResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.projects.service.ts',
		'list',
	);
	methodLogger.debug('Listing Jira projects with params:', params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError('List projects');
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Project identifiers
	if (params.ids?.length) {
		queryParams.set('id', params.ids.join(','));
	}
	if (params.keys?.length) {
		queryParams.set('keys', params.keys.join(','));
	}

	// Filtering
	if (params.query) {
		queryParams.set('query', params.query);
	}
	if (params.typeKey) {
		queryParams.set('typeKey', params.typeKey);
	}
	if (params.categoryId) {
		queryParams.set('categoryId', params.categoryId);
	}
	if (params.action) {
		queryParams.set('action', params.action);
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}
	if (params.status?.length) {
		queryParams.set('status', params.status.join(','));
	}

	// Sorting
	if (params.orderBy) {
		queryParams.set('orderBy', params.orderBy);
	}

	// Pagination
	if (params.startAt !== undefined) {
		queryParams.set('startAt', params.startAt.toString());
	}
	if (params.maxResults !== undefined) {
		queryParams.set('maxResults', params.maxResults.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/project/search${queryString}`;

	methodLogger.debug(`Calling Jira API: ${path}`);

	try {
		const rawData = await fetchAtlassian(credentials, path);
		return validateResponse(
			rawData,
			ProjectsResponseSchema,
			'projects list',
			'projects.service',
		);
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error('Unexpected error listing projects:', error);
		throw new McpError(
			`Unexpected error listing Jira projects: ${error instanceof Error ? error.message : String(error)}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			error,
		);
	}
}

/**
 * Get detailed information about a specific Jira project
 *
 * Retrieves comprehensive details about a single project, including metadata,
 * description, and optional components like versions, components, and properties.
 *
 * @async
 * @memberof VendorAtlassianProjectsService
 * @param {string} idOrKey - The ID or key of the project to retrieve
 * @param {GetProjectByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string[]} [params.expand] - Fields to expand in the response
 * @param {boolean} [params.includeComponents] - Include project components
 * @param {boolean} [params.includeVersions] - Include project versions
 * @param {boolean} [params.includeProperties] - Include project properties
 * @returns {Promise<ProjectDetailed>} Promise containing the detailed project information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get project details with components and versions
 * const project = await get('ABC', {
 *   includeComponents: true,
 *   includeVersions: true
 * });
 */
async function get(
	idOrKey: string,
	params: GetProjectByIdParams = {},
): Promise<ProjectDetailed> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.projects.service.ts',
		'get',
	);
	methodLogger.debug(
		`Getting Jira project with ID/key: ${idOrKey}, params:`,
		params,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(`Get project ${idOrKey}`);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Build expand parameter
	const expandItems: string[] = params.expand || [];
	if (params.includeComponents) {
		expandItems.push('components');
	}
	if (params.includeVersions) {
		expandItems.push('versions');
	}
	if (params.includeProperties) {
		expandItems.push('properties');
	}

	if (expandItems.length > 0) {
		queryParams.set('expand', expandItems.join(','));
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/project/${idOrKey}${queryString}`;

	methodLogger.debug(`Calling Jira API: ${path}`);

	try {
		const rawData = await fetchAtlassian(credentials, path);
		return validateResponse(
			rawData,
			ProjectDetailedSchema,
			`project ${idOrKey}`,
			'projects.service',
		);
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error(
			`Unexpected error getting project ${idOrKey}:`,
			error,
		);
		throw new McpError(
			`Unexpected error retrieving Jira project ${idOrKey}: ${error instanceof Error ? error.message : String(error)}`,
			ErrorType.UNEXPECTED_ERROR,
			500,
			error,
		);
	}
}

export default { list, get };
