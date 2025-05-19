import { Logger } from '../utils/logger.util.js';
import { DEFAULT_PAGE_SIZE, applyDefaults } from '../utils/defaults.util.js';
import { getAtlassianCredentials } from '../utils/transport.util.js';
import { createAuthMissingError, createApiError } from '../utils/error.util.js';
import {
	handleControllerError,
	buildErrorContext,
} from '../utils/error-handler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import atlassianIssuesService from '../services/vendor.atlassian.issues.service.js';
import {
	formatCommentsList,
	formatAddedCommentConfirmation,
} from './atlassian.comments.formatter.js';
import { markdownToAdf } from '../utils/adf-from-markdown.util.js';
import { textToAdf } from '../utils/adf-from-text.util.js';
import { formatPagination } from '../utils/formatter.util.js';

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.comments.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira comments controller initialized');

/**
 * List comments for a specific Jira issue
 *
 * @async
 * @param {object} options - Controller options for listing comments
 * @param {string} options.issueIdOrKey - The ID or key of the issue to get comments for
 * @param {number} [options.limit=25] - Maximum number of comments to return (1-100)
 * @param {number} [options.startAt] - Index of the first comment to return (0-based offset)
 * @param {string} [options.orderBy] - Field and direction to order results by (e.g., "created DESC")
 * @returns {Promise<ControllerResponse>} - Promise containing formatted comments list and pagination information
 * @throws {Error} - Throws standardized error if operation fails
 */
async function listComments(options: {
	issueIdOrKey: string;
	limit?: number;
	startAt?: number;
	orderBy?: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.comments.controller.ts',
		'listComments',
	);

	try {
		methodLogger.debug('Listing comments for issue', options);

		// Check if credentials exist
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw createAuthMissingError('List issue comments');
		}

		// Apply defaults for pagination
		const params = applyDefaults(options, {
			limit: DEFAULT_PAGE_SIZE,
			startAt: 0,
		}) as typeof options; // Cast back to original type to preserve optional properties

		// Extract the required parameters
		const { issueIdOrKey, limit, startAt, orderBy } = params;

		// Map controller options to service parameters
		const serviceParams = {
			startAt,
			maxResults: limit,
			orderBy,
			expand: ['renderedBody'], // Include rendered content for HTML fallback
		};

		// Call the service to get comments
		const commentsData = await atlassianIssuesService.getComments(
			issueIdOrKey,
			serviceParams,
		);

		// Extract pagination information
		const pagination = extractPaginationInfo(
			commentsData,
			PaginationType.OFFSET,
			'Issue Comments',
		);

		// Construct Jira base URL for linking
		const baseUrl = credentials
			? `https://${credentials.siteName}.atlassian.net`
			: undefined;

		// Format comments using the formatter
		const formattedContent = formatCommentsList(
			commentsData.comments,
			issueIdOrKey,
			baseUrl,
		);

		// Combine formatted content with pagination information
		let finalContent = formattedContent;
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		// Return the controller response
		return {
			content: finalContent,
		};
	} catch (error) {
		// Handle and propagate errors using standard error handler
		throw handleControllerError(
			error,
			buildErrorContext(
				'Issue Comments',
				'listing',
				'controllers/atlassian.comments.controller.ts@listComments',
				options.issueIdOrKey,
				options,
			),
		);
	}
}

/**
 * Add a comment to a Jira issue
 *
 * @async
 * @param {object} options - Controller options for adding a comment
 * @param {string} options.issueIdOrKey - The ID or key of the issue to add a comment to
 * @param {string} options.commentBody - The content of the comment to add (supports Markdown formatting)
 * @returns {Promise<ControllerResponse>} - Promise containing confirmation message
 * @throws {Error} - Throws standardized error if operation fails
 */
async function addComment(options: {
	issueIdOrKey: string;
	commentBody: string;
}): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.comments.controller.ts',
		'addComment',
	);

	try {
		methodLogger.debug('Adding comment to issue', {
			issueIdOrKey: options.issueIdOrKey,
			commentBodyLength: options.commentBody?.length || 0,
		});

		// Check if credentials exist
		const credentials = getAtlassianCredentials();
		if (!credentials) {
			throw createAuthMissingError(
				'Atlassian credentials required to add issue comment',
			);
		}

		// Extract the required parameters
		const { issueIdOrKey, commentBody } = options;

		// Validate the comment body is not empty
		if (!commentBody || commentBody.trim() === '') {
			throw createApiError('Comment body cannot be empty', 400);
		}

		// Convert markdown to ADF format with explicit error handling
		let adfBody;
		try {
			methodLogger.debug('Converting Markdown to ADF format');
			adfBody = markdownToAdf(commentBody);
		} catch (adfError) {
			methodLogger.error('ADF conversion failed:', adfError);

			// Try fallback to simple plain text conversion
			methodLogger.debug('Falling back to simple text conversion');
			try {
				adfBody = textToAdf(commentBody);
			} catch (textAdfError) {
				// If even the simple conversion fails, throw a validation error
				methodLogger.error(
					'Fallback text-to-ADF conversion failed:',
					textAdfError,
				);
				throw createApiError(
					'Failed to convert comment to Jira-compatible format. Please simplify the comment content.',
					400,
					{ originalError: adfError, fallbackError: textAdfError },
				);
			}

			// Log the fallback success
			methodLogger.info('Used text fallback for ADF conversion');
		}

		// Prepare the comment data for service
		const commentData = {
			body: adfBody,
			expand: ['renderedBody'], // Include rendered content for HTML fallback
		};

		// Call the service to add the comment
		const createdComment = await atlassianIssuesService.addComment(
			issueIdOrKey,
			commentData,
		);

		// Construct Jira base URL for linking
		const baseUrl = credentials
			? `https://${credentials.siteName}.atlassian.net`
			: undefined;

		// Format the confirmation message
		const formattedContent = formatAddedCommentConfirmation(
			createdComment,
			issueIdOrKey,
			baseUrl,
		);

		// Return the controller response
		return {
			content: formattedContent,
		};
	} catch (error) {
		// Handle and propagate errors using standard error handler
		throw handleControllerError(
			error,
			buildErrorContext(
				'Issue Comment',
				'adding',
				'controllers/atlassian.comments.controller.ts@addComment',
				options.issueIdOrKey,
				{
					commentBodyLength: options.commentBody?.length || 0,
					commentBodyPreview: options.commentBody
						? options.commentBody.length > 100
							? options.commentBody.substring(0, 100) + '...'
							: options.commentBody
						: '<empty>',
				},
			),
		);
	}
}

export default {
	listComments,
	addComment,
};
