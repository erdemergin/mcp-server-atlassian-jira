import { Logger } from './logger.util.js';

/**
 * Error types for classification
 */
export enum ErrorType {
	AUTH_MISSING = 'AUTH_MISSING',
	AUTH_INVALID = 'AUTH_INVALID',
	API_ERROR = 'API_ERROR',
	UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Custom error class with type classification
 */
export class McpError extends Error {
	type: ErrorType;
	statusCode?: number;
	originalError?: unknown;

	constructor(
		message: string,
		type: ErrorType,
		statusCode?: number,
		originalError?: unknown,
	) {
		super(message);
		this.name = 'McpError';
		this.type = type;
		this.statusCode = statusCode;
		this.originalError = originalError;
	}
}

/**
 * Create an authentication missing error
 */
export function createAuthMissingError(
	message: string = 'Authentication credentials are missing',
): McpError {
	return new McpError(message, ErrorType.AUTH_MISSING);
}

/**
 * Create an authentication invalid error
 */
export function createAuthInvalidError(
	message: string = 'Authentication credentials are invalid',
): McpError {
	return new McpError(message, ErrorType.AUTH_INVALID, 401);
}

/**
 * Create an API error
 */
export function createApiError(
	message: string,
	statusCode?: number,
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.API_ERROR,
		statusCode,
		originalError,
	);
}

/**
 * Create an unexpected error
 */
export function createUnexpectedError(
	message: string = 'An unexpected error occurred',
	originalError?: unknown,
): McpError {
	return new McpError(
		message,
		ErrorType.UNEXPECTED_ERROR,
		undefined,
		originalError,
	);
}

/**
 * Ensure an error is an McpError
 */
export function ensureMcpError(error: unknown): McpError {
	if (error instanceof McpError) {
		return error;
	}

	if (error instanceof Error) {
		return createUnexpectedError(error.message, error);
	}

	return createUnexpectedError(String(error));
}

/**
 * Helper to find the actual API error body potentially nested in McpErrors
 * Tries to parse the innermost originalError if it's a string.
 */
function getApiErrorBody(error: unknown): Record<string, unknown> | null {
	if (error instanceof McpError) {
		let potentialBody: unknown = null;
		// Check if nested McpError contains the API body info
		if (error.originalError instanceof McpError) {
			potentialBody = error.originalError.originalError;
		}
		// Check if the direct originalError has the API body info
		else if (error.type === ErrorType.API_ERROR) {
			potentialBody = error.originalError;
		}

		// Check if the potential body is an object already
		if (potentialBody && typeof potentialBody === 'object') {
			return potentialBody as Record<string, unknown>;
		}
		// Check if the potential body is a string that needs parsing
		else if (potentialBody && typeof potentialBody === 'string') {
			try {
				const parsedBody = JSON.parse(potentialBody);
				if (parsedBody && typeof parsedBody === 'object') {
					return parsedBody as Record<string, unknown>;
				}
			} catch {
				// Ignore parsing errors, return null below
				Logger.forContext(
					'utils/error.util.ts',
					'getApiErrorBody',
				).warn('Failed to parse originalError string as JSON');
			}
		}
	}
	return null;
}

/**
 * Format error for MCP tool response
 */
export function formatErrorForMcpTool(error: unknown): {
	content: Array<{ type: 'text'; text: string }>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpTool',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	let errorMessage = `Error: ${mcpError.message}`;
	const apiErrorBody = getApiErrorBody(mcpError);

	// Attempt to extract specific API error messages for JQL errors
	if (
		mcpError.statusCode === 400 &&
		apiErrorBody &&
		'errorMessages' in apiErrorBody &&
		Array.isArray(apiErrorBody.errorMessages) &&
		apiErrorBody.errorMessages.length > 0
	) {
		try {
			const apiMessages = apiErrorBody.errorMessages
				.map((msg) => String(msg))
				.join('\n');
			errorMessage = `Error: Invalid JQL Query.\n${apiMessages}`;
		} catch {
			methodLogger.warn('Could not parse specific API error messages');
		}
	}

	return {
		content: [
			{
				type: 'text' as const,
				text: errorMessage,
			},
		],
	};
}

/**
 * Format error for MCP resource response
 */
export function formatErrorForMcpResource(
	error: unknown,
	uri: string,
): {
	contents: Array<{
		uri: string;
		text: string;
		mimeType: string;
		description?: string;
	}>;
} {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'formatErrorForMcpResource',
	);
	const mcpError = ensureMcpError(error);

	methodLogger.error(`${mcpError.type} error`, mcpError);

	return {
		contents: [
			{
				uri,
				text: `Error: ${mcpError.message}`,
				mimeType: 'text/plain',
				description: `Error: ${mcpError.type}`,
			},
		],
	};
}

/**
 * Handle error in CLI context
 * @param error The error to handle
 * @param source Optional source information for better error messages
 */
export function handleCliError(error: unknown, source?: string): never {
	const methodLogger = Logger.forContext(
		'utils/error.util.ts',
		'handleCliError',
	);
	const mcpError = ensureMcpError(error);

	// Log detailed information at different levels based on error type
	if (mcpError.statusCode && mcpError.statusCode >= 500) {
		methodLogger.error(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
			stack: mcpError.stack,
		});
	} else {
		methodLogger.warn(`${mcpError.type} error occurred`, {
			message: mcpError.message,
			statusCode: mcpError.statusCode,
			source,
		});
	}

	// Log additional debug information if DEBUG is enabled
	methodLogger.debug('Error details', {
		type: mcpError.type,
		statusCode: mcpError.statusCode,
		originalError: mcpError.originalError,
		stack: mcpError.stack,
	});

	// Display user-friendly message to console
	let cliErrorMessage = `Error: ${mcpError.message}`;
	let cliApiErrorBody = getApiErrorBody(mcpError);

	// Check if the original API error details are nested or direct
	if (mcpError.originalError instanceof McpError) {
		if (
			mcpError.originalError.type === ErrorType.API_ERROR &&
			mcpError.originalError.originalError &&
			typeof mcpError.originalError.originalError === 'object'
		) {
			cliApiErrorBody = mcpError.originalError.originalError as Record<
				string,
				unknown
			>;
		}
	} else if (
		mcpError.type === ErrorType.API_ERROR &&
		mcpError.originalError &&
		typeof mcpError.originalError === 'object'
	) {
		cliApiErrorBody = mcpError.originalError as Record<string, unknown>;
	}

	// Attempt to extract specific API error messages for JQL errors
	if (
		mcpError.statusCode === 400 &&
		cliApiErrorBody &&
		'errorMessages' in cliApiErrorBody &&
		Array.isArray(cliApiErrorBody.errorMessages) &&
		cliApiErrorBody.errorMessages.length > 0
	) {
		try {
			const apiMessages = cliApiErrorBody.errorMessages
				.map((msg) => String(msg))
				.join('\n');
			cliErrorMessage = `Error: Invalid JQL Query (Status 400).\n${apiMessages}`;
		} catch {
			methodLogger.warn(
				'Could not parse specific API error messages for CLI',
			);
		}
	}

	console.error(cliErrorMessage);
	process.exit(1);
}
