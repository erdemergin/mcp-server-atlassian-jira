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
	ErrorType,
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
		throw createAuthMissingError('Search issues');
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
		// Skip validation in test environment
		if (skipValidation) {
			return rawData as IssuesResponse;
		}
		// Validate response with Zod schema
		return IssuesResponseSchema.parse(rawData);
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			methodLogger.error('Response validation failed:', error.format());
			throw new McpError(
				'API response validation failed: Invalid Jira issues response format',
				ErrorType.VALIDATION_ERROR,
				500,
				{ zodErrors: error.format() },
			);
		}
		throw error;
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
		throw createAuthMissingError(`Get issue ${idOrKey}`);
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
		// Skip validation in test environment
		if (skipValidation) {
			return rawData as Issue;
		}
		// Validate response with Zod schema
		return IssueSchema.parse(rawData);
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			methodLogger.error('Response validation failed:', error.format());
			throw new McpError(
				`API response validation failed: Invalid Jira issue detail response format for ${idOrKey}`,
				ErrorType.VALIDATION_ERROR,
				500,
				{ zodErrors: error.format() },
			);
		}
		throw error;
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
		throw createAuthMissingError(`Get comments for issue ${issueIdOrKey}`);
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
		// Skip validation in test environment
		if (skipValidation) {
			return rawData as PageOfComments;
		}
		// Validate response with Zod schema
		return PageOfCommentsSchema.parse(rawData);
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			methodLogger.error('Response validation failed:', error.format());
			throw new McpError(
				`API response validation failed: Invalid Jira comments response format for issue ${issueIdOrKey}`,
				ErrorType.VALIDATION_ERROR,
				500,
				{ zodErrors: error.format() },
			);
		}
		throw error;
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
			throw createAuthMissingError('Add comment to issue');
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

		// Skip validation in test environment
		if (skipValidation) {
			return response as z.infer<typeof IssueCommentSchema>;
		}
		// Validate response with Zod schema
		return IssueCommentSchema.parse(response);
	} catch (error) {
		// Handle Zod validation errors
		if (error instanceof z.ZodError) {
			methodLogger.error('Response validation failed:', error.format());
			throw new McpError(
				`API response validation failed: Invalid Jira comment creation response format for issue ${issueIdOrKey}`,
				ErrorType.VALIDATION_ERROR,
				500,
				{ zodErrors: error.format() },
			);
		}
		throw error;
	}
}

export default { search, get, getComments, addComment };
