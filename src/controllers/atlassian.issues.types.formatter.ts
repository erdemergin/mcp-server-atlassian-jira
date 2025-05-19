/**
 * Type definitions related to formatting Jira issue data
 */

import { Issue } from '../services/vendor.atlassian.issues.types.js';

/**
 * Data for a development information commit
 */
export interface DevInfoCommit {
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

/**
 * Data for a development information repository
 */
export interface DevInfoRepository {
	id: string;
	name: string;
	avatar: string;
	url: string;
	commits?: DevInfoCommit[];
}

/**
 * Data for a development information branch
 */
export interface DevInfoBranch {
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

/**
 * Data for a development information pull request
 */
export interface DevInfoPullRequest {
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

/**
 * Data for a Jira issue comment
 */
export interface IssueComment {
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

/**
 * Information about a linked issue
 */
export interface LinkedIssueInfo {
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

/**
 * Data for a link between issues
 */
export interface IssueLink {
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

/**
 * Container for comments
 */
export interface CommentContainer {
	comments: IssueComment[];
}

/**
 * Data for a list of Jira issues
 */
export interface IssuesData {
	issues: Issue[];
	baseUrl: string;
}

/**
 * Response types for development information
 */
export type DevInfoResponse = {
	detail: Array<{
		repositories?: DevInfoRepository[];
		branches?: DevInfoBranch[];
		pullRequests?: DevInfoPullRequest[];
		[key: string]: unknown;
	}>;
};

export type DevInfoSummaryResponse = {
	summary: {
		repository?: {
			overall?: {
				count: number;
				lastUpdated?: string | null;
				dataType?: string | null;
			};
			byInstanceType?: Record<
				string,
				{ count: number; name: string | null }
			>;
		};
		branch?: {
			overall?: {
				count: number;
				lastUpdated?: string | null;
				dataType?: string | null;
			};
			byInstanceType?: Record<
				string,
				{ count: number; name: string | null }
			>;
		};
		pullrequest?: {
			overall?: {
				count: number;
				lastUpdated?: string | null;
				state?: string | null;
				dataType?: string | null;
			};
			byInstanceType?: Record<
				string,
				{ count: number; name: string | null }
			>;
		};
	};
	errors?: string[];
	configErrors?: string[];
};
