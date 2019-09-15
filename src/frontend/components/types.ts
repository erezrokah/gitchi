export interface Author {
  avatarUrl: string;
  login: string;
}

export interface User extends Author {
  name: string;
}

export interface Comment {
  id: string;
  bodyText: string;
  createdAt: Date;
  author: Author;
  inReplyToId?: number;
  path?: string;
  canDelete: boolean;
}

export interface Channel {
  key: string;
  title: string;
  isReview: boolean;
  comments: Comment[];
}

export interface Pr {
  id: string;
  bodyText: string;
  title: string;
  author: Author;
  channels: Channel[];
}
