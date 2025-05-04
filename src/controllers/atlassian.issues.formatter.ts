import {
	Issue,
	DevInfoResponse,
	DevInfoSummaryResponse,
} from '../services/vendor.atlassian.issues.types.js';
import { adfToMarkdown } from '../utils/adf.util.js';
import {
	formatUrl,
	formatDate,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatter.util.js';

// Add interfaces for the types we previously imported
interface DevInfoCommit {
	id: string;
	displayId: string;
	message: string;
	author?: {
		name: string;
		avatar?: string;
	};
	authorTimestamp: string;
	url: string;
	fileCount: number;
	merge: boolean;
	files: Array<unknown>;
}

interface DevInfoRepository {
	id: string;
	name: string;
	avatar: string;
	url: string;
	commits?: DevInfoCommit[];
}

interface DevInfoBranch {
	name: string;
	url: string;
	createPullRequestUrl: string;
	repository?: {
		id: string;
		name: string;
		avatar: string;
		url: string;
	};
	lastCommit?: DevInfoCommit;
}

interface DevInfoPullRequest {
	id: string;
	name: string;
	commentCount: number;
	source?: {
		branch: string;
		url: string;
	};
	destination?: {
		branch: string;
		url: string;
	};
	reviewers?: {
		name: string;
		avatar?: string;
		approved: boolean;
	}[];
	status: string;
	url: string;
	lastUpdate: string;
	repositoryId: string;
	repositoryName: string;
	repositoryUrl: string;
	repositoryAvatarUrl: string;
	author?: {
		name: string;
		avatar?: string;
	};
}

// Define the IssueComment interface locally
interface IssueComment {
	id: string;
	self: string;
	author?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	body?: string | unknown; // ContentRepresentation
	created: string;
	updated: string;
	updateAuthor?: {
		accountId: string;
		active: boolean;
		displayName: string;
		self: string;
	};
	visibility?: {
		identifier: string;
		type: string;
		value: string;
	};
}

// Define the LinkedIssueInfo interface locally
interface LinkedIssueInfo {
	id: string;
	key: string;
	self: string;
	fields: {
		summary?: string;
		status: {
			iconUrl: string;
			name: string;
		};
	};
}

// Define the IssueLink interface locally
interface IssueLink {
	id: string;
	type: {
		id: string;
		inward: string;
		name: string;
		outward: string;
	};
	inwardIssue?: LinkedIssueInfo;
	outwardIssue?: LinkedIssueInfo;
}

// Add this interface definition at the top of the file, after the imports
interface CommentContainer {
	comments: IssueComment[];
}

interface IssuesData {
	issues: Issue[];
	baseUrl: string;
}

interface ResponsePagination {
	nextCursor?: string;
	hasMore: boolean;
	count?: number;
}

/**
 * Format a list of issues for display
 * @param issuesData - Raw issues data from the API
 * @param _pagination - Pagination information including count and next cursor (handled by CLI layer)
 * @returns Formatted string with issues information in markdown format
 */
export function formatIssuesList(
	issuesData: IssuesData,
	_pagination?: ResponsePagination,
): string {
	const { issues } = issuesData;

	if (!issues || issues.length === 0) {
		return 'No issues found.';
	}

	const lines: string[] = [formatHeading('Jira Issues', 1), ''];

	const formattedIssues = formatNumberedList(issues, (issue) => {
		const lines: string[] = [];

		lines.push(formatHeading(`${issue.key}: ${issue.fields.summary}`, 2));

		const properties: Record<string, unknown> = {
			Key: issue.key,
			Summary: issue.fields.summary,
			Type: issue.fields.issuetype?.name,
			Status: issue.fields.status?.name,
			Priority: issue.fields.priority?.name,
			Project: issue.fields.project?.name,
			Assignee: issue.fields.assignee?.displayName,
			Reporter: issue.fields.reporter?.displayName,
			'Created On': issue.fields.created,
			'Updated On': issue.fields.updated,
			URL: {
				url: `${issuesData.baseUrl}/browse/${issue.key}`,
				title: issue.key,
			},
		};

		lines.push(formatBulletList(properties));

		return lines.join('\n');
	});

	lines.push(formattedIssues);

	return lines.join('\n');
}

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
		const summary = `> A ${issueData.fields.status.name.toLowerCase()} issue in the ${issueData.fields.project?.name} project.`;
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
		Status: issueData.fields.status?.name,
		Priority: issueData.fields.priority?.name,
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
		Created: issueData.fields.created,
		Updated: issueData.fields.updated,
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
				'Created At': attachment.created,
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
						// Try to use summary, fall back to Key + Status if not available
						const displayTitle = targetIssueInfo.fields.summary
							? targetIssueInfo.fields.summary
							: targetIssueInfo.fields.status?.name
								? `${targetIssueInfo.key} (${targetIssueInfo.fields.status.name})`
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
	} else {
		// Optional: Add a line if no links are present
		// lines.push('');
		// lines.push('No linked issues found.');
	}

	// Links section
	lines.push('');
	lines.push(formatHeading('Links', 2));
	lines.push(`- ${formatUrl(issueUrl, 'Open in Jira')}`);

	// Footer
	lines.push('');
	lines.push(formatSeparator());
	lines.push(`*Issue information retrieved at ${formatDate(new Date())}*`);
	lines.push(`*To view this issue in Jira, visit: ${issueUrl}*`);

	return lines.join('\n');
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format development information for display
 * @param devInfoSummary - Development information summary
 * @param devInfoCommits - Development information commits
 * @param devInfoBranches - Development information branches
 * @param devInfoPullRequests - Development information pull requests
 * @returns Formatted string with development information in markdown format
 */
