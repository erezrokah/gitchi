interface Author {
  avatarUrl: string;
  login: string;
}

interface User extends Author {
  name: string;
}

interface Channel {
  key: string;
  title: string;
}

interface Comment {
  id: string;
  bodyText: string;
  createdAt: Date;
  author: Author;
  inReplyToId?: number;
  path?: string;
}

interface ChannelWithComments extends Channel {
  comments: Comment[];
}

interface Pr {
  id: string;
  bodyText: string;
  title: string;
  author: Author;
  channels: ChannelWithComments[];
}
