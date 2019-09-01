import * as storage from '../utils/storage';
export class AuthorizationError extends Error {}

const getToken = async () => {
  const token = await storage.get('token');
  if (token) {
    return token;
  } else {
    throw new AuthorizationError();
  }
};

const API_ENDPOINT = 'https://api.github.com/';

const get = async (path: string, query = '') => {
  const token = await getToken();
  const url = path.startsWith(API_ENDPOINT)
    ? path
    : `${API_ENDPOINT}${path}?${query}&timestamp=${Date.now()}`;
  const response = await fetch(url, {
    headers: {
      authorization: `token ${token}`,
    },
  });

  if (response.status === 401) {
    throw new AuthorizationError(response.statusText);
  } else if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response;
};

const post = async (path: string, data = {}) => {
  const token = await getToken();
  const url = `${API_ENDPOINT}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: `token ${token}`,
    },
    body: JSON.stringify(data),
  });
  return response;
};

const del = async (path: string) => {
  const token = await getToken();
  const url = `${API_ENDPOINT}${path}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      authorization: `token ${token}`,
    },
  });
  return response;
};

export const getCurrentUser = async () => {
  const user = await get('user');
  const { avatar_url: avatarUrl, login, name } = await user.json();
  await storage.set({ login });
  return { avatarUrl, login, name };
};

export const parseLinkHeader = (link: string) => {
  const links = link.split(',').map(l => {
    const parts = l.split(';');

    const link = (parts[0] || '').trim().match(/<(.*?)>/);
    const rel = (parts[1] || '').match(/rel="(.*?)"/);

    return {
      link: link ? link[1] : '',
      rel: rel ? rel[1] : '',
    };
  });

  const result: Record<string, string> = {};

  links.forEach(({ rel, link }) => {
    result[rel] = link;
  });

  return result;
};

const getAllResponses = async (url: string) => {
  const maxResponses = 30;
  let responseCount = 1;

  const pageResponses = [];

  let query = `per_page=100`;
  let nextURL = url;

  while (responseCount < maxResponses) {
    const pageResponse = await get(nextURL, query);
    pageResponses.push(pageResponse);
    responseCount++;

    const linkHeader = pageResponse.headers.get('Link');
    const next = linkHeader && parseLinkHeader(linkHeader)['next'];
    if (next) {
      nextURL = next;
      query = '';
    } else {
      break;
    }
  }

  const jsons = await Promise.all(pageResponses.map(r => r.json()));

  return jsons.flat();
};

interface IssueComment {
  id: number;
  body: string;
  created_at: Date;
  user: {
    login: string;
    avatar_url: string;
  };
}
interface PrComment extends IssueComment {
  in_reply_to_id?: number;
  path: string;
}

export const getReviewComments = async (
  owner: string,
  repo: string,
  prNumber: number,
  login: string,
) => {
  const result = await getAllResponses(
    `repos/${owner}/${repo}/pulls/${prNumber}/comments`,
  );

  const byReviewId: Record<string, Channel> = {};

  result.forEach(
    ({
      body: bodyText,
      id,
      created_at: createdAt,
      in_reply_to_id: inReplyToId,
      user,
      path,
    }: PrComment) => {
      const idStr = `${id}`;
      const comment = {
        bodyText,
        createdAt: new Date(createdAt),
        id: idStr,
        inReplyToId,
        canDelete: login === user.login,
        author: {
          avatarUrl: user.avatar_url,
          login: user.login,
        },
      } as Comment;

      if (inReplyToId && byReviewId[inReplyToId]) {
        byReviewId[inReplyToId].comments.push(comment);
      } else {
        byReviewId[id] = {
          key: idStr,
          title: path.replace(/^.*[\\\/]/, ''),
          isReview: true,
          comments: [comment],
        };
      }
    },
  );

  return Object.values(byReviewId);
};

export const getPullRequest = async (
  owner: string,
  repo: string,
  prNumber: number,
): Promise<Pr> => {
  const login = await storage.get('login');
  const [pullRequest, commentsData, reviewComments] = await Promise.all([
    get(`repos/${owner}/${repo}/pulls/${prNumber}`).then(r => r.json()),
    get(`repos/${owner}/${repo}/issues/${prNumber}/comments`).then(r =>
      r.json(),
    ),
    getReviewComments(owner, repo, prNumber, login),
  ]);

  const comments = commentsData.map(
    ({ id, body: bodyText, user, created_at: createdAt }: IssueComment) => ({
      bodyText,
      createdAt: new Date(createdAt),
      id: `${id}`,
      canDelete: login === user.login,
      author: {
        avatarUrl: user.avatar_url,
        login: user.login,
      },
    }),
  );

  const pr = {
    id: `${pullRequest.id}`,
    bodyText: pullRequest.body,
    title: pullRequest.title,
    createdAt: new Date(pullRequest.created_at),
    author: {
      avatarUrl: pullRequest.user.avatar_url,
      login: pullRequest.user.login,
    },
  };

  const result = {
    ...pr,
    channels: [
      {
        key: pr.id,
        title: 'Main',
        isReview: false,
        comments: [{ ...pr, canDelete: false }, ...comments],
      },
      ...reviewComments,
    ],
  };

  return result;
};

export const createPullRequestComment = async (
  owner: string,
  repo: string,
  prNumber: number,
  isReview: boolean,
  body: string,
  commentId: string,
) => {
  if (isReview) {
    await post(
      `repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies`,
      { body },
    );
  } else {
    await post(`repos/${owner}/${repo}/issues/${prNumber}/comments`, { body });
  }
};

export const deletePullRequestComment = async (
  owner: string,
  repo: string,
  isReview: boolean,
  commentId: string,
) => {
  if (isReview) {
    await del(`repos/${owner}/${repo}/pulls/comments/${commentId}`);
  } else {
    await del(`repos/${owner}/${repo}/issues/comments/${commentId}`);
  }
};
