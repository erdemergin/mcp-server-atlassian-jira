/**
 * Formatter for Jira issue details
 */

import { Issue } from '../services/vendor.atlassian.issues.types.js';
import { adfToMarkdown } from '../utils/adf-to-markdown.util.js';
import {
	formatUrl,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatDate,
} from '../utils/formatter.util.js';
import {
	CommentContainer,
	IssueComment,
	IssueLink,
	LinkedIssueInfo,
} from './atlassian.issues.types.formatter.js';
import {
	getStatusEmoji,
	getPriorityEmoji,
	formatFileSize,
} from './atlassian.issues.utils.formatter.js';

/**
 * Format detailed issue information for display
 * @param issueData - Raw issue data from the API
 * @returns Formatted string with issue details in markdown format
 */
export function formatIssueDetails(issueData: Issue): string {
	// Prepare URL
	const issueUrl = issueData.self.replace('/rest/api/3/issue/', '/browse/');

	const lines: string[] = [
		formatHeading(`Jira Issue: ${issueData.fields.summary}`, 1),
		'',
	];

	// Add a brief summary line
	if (issueData.fields.status) {
		const statusEmoji = getStatusEmoji(issueData.fields.status.name);
		const priorityEmoji = getPriorityEmoji(issueData.fields.priority?.name);
		const summary = `> ${statusEmoji}A ${issueData.fields.status.name.toLowerCase()} issue ${priorityEmoji ? `with ${priorityEmoji}${issueData.fields.priority?.name} priority ` : ''}in the ${issueData.fields.project?.name} project.`;
		lines.push(summary);
		lines.push('');
	}

	// Basic Information section
	lines.push(formatHeading('Basic Information', 2));

	const basicProperties: Record<string, unknown> = {
		ID: issueData.id,
		Key: issueData.key,
		Project: issueData.fields.project
			? `${issueData.fields.project.name} (${issueData.fields.project.key})`
			: undefined,
		Type: issueData.fields.issuetype?.name,
		Status: `${getStatusEmoji(issueData.fields.status?.name)}${issueData.fields.status?.name}`,
		Priority: `${getPriorityEmoji(issueData.fields.priority?.name)}${issueData.fields.priority?.name}`,
	};

	lines.push(formatBulletList(basicProperties, (key) => key));

	// Add issue type description if available
	if (issueData.fields.issuetype?.description) {
		lines.push(`  *${issueData.fields.issuetype.description}*`);
	}

	// Description
	if (issueData.fields.description) {
		lines.push('');
		lines.push(formatHeading('Description', 2));

		// Handle different description formats
		if (typeof issueData.fields.description === 'string') {
			lines.push(issueData.fields.description);
		} else if (typeof issueData.fields.description === 'object') {
			lines.push(adfToMarkdown(issueData.fields.description));
		} else {
			lines.push('*Description format not supported*');
		}
	}

	// People
	lines.push('');
	lines.push(formatHeading('People', 2));

	const peopleProperties: Record<string, unknown> = {
		Assignee: issueData.fields.assignee?.displayName || 'Unassigned',
		Reporter: issueData.fields.reporter?.displayName,
	};

	// Add creator only if different from reporter
	if (
		issueData.fields.creator &&
		(!issueData.fields.reporter ||
			issueData.fields.creator.displayName !==
				issueData.fields.reporter?.displayName)
	) {
		peopleProperties['Creator'] = issueData.fields.creator.displayName;
	}

	lines.push(formatBulletList(peopleProperties, (key) => key));

	// Additional people details
	if (
		issueData.fields.assignee &&
		issueData.fields.assignee.active !== undefined
	) {
		lines.push(
			`  - **Active**: ${issueData.fields.assignee.active ? 'Yes' : 'No'}`,
		);
	}
	if (
		issueData.fields.reporter &&
		issueData.fields.reporter.active !== undefined
	) {
		lines.push(
			`  - **Active**: ${issueData.fields.reporter.active ? 'Yes' : 'No'}`,
		);
	}
	if (
		issueData.fields.creator &&
		(!issueData.fields.reporter ||
			issueData.fields.creator.displayName !==
				issueData.fields.reporter?.displayName) &&
		issueData.fields.creator.active !== undefined
	) {
		lines.push(
			`  - **Active**: ${issueData.fields.creator.active ? 'Yes' : 'No'}`,
		);
	}

	// Dates
	lines.push('');
	lines.push(formatHeading('Dates', 2));

	const dateProperties: Record<string, unknown> = {
		Created: formatDate(issueData.fields.created),
		Updated: formatDate(issueData.fields.updated),
	};

	lines.push(formatBulletList(dateProperties, (key) => key));

	// Time tracking
	if (
		issueData.fields.timetracking &&
		(issueData.fields.timetracking.originalEstimate ||
			issueData.fields.timetracking.remainingEstimate ||
			issueData.fields.timetracking.timeSpent)
	) {
		lines.push('');
		lines.push(formatHeading('Time Tracking', 2));

		const timeTrackingProperties: Record<string, unknown> = {
			'Original Estimate': issueData.fields.timetracking.originalEstimate,
			'Remaining Estimate':
				issueData.fields.timetracking.remainingEstimate,
			'Time Spent': issueData.fields.timetracking.timeSpent,
		};

		lines.push(formatBulletList(timeTrackingProperties, (key) => key));
	}

	// Attachments
	if (issueData.fields.attachment && issueData.fields.attachment.length > 0) {
		lines.push('');
		lines.push(formatHeading('Attachments', 2));

		issueData.fields.attachment.forEach((attachment, index) => {
			lines.push(formatHeading(attachment.filename, 3));

			const attachmentProperties: Record<string, unknown> = {
				'Content Type': attachment.mimeType,
				Size: formatFileSize(attachment.size),
				'Created At': formatDate(attachment.created),
				Author: attachment.author?.displayName,
			};

			lines.push(formatBulletList(attachmentProperties, (key) => key));

			if (attachment.content) {
				lines.push(`[Download](${attachment.content})`);
			}

			// Add separator between attachments
			if (index < issueData.fields.attachment!.length - 1) {
				lines.push('');
			}
		});
	}

	// Comments
	if (issueData.fields.comment) {
		const comments = Array.isArray(issueData.fields.comment)
			? issueData.fields.comment
			: (issueData.fields.comment as CommentContainer).comments || [];

		if (comments.length > 0) {
			lines.push('');
			lines.push(formatHeading('Comments', 2));

			comments.forEach((comment: IssueComment, index: number) => {
				lines.push(
					formatHeading(
						`${comment.author?.displayName || 'Anonymous'} - ${formatDate(comment.created)}`,
						3,
					),
				);

				// Format comment body
				if (typeof comment.body === 'string') {
					lines.push(comment.body);
				} else if (typeof comment.body === 'object') {
					lines.push(adfToMarkdown(comment.body));
				} else {
					lines.push('*Comment content not available*');
				}

				// Add separator between comments
				if (index < comments.length - 1) {
					lines.push('');
					lines.push(formatSeparator());
					lines.push('');
				}
			});
		}
	}

	// Issue Links (Revised Logic)
	if (issueData.fields.issuelinks && issueData.fields.issuelinks.length > 0) {
		lines.push('');
		lines.push(formatHeading('Linked Issues', 2));

		// Group links by relationship type
		const groupedLinks: Record<string, IssueLink[]> = {};
		issueData.fields.issuelinks.forEach((link) => {
			let relationship = '';
			let targetIssue: LinkedIssueInfo | undefined;

			if (link.inwardIssue) {
				relationship = link.type.inward; // e.g., "is blocked by"
				targetIssue = link.inwardIssue;
			} else if (link.outwardIssue) {
				relationship = link.type.outward; // e.g., "blocks"
				targetIssue = link.outwardIssue;
			}

			if (relationship && targetIssue) {
				if (!groupedLinks[relationship]) {
					groupedLinks[relationship] = [];
				}
				// Store the original link object, we need both inward/outward later
				groupedLinks[relationship].push(link);
			}
		});

		// Format grouped links
		for (const relationship in groupedLinks) {
			if (
				Object.prototype.hasOwnProperty.call(groupedLinks, relationship)
			) {
				lines.push('');
				lines.push(formatHeading(relationship, 3)); // Use relationship as subheading

				const linksList: Record<string, unknown> = {};
				groupedLinks[relationship].forEach((link) => {
					// Explicitly type targetIssueInfo
					const targetIssueInfo: LinkedIssueInfo | undefined =
						link.inwardIssue || link.outwardIssue;
					if (targetIssueInfo) {
						const targetIssueUrl = targetIssueInfo.self.replace(
							'/rest/api/3/issue/',
							'/browse/',
						);
						// Add status emoji to linked issues
						const statusEmoji = getStatusEmoji(
							targetIssueInfo.fields.status?.name,
						);
						// Try to use summary, fall back to Key + Status if not available
						const displayTitle = targetIssueInfo.fields.summary
							? `${statusEmoji}${targetIssueInfo.fields.summary}`
							: targetIssueInfo.fields.status?.name
								? `${statusEmoji}${targetIssueInfo.key} (${targetIssueInfo.fields.status.name})`
								: targetIssueInfo.key;

						linksList[targetIssueInfo.key] = {
							url: targetIssueUrl,
							title: displayTitle,
						};
					}
				});
				lines.push(formatBulletList(linksList, (key) => key)); // Key is the issue key
			}
		}
	}

	// Links section
	lines.push('');
	lines.push(formatHeading('Links', 2));
	lines.push(`- ${formatUrl(issueUrl, 'Open in Jira')}`);

	// Add standard footer with timestamp
	lines.push('\n\n' + formatSeparator());
	lines.push(`*Information retrieved at: ${formatDate(new Date())}*`);

	// Optionally keep the direct link
	if (issueUrl) {
		lines.push(`*View this issue in Jira: ${issueUrl}*`);
	}

	return lines.join('\n');
}
