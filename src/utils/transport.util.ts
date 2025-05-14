import { Logger } from './logger.util.js';
import { config } from './config.util.js';
import {
	createAuthInvalidError,
	createApiError,
	createUnexpectedError,
	McpError,
} from './error.util.js';

// Create a contextualized logger for this file
const transportLogger = Logger.forContext('utils/transport.util.ts');

// Log transport utility initialization
transportLogger.debug('Transport utility initialized');

/**
 * Interface for Atlassian API credentials
 */
export interface AtlassianCredentials {
	siteName: string;
	userEmail: string;
	apiToken: string;
}

/**
 * Interface for HTTP request options
 */
export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: unknown;
}

/**
 * Get Atlassian credentials from environment variables
 * @returns AtlassianCredentials object or null if credentials are missing
 */
export function getAtlassianCredentials(): AtlassianCredentials | null {
	const methodLogger = Logger.forContext(
		'utils/transport.util.ts',
		'getAtlassianCredentials',
	);

	const siteName = config.get('ATLASSIAN_SITE_NAME');
	const userEmail = config.get('ATLASSIAN_USER_EMAIL');
	const apiToken = config.get('ATLASSIAN_API_TOKEN');

	if (!siteName || !userEmail || !apiToken) {
		methodLogger.warn(
			'Missing Atlassian credentials. Please set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables.',
		);
		return null;
	}

	methodLogger.debug('Using Atlassian credentials');
	return {
		siteName,
		userEmail,
		apiToken,
	};
}

/**
 * Fetch data from Atlassian API
 * @param credentials Atlassian API credentials
 * @param path API endpoint path (without base URL)
 * @param options Request options
 * @returns Response data
 */
export async function fetchAtlassian<T>(
	credentials: AtlassianCredentials,
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const methodLogger = Logger.forContext(
		'utils/transport.util.ts',
		'fetchAtlassian',
	);

	const { siteName, userEmail, apiToken } = credentials;

	// Ensure path starts with a slash
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	// Construct the full URL
	const baseUrl = `https://${siteName}.atlassian.net`;
	const url = `${baseUrl}${normalizedPath}`;

	// Set up authentication and headers
	const headers = {
		Authorization: `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`,
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...options.headers,
	};

	// Prepare request options
	const requestOptions: RequestInit = {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	};

	methodLogger.debug(`Calling Atlassian API: ${url}`);

	try {
		const response = await fetch(url, requestOptions);

		// Log the raw response status and headers
		methodLogger.debug(
			`Raw response received: ${response.status} ${response.statusText}`,
			{
				url,
				status: response.status,
				statusText: response.statusText,
				// Just log a simplified representation of headers
				headers: {
					contentType: response.headers.get('content-type'),
					contentLength: response.headers.get('content-length'),
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			methodLogger.error(
				`API error: ${response.status} ${response.statusText}`,
				errorText,
			);

			// Try to parse the error response - handle Jira-specific error formats
			let errorMessage = `${response.status} ${response.statusText}`;
			let parsedError = null;

			try {
				if (
					errorText &&
					(errorText.startsWith('{') || errorText.startsWith('['))
				) {
					parsedError = JSON.parse(errorText);

					// Jira-specific error format: errorMessages array
					if (
						parsedError.errorMessages &&
						Array.isArray(parsedError.errorMessages) &&
						parsedError.errorMessages.length > 0
					) {
						// Format: {"errorMessages":["Issue does not exist or you do not have permission to see it."],"errors":{}}
						errorMessage = parsedError.errorMessages.join('; ');
					}
					// Jira-specific error format: errors object with field-specific errors
					else if (
						parsedError.errors &&
						typeof parsedError.errors === 'object' &&
						Object.keys(parsedError.errors).length > 0
					) {
						// Format: { "errors": { "jql": "The JQL query is invalid." }, "errorMessages": [], "warningMessages": [] }
						errorMessage = Object.entries(parsedError.errors)
							.map(([key, value]) => `${key}: ${value}`)
							.join('; ');
					}
					// Generic Atlassian API error with a message field
					else if (parsedError.message) {
						// Format: {"message":"Some error message"}
						errorMessage = parsedError.message;
					}
					// Other Atlassian API error formats (generic)
					else if (
						parsedError.errors &&
						Array.isArray(parsedError.errors) &&
						parsedError.errors.length > 0
					) {
						// Format: {"errors":[{"status":400,"code":"INVALID_REQUEST_PARAMETER","title":"..."}]}
						const atlassianError = parsedError.errors[0];
						if (atlassianError.title) {
							errorMessage = atlassianError.title;
						}
					}
				}
			} catch (parseError) {
				methodLogger.debug(`Error parsing error response:`, parseError);
				// Fall back to the default error message
			}

			// Classify HTTP errors based on status code
			if (response.status === 401 || response.status === 403) {
				throw createAuthInvalidError(
					`Authentication failed. Jira API: ${errorMessage}`,
					errorText,
				);
			} else if (response.status === 404) {
				throw createApiError(
					`Resource not found. Jira API: ${errorMessage}`,
					404,
					errorText,
				);
			} else {
				// For other API errors, preserve the original error message from Atlassian API
				throw createApiError(
					`Jira API request failed. Detail: ${errorMessage}`,
					response.status,
					errorText,
				);
			}
		}

		// Clone the response to log its content without consuming it
		const clonedResponse = response.clone();
		const responseJson = await clonedResponse.json();
		methodLogger.debug(`Response body:`, responseJson);

		return response.json() as Promise<T>;
	} catch (error) {
		methodLogger.error(`Request failed`, error);

		// If it's already an McpError, just rethrow it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle network or parsing errors
		if (error instanceof TypeError || error instanceof SyntaxError) {
			throw createApiError(
				`Network or parsing error: ${error instanceof Error ? error.message : String(error)}`,
				500,
				error,
			);
		}

		throw createUnexpectedError(
			`Unexpected error while calling Atlassian API: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}
