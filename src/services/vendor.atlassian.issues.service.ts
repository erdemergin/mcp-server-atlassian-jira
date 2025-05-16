import { Logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	Issue,
	IssuesResponse,
	SearchIssuesParams,
	GetIssueByIdParams,
	IssueSchema,
	IssuesResponseSchema,
	PageOfComments,
	PageOfCommentsSchema,
	IssueCommentSchema,
	ListCommentsParams,
	AddCommentParams,
} from './vendor.atlassian.issues.types.js';
import {
	createAuthMissingError,
	createApiError,
	McpError,
} from '../utils/error.util.js';
import { z } from 'zod';

// Create a contextualized logger for this file
const serviceLogger = Logger.forContext(
	'services/vendor.atlassian.issues.service.ts',
);

// Log service initialization
serviceLogger.debug('Jira issues service initialized');

/**
 * Base API path for Jira REST API v3
 * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
 * @constant {string}
 */
const API_PATH = '/rest/api/3';

// Toggle for testing - skip validation in test environments
const skipValidation = process.env.NODE_ENV === 'test';

/**
 * @namespace VendorAtlassianIssuesService
 * @description Service for interacting with Jira Issues API.
 * Provides methods for searching issues and retrieving issue details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * Validates API response against a Zod schema
 * @param data The data to validate
 * @param schema The Zod schema to validate against
 * @param context Context for error messages (e.g., "issue details", "issue list")
 * @returns The validated data
 * @throws {McpError} If validation fails
 */
function validateResponse<T, S>(
	data: unknown,
	schema: z.ZodType<T, z.ZodTypeDef, S>,
	context: string,
): T {
	// Skip validation in test environment if the flag is set
	if (skipValidation) {
		return data as T;
	}

	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			serviceLogger.error(
				`Response validation failed for ${context}:`,
				error.format(),
			);
			throw createApiError(
				`API response validation failed: Invalid Jira ${context} format`,
				500,
				{ zodErrors: error.format() },
			);
		}
		throw error; // Re-throw if it's not a Zod error
	}
}

/**
 * Search for Jira issues using JQL and other criteria
 *
 * Retrieves a list of issues from Jira based on JQL query and other
 * search parameters. Supports pagination, field selection, and expansion.
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {SearchIssuesParams} [params={}] - Optional parameters for customizing the search
 * @param {string} [params.jql] - JQL query string for filtering issues
 * @param {number} [params.startAt] - Pagination start index
 * @param {number} [params.maxResults] - Maximum number of results to return
 * @param {string[]} [params.fields] - Issue fields to include in response
 * @param {string[]} [params.expand] - Issue data to expand in response
 * @param {boolean} [params.validateQuery] - Whether to validate the JQL query
 * @param {string[]} [params.properties] - Issue properties to include in response
 * @param {boolean} [params.fieldsByKeys] - Whether to use field keys instead of IDs
 * @param {string} [params.nextPageToken] - Token for retrieving next page of results
 * @param {boolean} [params.reconcileIssues] - Whether to reconcile issue data
 * @returns {Promise<IssuesResponse>} Promise containing the issues search response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Search for issues with pagination
 * const response = await search({
 *   jql: "project = ABC AND status = 'In Progress'",
 *   maxResults: 10
 * });
 */
