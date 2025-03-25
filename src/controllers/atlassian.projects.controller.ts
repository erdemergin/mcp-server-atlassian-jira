import atlassianProjectsService from '../services/vendor.atlassian.projects.service.js';
import { logger } from '../utils/logger.util.js';
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

/**
 * List Jira projects with optional filtering
 * @param options - Optional filter options for the projects list
 * @param options.query - Text query to filter projects by name or key
 * @param options.limit - Maximum number of projects to return
 * @param options.cursor - Pagination cursor for retrieving the next set of results
 * @returns Promise with formatted project list content and pagination information
 */
async function list(
	options: ListProjectsOptions = {},
): Promise<ControllerResponse> {
	const source = `[src/controllers/atlassian.projects.controller.ts@list]`;
	logger.debug(`${source} Listing Jira projects...`, options);

	try {
		// Set default filters and hardcoded values
		const filters = {
			// Optional filters with defaults
			query: options.query,
			// Hardcoded choices
			expand: ['description', 'lead'], // Always include expanded fields
			// Pagination
			maxResults: options.limit || 50,
			startAt: options.cursor ? parseInt(options.cursor, 10) : 0,
		};

		logger.debug(`${source} Using filters:`, filters);

		const projectsData = await atlassianProjectsService.list(filters);
		// Log only the count of projects returned instead of the entire response
		logger.debug(
			`${source} Retrieved ${projectsData.values?.length || 0} projects`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			projectsData,
			PaginationType.OFFSET,
			source,
		);

		// Format the projects data for display using the formatter
		const formattedProjects = formatProjectsList(
			projectsData,
			pagination.nextCursor,
		);

		return {
			content: formattedProjects,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Projects',
			operation: 'listing',
			source: 'src/controllers/atlassian.projects.controller.ts@list',
			additionalInfo: { options },
		});
	}
}

/**
 * Get details of a specific Jira project
 * @param identifier - Object containing the ID or key of the project to retrieve
 * @param identifier.idOrKey - The ID or key of the project
 * @param options - Options for retrieving the project
 * @returns Promise with formatted project details content
 * @throws Error if project retrieval fails
 */
async function get(
	identifier: ProjectIdentifier,
	options: GetProjectOptions = {
		includeComponents: true,
		includeVersions: true,
	},
): Promise<ControllerResponse> {
	const { idOrKey } = identifier;

	logger.debug(
		`[src/controllers/atlassian.projects.controller.ts@get] Getting Jira project with ID/key: ${idOrKey}...`,
	);

	try {
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Using options:`,
			options,
		);

		const projectData = await atlassianProjectsService.get(
			idOrKey,
			options,
		);
		// Log only key information instead of the entire response
		logger.debug(
			`[src/controllers/atlassian.projects.controller.ts@get] Retrieved project: ${projectData.name} (${projectData.id})`,
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
			source: 'src/controllers/atlassian.projects.controller.ts@get',
			additionalInfo: { options },
		});
	}
}

export default { list, get };
