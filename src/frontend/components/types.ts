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
}

interface ChannelWithComments extends Channel {
  comments: Comment[];
}

interface Pr {
  bodyText: string;
  title: string;
  author: Author;
  channels: ChannelWithComments[];
}