async function search(
	params: SearchIssuesParams = {},
): Promise<IssuesResponse> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.issues.service.ts',
		'search',
	);
	methodLogger.debug('Searching Jira issues with params:', params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials required to search issues',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// JQL and validation
	if (params.jql) {
		queryParams.set('jql', params.jql);
	}
	if (params.validateQuery !== undefined) {
		queryParams.set('validateQuery', params.validateQuery.toString());
	}

	// Pagination
	if (params.startAt !== undefined) {
		queryParams.set('startAt', params.startAt.toString());
	}
	if (params.maxResults !== undefined) {
		queryParams.set('maxResults', params.maxResults.toString());
	}
	if (params.nextPageToken) {
		queryParams.set('nextPageToken', params.nextPageToken);
	}

	// Field selection and expansion
	if (params.fields?.length) {
		queryParams.set('fields', params.fields.join(','));
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}
	if (params.properties?.length) {
		queryParams.set('properties', params.properties.join(','));
	}
	if (params.fieldsByKeys !== undefined) {
		queryParams.set('fieldsByKeys', params.fieldsByKeys.toString());
	}
	if (params.reconcileIssues !== undefined) {
		queryParams.set('reconcileIssues', params.reconcileIssues.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/search${queryString}`;

	methodLogger.debug(`Calling Jira API: ${path}`);

	try {
		const rawData = await fetchAtlassian(credentials, path);
		return validateResponse(rawData, IssuesResponseSchema, 'issues search');
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error('Unexpected error searching issues:', error);
		throw createApiError(
			`Unexpected error searching Jira issues: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

/**
 * Get detailed information about a specific Jira issue
 *
 * Retrieves comprehensive details about a single issue, including metadata,
 * description, comments, and more.
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {string} idOrKey - The ID or key of the issue to retrieve
 * @param {GetIssueByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string[]} [params.fields] - Issue fields to include in response
 * @param {string[]} [params.expand] - Issue data to expand in response
 * @param {string[]} [params.properties] - Issue properties to include in response
 * @param {boolean} [params.fieldsByKeys] - Whether to use field keys instead of IDs
 * @param {boolean} [params.updateHistory] - Whether to update issue view history
 * @returns {Promise<Issue>} Promise containing the detailed issue information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get issue details with expanded changelog
 * const issue = await get('ABC-123', {
 *   expand: ['changelog']
 * });
 */
async function get(
	idOrKey: string,
	params: GetIssueByIdParams = {},
): Promise<Issue> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.issues.service.ts',
		'get',
	);
	methodLogger.debug(
		`Getting Jira issue with ID/key: ${idOrKey}, params:`,
		params,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			`Atlassian credentials required to get issue ${idOrKey}`,
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Field selection and expansion
	if (params.fields?.length) {
		queryParams.set('fields', params.fields.join(','));
	}
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}
	if (params.properties?.length) {
		queryParams.set('properties', params.properties.join(','));
	}
	if (params.fieldsByKeys !== undefined) {
		queryParams.set('fieldsByKeys', params.fieldsByKeys.toString());
	}
	if (params.updateHistory !== undefined) {
		queryParams.set('updateHistory', params.updateHistory.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/issue/${idOrKey}${queryString}`;

	methodLogger.debug(`Calling Jira API: ${path}`);

	try {
		const rawData = await fetchAtlassian(credentials, path);
		return validateResponse(
			rawData,
			IssueSchema,
			`issue detail ${idOrKey}`,
		);
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error(`Unexpected error getting issue ${idOrKey}:`, error);
		throw createApiError(
			`Unexpected error retrieving Jira issue ${idOrKey}: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

/**
 * Get comments for a specific Jira issue
 *
 * Retrieves the list of comments for an issue with pagination support.
 * Can be sorted and expanded as needed.
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {string} issueIdOrKey - The ID or key of the issue to get comments for
 * @param {ListCommentsParams} [params={}] - Optional parameters for customizing the response
 * @param {number} [params.startAt] - Pagination start index
 * @param {number} [params.maxResults] - Maximum number of results to return
 * @param {string} [params.orderBy] - Field and direction to order results by
 * @param {string[]} [params.expand] - Comment data to expand in response (e.g., 'renderedBody')
 * @returns {Promise<PageOfComments>} Promise containing the comments with pagination information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get comments for an issue with pagination
 * const comments = await getComments('ABC-123', {
 *   maxResults: 10,
 *   expand: ['renderedBody']
 * });
 */
async function getComments(
	issueIdOrKey: string,
	params: ListCommentsParams = {},
): Promise<PageOfComments> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.issues.service.ts',
		'getComments',
	);
	methodLogger.debug(
		`Getting comments for issue ${issueIdOrKey} with params:`,
		params,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			`Atlassian credentials required to get comments for issue ${issueIdOrKey}`,
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Pagination
	if (params.startAt !== undefined) {
		queryParams.set('startAt', params.startAt.toString());
	}
	if (params.maxResults !== undefined) {
		queryParams.set('maxResults', params.maxResults.toString());
	}

	// Sorting
	if (params.orderBy) {
		queryParams.set('orderBy', params.orderBy);
	}

	// Expansion
	if (params.expand?.length) {
		queryParams.set('expand', params.expand.join(','));
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/issue/${issueIdOrKey}/comment${queryString}`;

	methodLogger.debug(`Calling Jira API: ${path}`);

	try {
		const rawData = await fetchAtlassian(credentials, path);
		return validateResponse(
			rawData,
			PageOfCommentsSchema,
			`issue comments ${issueIdOrKey}`,
		);
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error(
			`Unexpected error getting comments for issue ${issueIdOrKey}:`,
			error,
		);
		throw createApiError(
			`Unexpected error retrieving comments for Jira issue ${issueIdOrKey}: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

/**
 * Add a comment to a specific Jira issue
 *
 * Creates a new comment on the specified issue with the provided content.
 * The comment body must be provided in Atlassian Document Format (ADF).
 *
 * @async
 * @memberof VendorAtlassianIssuesService
 * @param {string} issueIdOrKey - The ID or key of the issue to add a comment to
 * @param {AddCommentParams} commentData - Parameters for the comment to add
 * @returns {Promise<z.infer<typeof IssueCommentSchema>>} Promise containing the created comment information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Add a comment with ADF content
 * const comment = await addComment('ABC-123', {
 *   body: {
 *     version: 1,
 *     type: "doc",
 *     content: [
 *       {
 *         type: "paragraph",
 *         content: [
 *           {
 *             type: "text",
 *             text: "This is a test comment"
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * });
 */
async function addComment(
	issueIdOrKey: string,
	commentData: AddCommentParams,
): Promise<z.infer<typeof IssueCommentSchema>> {
	const methodLogger = Logger.forContext(
		'services/vendor.atlassian.issues.service.ts',
		'addComment',
	);

	try {
		methodLogger.debug('Adding comment to issue', issueIdOrKey, {
			bodyProvided: !!commentData.body,
		});

		// Get configured credentials
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw createAuthMissingError(
				`Atlassian credentials required to add comment to issue ${issueIdOrKey}`,
			);
		}

		// Build API endpoint
		const apiEndpoint = `${API_PATH}/issue/${issueIdOrKey}/comment`;

		// Add expand parameter for rendered content
		const queryParams = new URLSearchParams();
		if (commentData.expand?.length) {
			queryParams.append('expand', commentData.expand.join(','));
		}

		// Prepare request URL and options
		const url = `${apiEndpoint}${
			queryParams.toString() ? `?${queryParams.toString()}` : ''
		}`;

		// Prepare request body - using the structure that works with Jira API
		// The body should be an object containing the ADF document
		const requestBody = {
			body: commentData.body,
			// Optional fields that may be added later
			...(commentData.visibility
				? { visibility: commentData.visibility }
				: {}),
		};

		methodLogger.debug('Calling Jira API:', url);

		// Make the API call - note the correct parameter order
		const response = await fetchAtlassian(credentials, url, {
			method: 'POST',
			body: requestBody,
		});

		return validateResponse(
			response,
			IssueCommentSchema,
			`comment creation on issue ${issueIdOrKey}`,
		);
	} catch (error) {
		// McpError is already properly structured from fetchAtlassian or validation
		if (error instanceof McpError) {
			throw error;
		}

		// Unexpected errors need to be wrapped
		methodLogger.error(
			`Unexpected error adding comment to issue ${issueIdOrKey}:`,
			error,
		);
		throw createApiError(
			`Unexpected error adding comment to Jira issue ${issueIdOrKey}: ${error instanceof Error ? error.message : String(error)}`,
			500,
			error,
		);
	}
}

export default { search, get, getComments, addComment };
