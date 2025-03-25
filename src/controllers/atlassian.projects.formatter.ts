import {
	ProjectDetailed,
	ProjectsResponse,
} from '../services/vendor.atlassian.projects.types.js';
import {
	formatUrl,
	formatDate,
	formatPagination,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatter.util.js';

/**
 * Format a list of projects for display
 * @param projectsData - Raw projects data from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with projects information in markdown format
 */
export function formatProjectsList(
	projectsData: ProjectsResponse,
	nextCursor?: string,
): string {
	if (!projectsData.values || projectsData.values.length === 0) {
		return 'No Jira projects found.';
	}

	const lines: string[] = [formatHeading('Jira Projects', 1), ''];

	// Use the numbered list formatter for consistent formatting
	const formattedList = formatNumberedList(projectsData.values, (project) => {
		const itemLines: string[] = [];

		// Basic information
		itemLines.push(formatHeading(project.name, 2));

		// Prepare URL
		const projectUrl = project.self.replace(
			'/rest/api/3/project/',
			'/browse/',
		);

		// Create an object with all the properties to display
		const properties: Record<string, unknown> = {
			ID: project.id,
			Key: project.key,
			Style: project.style || 'Not specified',
			Simplified: project.simplified,
			URL: {
				url: projectUrl,
				title: project.key,
			},
		};

		// Format as a bullet list with proper formatting for each value type
		itemLines.push(formatBulletList(properties, (key) => key));

		// Add avatar if available
		if (project.avatarUrls && project.avatarUrls['48x48']) {
			itemLines.push(
				`![${project.name} Avatar](${project.avatarUrls['48x48']})`,
			);
		}

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add pagination information
	if (nextCursor) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push('');
		lines.push(
			formatPagination(projectsData.values.length, true, nextCursor),
		);

		// Add total count information
		if (projectsData.total) {
			lines.push(`*Total projects: ${projectsData.total}*`);
		}
	}

	// Add timestamp for when this information was retrieved
	lines.push('');
	lines.push(`*Project information retrieved at ${formatDate(new Date())}*`);

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
	lines.push(`*Project information retrieved at ${formatDate(new Date())}*`);
	lines.push(`*To view this project in Jira, visit: ${projectUrl}*`);

	return lines.join('\n');
}
