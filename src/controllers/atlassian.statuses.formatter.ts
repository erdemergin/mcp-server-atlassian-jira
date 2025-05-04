import { Logger } from '../utils/logger.util.js';
import {
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';
import { JiraStatusDetail } from '../services/vendor.atlassian.statuses.types.js';

const formatterLogger = Logger.forContext(
	'controllers/atlassian.statuses.formatter.ts',
);

/**
 * Formats a list of Jira statuses into a Markdown string.
 *
 * @param {JiraStatusDetail[]} statuses - Array of unique status details.
 * @param {string} [projectKeyOrId] - Optional project context for the heading.
 * @returns {string} Formatted Markdown string.
 */
export function formatStatusesList(
	statuses: JiraStatusDetail[],
	projectKeyOrId?: string,
): string {
	formatterLogger.debug(
		`Formatting ${statuses.length} statuses`,
		projectKeyOrId ? { projectKeyOrId } : {},
	);

	if (!statuses || statuses.length === 0) {
		const context = projectKeyOrId ? ` for project ${projectKeyOrId}` : '';
		return (
			`No statuses found${context}.` +
			'\n\n' +
			formatSeparator() +
			'\n' +
			`*Information retrieved at: ${formatDate(new Date())}*`
		);
	}

	const heading = projectKeyOrId
		? `Statuses for Project ${projectKeyOrId}`
		: 'Available Jira Statuses';
	const lines: string[] = [formatHeading(heading, 1), ''];

	statuses.forEach((status) => {
		const statusDetails = {
			Name: status.name,
			ID: status.id,
			Category: status.statusCategory.name,
			Description: status.description || 'N/A',
		};
		lines.push(formatBulletList(statusDetails));
		lines.push(''); // Add space between statuses
	});

	// Remove trailing newline
	if (lines[lines.length - 1] === '') {
		lines.pop();
	}

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