export function formatDevelopmentInfo(
	devInfoSummary: DevInfoSummaryResponse | null,
	devInfoCommits: DevInfoResponse | null,
	devInfoBranches: DevInfoResponse | null,
	devInfoPullRequests: DevInfoResponse | null,
): string {
	const lines: string[] = [];

	// Check if there's any development info available
	if (
		!devInfoSummary ||
		!devInfoSummary.summary ||
		(!devInfoSummary.summary.repository?.overall?.count &&
			!devInfoSummary.summary.branch?.overall?.count &&
			!devInfoSummary.summary.pullrequest?.overall?.count)
	) {
		return ''; // No development info, return empty string
	}

	lines.push('');
	lines.push(formatHeading('Development Information', 2));

	// Development Summary
	if (devInfoSummary.summary) {
		const summary = devInfoSummary.summary;
		lines.push('');
		lines.push(formatHeading('Development Summary', 3));

		const summaryProps: Record<string, unknown> = {};

		if (summary.repository?.overall?.count) {
			const lastUpdated =
				summary.repository.overall.lastUpdated || 'Unknown';
			summaryProps['Repositories'] =
				`${summary.repository.overall.count} (Last updated: ${lastUpdated !== 'Unknown' ? formatDate(lastUpdated) : 'Unknown'})`;
		}

		if (summary.branch?.overall?.count) {
			const lastUpdated = summary.branch.overall.lastUpdated || 'Unknown';
			summaryProps['Branches'] =
				`${summary.branch.overall.count} (Last updated: ${lastUpdated !== 'Unknown' ? formatDate(lastUpdated) : 'Unknown'})`;
		}

		if (summary.pullrequest?.overall?.count) {
			const lastUpdated =
				summary.pullrequest.overall.lastUpdated || 'Unknown';
			summaryProps['Pull Requests'] =
				`${summary.pullrequest.overall.count} (Last updated: ${lastUpdated !== 'Unknown' ? formatDate(lastUpdated) : 'Unknown'}, Status: ${summary.pullrequest.overall.state || 'Unknown'})`;
		}

		lines.push(formatBulletList(summaryProps));
	}

	// Commits
	if (devInfoCommits?.detail && devInfoCommits.detail.length > 0) {
		lines.push('');
		lines.push(formatHeading('Commits', 3));

		devInfoCommits.detail.forEach((detail) => {
			if (detail.repositories && detail.repositories.length > 0) {
				detail.repositories.forEach((repo: DevInfoRepository) => {
					lines.push(`**Repository**: ${repo.name}`);

					if (repo.commits && repo.commits.length > 0) {
						lines.push('');
						repo.commits.forEach(
							(commit: DevInfoCommit, index: number) => {
								lines.push(
									`${index + 1}. **${commit.displayId}** - ${commit.message.split('\n')[0]}`,
								);
								lines.push(
									`   Author: ${commit.author?.name || 'Unknown'}, Date: ${formatDate(commit.authorTimestamp)}`,
								);
								if (commit.url) {
									lines.push(
										`   ${formatUrl('View Commit', commit.url)}`,
									);
								}
								if (index < repo.commits!.length - 1) {
									lines.push('');
								}
							},
						);
					} else {
						lines.push('   No commits found');
					}
				});
			}
		});
	}

	// Branches
	if (devInfoBranches?.detail && devInfoBranches.detail.length > 0) {
		lines.push('');
		lines.push(formatHeading('Branches', 3));

		devInfoBranches.detail.forEach((detail) => {
			if (detail.branches && detail.branches.length > 0) {
				detail.branches.forEach((branch: DevInfoBranch) => {
					lines.push(`**Branch**: ${branch.name}`);
					lines.push(
						`**Repository**: ${branch.repository?.name || 'Unknown'}`,
					);

					if (branch.lastCommit) {
						lines.push(
							`**Last Commit**: ${branch.lastCommit.displayId} - ${branch.lastCommit.message.split('\n')[0]}`,
						);
						lines.push(
							`**Author**: ${branch.lastCommit.author?.name || 'Unknown'}, **Date**: ${formatDate(branch.lastCommit.authorTimestamp)}`,
						);
					}

					if (branch.url) {
						lines.push(`${formatUrl('View Branch', branch.url)}`);
					}

					lines.push('');
				});
			} else {
				lines.push('No branches found');
			}
		});
	}

	// Pull Requests
	if (devInfoPullRequests?.detail && devInfoPullRequests.detail.length > 0) {
		lines.push('');
		lines.push(formatHeading('Pull Requests', 3));

		devInfoPullRequests.detail.forEach((detail) => {
			if (detail.pullRequests && detail.pullRequests.length > 0) {
				detail.pullRequests.forEach((pr: DevInfoPullRequest) => {
					lines.push(`**${pr.name}** (${pr.status})`);
					lines.push(`**Repository**: ${pr.repositoryName}`);
					lines.push(`**Author**: ${pr.author?.name || 'Unknown'}`);

					if (pr.source?.branch && pr.destination?.branch) {
						lines.push(
							`**Source**: ${pr.source.branch} → **Destination**: ${pr.destination.branch}`,
						);
					}

					if (pr.reviewers && pr.reviewers.length > 0) {
						const approved = pr.reviewers
							.filter((r) => r.approved)
							.map((r) => r.name)
							.join(', ');
						const notApproved = pr.reviewers
							.filter((r) => !r.approved)
							.map((r) => r.name)
							.join(', ');

						if (approved) {
							lines.push(`**Approved by**: ${approved}`);
						}

						if (notApproved) {
							lines.push(
								`**Awaiting approval from**: ${notApproved}`,
							);
						}
					}

					lines.push(
						`**Last Updated**: ${formatDate(pr.lastUpdate)}`,
					);

					if (pr.url) {
						lines.push(`${formatUrl('View Pull Request', pr.url)}`);
					}

					lines.push('');
				});
			} else {
				lines.push('No pull requests found');
			}
		});
	}

	return lines.join('\n');
}
