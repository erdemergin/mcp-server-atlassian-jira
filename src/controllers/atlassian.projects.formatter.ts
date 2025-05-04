import {
	ProjectDetailed,
	ProjectsResponse,
	Project,
} from '../services/vendor.atlassian.projects.types.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
} from '../utils/formatter.util.js';

/**
 * Type safety helper for projects with expanded fields
 * The Project type doesn't include fields that may be expanded in the API response
 */
type ProjectWithExpanded = Project & {
	description?: string;
	lead?: {
		displayName: string;
		[key: string]: unknown;
	};
	projectTypeKey?: string;
	[key: string]: unknown;
};

/**
 * Format a list of projects for display
 * @param projectsData - Raw projects data from the API
 * @param pagination - Pagination information (startAt, limit, total, hasMore) - Now used for footer hints
 * @returns Formatted string with projects information in markdown format
 */
export function formatProjectsList(
	projectsData: ProjectsResponse,
	pagination?: {
		startAt?: number;
		limit?: number;
		total?: number;
		hasMore: boolean;
		count?: number;
	},
): string {
	if (!projectsData.values || projectsData.values.length === 0) {
		return 'No Jira projects found matching your criteria.';
	}

	const lines: string[] = [formatHeading('Jira Projects', 1), ''];

	// Use a standard list format instead of map
	let formattedList = '';
	projectsData.values.forEach((project, index) => {
		// Safely cast project to include expanded fields
		const expandedProject = project as ProjectWithExpanded;

		// Build URL from project data
		const projectUrl = project.self.replace(
			'/rest/api/3/project/',
			'/browse/',
		);

		formattedList +=
			formatHeading(`${index + 1}. ${project.name}`, 2) + '\n\n';

		// Basic properties
		const properties: Record<string, unknown> = {
			ID: project.id,
			Key: project.key,
			Type:
				expandedProject.projectTypeKey ||
				project.projectCategory?.name ||
				'Not specified',
			Style: project.style || 'Not specified',
			Self: formatUrl(projectUrl, 'Open in Jira'),
		};

		// Lead information if available
		if (expandedProject.lead) {
			properties['Lead'] = expandedProject.lead.displayName;
		}

		// Format as bullet list
		formattedList += formatBulletList(properties, (key) => key) + '\n\n';

		// Separator is now handled within the loop
		if (index < projectsData.values.length - 1) {
			formattedList += formatSeparator() + '\n\n';
		}

		// Avatar if available
		if (project.avatarUrls && project.avatarUrls['48x48']) {
			formattedList += `![${project.name} Avatar](${project.avatarUrls['48x48']})\n\n`;
		}
	});

	lines.push(formattedList);

	// --- Footer --- (Revised Footer)
	const footerLines: string[] = [];
	footerLines.push('---');

	const displayedCount = pagination?.count ?? projectsData.values.length;
	if (pagination?.total !== undefined) {
		footerLines.push(
			`*Showing ${displayedCount} of ${pagination.total} projects*`,
		);
	}
	// Check hasMore using limit and startAt if total isn't precise or available
	const potentiallyMore =
		pagination?.hasMore ??
		(pagination?.limit &&
			pagination?.startAt !== undefined &&
			displayedCount >= pagination.limit);

	if (potentiallyMore) {
		const nextStartAt =
			(pagination?.startAt ?? 0) + (pagination?.limit ?? displayedCount);
		footerLines.push(`*Use --start-at ${nextStartAt} to view more.*`);
	}

	footerLines.push(
		`*Information retrieved at: ${new Date().toLocaleString()}*`,
	); // Use toLocaleString

	lines.push(...footerLines); // Add footer lines

	return lines.join('\n');
}

/**
 * Format detailed project information for display
 * @param projectData - Raw project data from the API
 * @returns Formatted string with project details in markdown format
 */
export function formatProjectDetails(projectData: ProjectDetailed): string {
	// Prepare URL
	const projectUrl = projectData.self.replace(
		'/rest/api/3/project/',
		'/browse/',
	);

	const lines: string[] = [
		formatHeading(`Project: ${projectData.name}`, 1),
		'',
		`> A ${projectData.style || 'standard'} project with key \`${projectData.key}\`.`,
		'',
		formatHeading('Basic Information', 2),
	];

	// Format basic information as a bullet list
	const basicProperties: Record<string, unknown> = {
		ID: projectData.id,
		Key: projectData.key,
		Style: projectData.style || 'Not specified',
		Simplified: projectData.simplified,
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Description
	if (projectData.description) {
		lines.push('');
		lines.push(formatHeading('Description', 2));
		lines.push(projectData.description);
	}

	// Lead information
	if (projectData.lead) {
		lines.push('');
		lines.push(formatHeading('Project Lead', 2));

		const leadProperties: Record<string, unknown> = {
			Name: projectData.lead.displayName,
			Active: projectData.lead.active,
		};

		lines.push(formatBulletList(leadProperties, (key) => key));
	}

	// Components
	if (projectData.components && projectData.components.length > 0) {
		lines.push('');
		lines.push(formatHeading('Components', 2));

		projectData.components.forEach((component) => {
			lines.push(formatHeading(`${component.name}`, 3));

			if (component.description) {
				lines.push(component.description);
				lines.push('');
			}

			const componentProperties: Record<string, unknown> = {
				Lead: component.lead?.displayName,
			};

			lines.push(formatBulletList(componentProperties, (key) => key));
		});
	} else {
		lines.push('');
		lines.push(formatHeading('Components', 2));
		lines.push('No components defined for this project.');
	}

	// Versions
	if (projectData.versions && projectData.versions.length > 0) {
		lines.push('');
		lines.push(formatHeading('Versions', 2));

		projectData.versions.forEach((version) => {
			lines.push(formatHeading(`${version.name}`, 3));

			if (version.description) {
				lines.push(version.description);
				lines.push('');
			}

			const versionProperties: Record<string, unknown> = {
				Released: version.released,
				Archived: version.archived,
				'Release Date': version.releaseDate,
				'Start Date': version.startDate,
			};

			lines.push(formatBulletList(versionProperties, (key) => key));
		});
	} else {
		lines.push('');
		lines.push(formatHeading('Versions', 2));
		lines.push('No versions defined for this project.');
	}

	// Links section
	lines.push('');
	lines.push(formatHeading('Links', 2));

	const links: string[] = [];
	links.push(`- ${formatUrl(projectUrl, 'Open in Jira')}`);
	links.push(`- ${formatUrl(`${projectUrl}/issues`, 'View Issues')}`);
	links.push(`- ${formatUrl(`${projectUrl}/board`, 'View Board')}`);

	lines.push(links.join('\n'));

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Information retrieved at: ${new Date().toLocaleString()}*`); // Use toLocaleString
	lines.push(`*To view this project in Jira, visit: ${projectUrl}*`);

	return lines.join('\n');
}
