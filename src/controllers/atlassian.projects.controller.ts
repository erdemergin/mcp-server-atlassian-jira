import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/error-handler.util.js';
import { createApiError } from '../utils/error.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { ControllerResponse } from '../types/common.types.js';
import {
	GetProjectToolArgsType,
	ListProjectsToolArgsType,
} from '../tools/atlassian.projects.types.js';
import {
	formatProjectsList,
	formatProjectDetails,
} from './atlassian.projects.formatter.js';
import { formatPagination } from '../utils/formatter.util.js';
import {
	DEFAULT_PAGE_SIZE,
	applyDefaults,
	PROJECT_DEFAULTS,
} from '../utils/defaults.util.js';
import { ListProjectsParams } from '../services/vendor.atlassian.projects.types.js';

/**
 * Controller for managing Jira projects.
 * Provides functionality for listing projects and retrieving project details.
 */

// Create a contextualized logger for this file
const controllerLogger = Logger.forContext(
	'controllers/atlassian.projects.controller.ts',
);

// Log controller initialization
controllerLogger.debug('Jira projects controller initialized');

/**
 * Lists Jira projects with pagination and filtering options
 * @param options - Options for listing projects
 * @returns Formatted list of projects with pagination information
 */
async function list(
	options: ListProjectsToolArgsType = {},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.projects.controller.ts',
		'list',
	);
	methodLogger.debug(
		'Listing Jira projects (raw options received):',
		options,
	);

	try {
		// Create a defaults object with proper typing
		const defaults: Partial<ListProjectsToolArgsType> = {
			limit: DEFAULT_PAGE_SIZE,
			orderBy: 'lastIssueUpdatedTime',
			startAt: 0,
		};

		// Apply defaults
		const mergedOptions = applyDefaults<ListProjectsToolArgsType>(
			options,
			defaults,
		);
		methodLogger.debug(
			'Listing Jira projects (merged options after defaults):',
			mergedOptions,
		);

		// Map controller options to service parameters
		const params: ListProjectsParams = {
			...(mergedOptions.name && { query: mergedOptions.name }),
			...(mergedOptions.orderBy && { orderBy: mergedOptions.orderBy }),
			maxResults: mergedOptions.limit,
			startAt: mergedOptions.startAt,
		};

		methodLogger.debug('Using service params:', params);

		const projectsData = await atlassianProjectsService.list(params);
		// Log only the count of projects returned instead of the entire response
		methodLogger.debug(
			`Retrieved ${projectsData.values?.length || 0} projects`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			projectsData as unknown as Record<string, unknown>,
			PaginationType.OFFSET,
			'Project',
		);

		// Format the projects data for display using the formatter
		const formattedProjects = formatProjectsList(projectsData);

		// Combine formatted content with pagination information
		let finalContent = formattedProjects;
		if (
			pagination &&
			(pagination.hasMore || pagination.count !== undefined)
		) {
			const paginationString = formatPagination(pagination);
			finalContent += '\n\n' + paginationString;
		}

		return {
			content: finalContent,
		};
	} catch (error) {
		// Use throw instead of return
		throw handleControllerError(error, {
			entityType: 'Projects',
			operation: 'listing',
			source: 'controllers/atlassian.projects.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Gets details of a specific Jira project
 * @param identifier - The project identifier
 * @returns Formatted project details
 */
async function get(
	identifier: GetProjectToolArgsType,
): Promise<ControllerResponse> {
	const { projectKeyOrId } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.projects.controller.ts',
		'get',
	);

	methodLogger.debug(
		`Getting Jira project with key/ID: ${projectKeyOrId}...`,
	);

	// Validate project key/ID format
	if (!projectKeyOrId || projectKeyOrId === 'invalid') {
		throw createApiError('Invalid project key or ID', 400);
	}

	try {
		// Create defaults object for get operation
		const defaults = {
			includeComponents: PROJECT_DEFAULTS.INCLUDE_COMPONENTS,
			includeVersions: PROJECT_DEFAULTS.INCLUDE_VERSIONS,
		};

		// Always include all possible expansions for maximum detail
		const serviceParams = defaults;

		const projectData = await atlassianProjectsService.get(
			projectKeyOrId,
			serviceParams,
		);
		// Log only key information instead of the entire response
		methodLogger.debug(
			`Retrieved project: ${projectData.name} (${projectData.id})`,
		);

		// Format the project data for display using the formatter
		const formattedProject = formatProjectDetails(projectData);

		return {
			content: formattedProject,
		};
	} catch (error) {
		// Use throw instead of return
		throw handleControllerError(error, {
			entityType: 'Project',
			entityId: identifier,
			operation: 'retrieving',
			source: 'controllers/atlassian.projects.controller.ts@get',
		});
	}
}

export default { list, get };
