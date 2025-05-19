/**
 * Formatter for Jira issues list
 */

import {
	formatHeading,
	formatNumberedList,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';
import { IssuesData } from './atlassian.issues.types.formatter.js';
import {
	getStatusEmoji,
	getPriorityEmoji,
} from './atlassian.issues.utils.formatter.js';

/**
 * Format a list of issues for display
 * @param issuesData - Raw issues data from the API
 * @returns Formatted string with issues information in markdown format
 */
export function formatIssuesList(issuesData: IssuesData): string {
	const { issues } = issuesData;

	if (!issues || issues.length === 0) {
		return (
			'No issues found.' +
			'\n\n' +
			formatSeparator() +
			'\n' +
			`*Information retrieved at: ${formatDate(new Date())}*`
		);
	}

	const lines: string[] = [formatHeading('Jira Issues', 1), ''];

	const formattedIssues = formatNumberedList(issues, (issue) => {
		const itemLines: string[] = [];

		itemLines.push(
			formatHeading(`${issue.key}: ${issue.fields.summary}`, 2),
		);

		const properties: Record<string, unknown> = {
			Key: issue.key,
			Summary: issue.fields.summary,
			Type: issue.fields.issuetype?.name,
			Status: `${getStatusEmoji(issue.fields.status?.name)}${issue.fields.status?.name}`,
			Priority: `${getPriorityEmoji(issue.fields.priority?.name)}${issue.fields.priority?.name}`,
			Project: issue.fields.project?.name,
			Assignee: issue.fields.assignee?.displayName,
			Reporter: issue.fields.reporter?.displayName,
			'Created On': formatDate(issue.fields.created),
			'Updated On': formatDate(issue.fields.updated),
			URL: {
				url: `${issuesData.baseUrl}/browse/${issue.key}`,
				title: issue.key,
			},
		};

		itemLines.push(formatBulletList(properties));

		return itemLines.join('\n');
	});

	lines.push(formattedIssues);

	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	return lines.join('\n');
}
