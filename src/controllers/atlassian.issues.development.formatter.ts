/**
 * Formatter for Jira development information
 */

import {
	formatHeading,
	formatBulletList,
	formatUrl,
	formatDate,
} from '../utils/formatter.util.js';
import {
	DevInfoSummaryResponse,
	DevInfoResponse,
	DevInfoRepository,
	DevInfoCommit,
	DevInfoBranch,
	DevInfoPullRequest,
} from './atlassian.issues.types.formatter.js';

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
			const lastUpdated = summary.repository.overall.lastUpdated;
			const formattedDateStr =
				lastUpdated !== undefined && lastUpdated !== null
					? formatDate(new Date(lastUpdated))
					: 'Unknown';
			summaryProps['Repositories'] =
				`${summary.repository.overall.count} (Last updated: ${formattedDateStr})`;
		}

		if (summary.branch?.overall?.count) {
			const lastUpdated = summary.branch.overall.lastUpdated;
			const formattedDateStr =
				lastUpdated !== undefined && lastUpdated !== null
					? formatDate(new Date(lastUpdated))
					: 'Unknown';
			summaryProps['Branches'] =
				`${summary.branch.overall.count} (Last updated: ${formattedDateStr})`;
		}

		if (summary.pullrequest?.overall?.count) {
			const lastUpdated = summary.pullrequest.overall.lastUpdated;
			const formattedDateStr =
				lastUpdated !== undefined && lastUpdated !== null
					? formatDate(new Date(lastUpdated))
					: 'Unknown';
			summaryProps['Pull Requests'] =
				`${summary.pullrequest.overall.count} (Last updated: ${formattedDateStr}, Status: ${summary.pullrequest.overall.state || 'Unknown'})`;
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
										`   ${formatUrl(commit.url, 'View Commit')}`,
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
						lines.push(`${formatUrl(branch.url, 'View Branch')}`);
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
						lines.push(`${formatUrl(pr.url, 'View Pull Request')}`);
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
