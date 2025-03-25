import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { Logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/errorHandler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import {
	ListProjectsOptions,
	GetProjectOptions,
	ControllerResponse,
	ProjectIdentifier,
} from './atlassian.projects.type.js';
import {
	formatProjectsList,
	formatProjectDetails,
} from './atlassian.projects.formatter.js';

/**
 * Controller for managing Jira projects.
 * Provides functionality for listing projects and retrieving project details.
 */

// Default values for options
const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_INCLUDE_COMPONENTS = true;
const DEFAULT_INCLUDE_VERSIONS = true;

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
	options: ListProjectsOptions = {
		limit: DEFAULT_MAX_RESULTS,
	},
): Promise<ControllerResponse> {
	const methodLogger = Logger.forContext(
		'controllers/atlassian.projects.controller.ts',
		'list',
	);
	methodLogger.debug('Listing Jira projects...', options);

	try {
		// Map controller options to service parameters
		const serviceParams = {
			// Optional filters
			query: options.query,
			// Always include expanded fields
			expand: ['description', 'lead'],
			// Pagination with defaults
			maxResults: options.limit || DEFAULT_MAX_RESULTS,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		const projectsData = await atlassianProjectsService.list(serviceParams);
		// Log only the count of projects returned instead of the entire response
		methodLogger.debug(
			`Retrieved ${projectsData.values?.length || 0} projects`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			projectsData,
			PaginationType.OFFSET,
			'controllers/atlassian.projects.controller.ts@list',
		);

		// Format the projects data for display using the formatter
		const formattedProjects = formatProjectsList(projectsData);

		return {
			content: formattedProjects,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
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
 * @param options - Options for retrieving project details
 * @returns Formatted project details
 */
async function get(
	identifier: ProjectIdentifier,
	options: GetProjectOptions = {
		includeComponents: DEFAULT_INCLUDE_COMPONENTS,
		includeVersions: DEFAULT_INCLUDE_VERSIONS,
	},
): Promise<ControllerResponse> {
	const { idOrKey } = identifier;
	const methodLogger = Logger.forContext(
		'controllers/atlassian.projects.controller.ts',
		'get',
	);

	methodLogger.debug(`Getting Jira project with ID/key: ${idOrKey}...`);

	try {
		// Map controller options to service parameters
		const serviceParams = {
			includeComponents: options.includeComponents,
			includeVersions: options.includeVersions,
		};

		const projectData = await atlassianProjectsService.get(
			idOrKey,
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
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Project',
			entityId: identifier,
			operation: 'retrieving',
			source: 'controllers/atlassian.projects.controller.ts@get',
			additionalInfo: { options },
		});
	}
}

export default { list, get };
