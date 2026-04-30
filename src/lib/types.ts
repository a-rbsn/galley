/**
 * Frontend post view — normalised from Reddit's raw t3 listing data into the
 * subset of fields Galley actually renders. The raw shapes live in
 * src/lib/server/reddit.ts; this is the friendlier shape components consume.
 */
export type PostKind = 'text' | 'link' | 'image' | 'video' | 'gallery';

export interface PostView {
	id: string;
	subreddit: string;
	title: string;
	author: string;
	score: number;
	numComments: number;
	createdUtc: number;
	permalink: string;
	url: string;
	domain: string;
	isSelf: boolean;
	thumbnail?: string;
	previewImages?: Array<{ url: string; width: number; height: number }>;
	selftext?: string;
	selftextHtml?: string;
	kind: PostKind;
	isPinned?: boolean;
	hueSeed?: number;
	galleryCount?: number;
	galleryItems?: Array<{ url: string; width: number; height: number; caption?: string }>;
	videoUrl?: string;
	videoHlsUrl?: string;
	videoPoster?: string;
	videoWidth?: number;
	videoHeight?: number;
	videoIsGif?: boolean;
	videoDuration?: string;
	flair?: string;
	over18?: boolean;
}

export interface CommentView {
	id: string;
	author: string;
	body: string;
	bodyHtml?: string;
	score: number;
	createdUtc: number;
	depth: number;
	permalink: string;
	stickied?: boolean;
	replies: Array<CommentView | MoreCommentsView>;
	kind: 't1';
}

export interface MoreCommentsView {
	id: string;
	parentId: string;
	count: number;
	depth: number;
	children: string[];
	kind: 'more';
}

export interface CustomFeedView {
	id: string;
	name: string;
	subreddits: string[];
}
