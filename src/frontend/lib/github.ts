export class AuthorizationError extends Error {}

const getToken = async () => {
  const tokenPromise: Promise<Record<string, string>> = new Promise(
    (resolve, reject) => {
      chrome.storage.sync.get(['token'], ({ token }) => {
        if (token) {
          resolve(token);
        } else {
          reject(new AuthorizationError());
        }
      });
    },
  );

  const token = await tokenPromise;

  return token;
};

const API_ENDPOINT = 'https://api.github.com/';

const get = async (path: string) => {
  const token = await getToken();
  const url = path.startsWith(API_ENDPOINT)
    ? path
    : `${API_ENDPOINT}${path}?timestamp=${Date.now()}`;
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

export const getCurrentUser = async () => {
  const user = await get('user');
  const { avatar_url: avatarUrl, login, name } = await user.json();
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

  let nextURL = url;

  while (responseCount < maxResponses) {
    const pageResponse = await get(nextURL);
    pageResponses.push(pageResponse);
    responseCount++;

    const linkHeader = pageResponse.headers.get('Link');
    const next = linkHeader && parseLinkHeader(linkHeader)['next'];
    if (next) {
      nextURL = next;
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
        createdAt,
        id: idStr,
        inReplyToId,
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
  const [pullRequest, commentsData, reviewComments] = await Promise.all([
    get(`repos/${owner}/${repo}/pulls/${prNumber}`).then(r => r.json()),
    get(`repos/${owner}/${repo}/issues/${prNumber}/comments`).then(r =>
      r.json(),
    ),
    getReviewComments(owner, repo, prNumber),
  ]);

  const comments = commentsData.map(
    ({ id, body: bodyText, user, created_at: createdAt }: IssueComment) => ({
      bodyText,
      createdAt,
      id: `${id}`,
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
        comments: [pr, ...comments],
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
    const result = await post(
      `repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies`,
      { body },
    );
    console.log(await result.json());
  } else {
    const result = await post(
      `repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { body },
    );
    console.log(await result.json());
  }
};
