/* eslint-disable @typescript-eslint/no-var-requires */
import {
  AuthorizationError,
  getCurrentUser,
  parseLinkHeader,
  createPullRequestComment,
  deletePullRequestComment,
  getPullRequest,
} from './github';

const fetch = jest.fn();
global.fetch = fetch;

jest.mock('../utils/storage', () => {
  const set = jest.fn(() => Promise.resolve());
  const get = jest.fn(() => Promise.resolve());
  return {
    set,
    get,
  };
});

jest.spyOn(Date, 'now').mockReturnValue(0);

jest.useFakeTimers();

Object.defineProperty(Array.prototype, 'flat', {
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  value: function (depth: number = 1) {
    return this.reduce(function (flat: unknown[], toFlatten: unknown[]) {
      return flat.concat(
        Array.isArray(toFlatten) && depth > 1
          ? toFlatten.flat(depth - 1)
          : toFlatten,
      );
    }, []);
  },
});

describe('github', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const {
    get,
    set,
  }: { get: jest.Mock; set: jest.Mock } = require('../utils/storage');

  describe('getCurrentUser', () => {
    test('should throw authorization error if token is missing from storage', async () => {
      get.mockReturnValue(Promise.resolve(undefined));

      await expect(getCurrentUser()).rejects.toEqual(new AuthorizationError());

      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith('token');
    });

    test('should throw authorization error on invalid token', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      fetch.mockReturnValue({ status: 401, statusText: 'Unauthorized' });

      await expect(getCurrentUser()).rejects.toEqual(
        new AuthorizationError('Unauthorized'),
      );

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user?timestamp=0',
        {
          headers: {
            authorization: `token ${token}`,
          },
        },
      );
    });

    test('should throw error on not ok response', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      fetch.mockReturnValue({ ok: false, statusText: 'Not Found' });

      await expect(getCurrentUser()).rejects.toEqual(new Error('Not Found'));
    });

    test('should set login in storage and return user on valid response', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      const json = { login: 'login', avatar_url: 'avatar_url', name: 'name' };
      const response = {
        json: () => Promise.resolve(json),
        ok: true,
        status: 200,
      };
      fetch.mockReturnValue(response);

      const result = await getCurrentUser();

      expect(set).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith({ login: json.login });

      const { avatar_url: avatarUrl, login, name } = json;
      expect(result).toEqual({ avatarUrl, login, name });
    });
  });

  describe('parseLinkHeader', () => {
    test('should parse link header', () => {
      const link = `<https://api.github.com/search/code?q=addClass+user%3Amozilla&page=2>; rel="next", <https://api.github.com/search/code?q=addClass+user%3Amozilla&page=34>; rel="last"`;
      expect(parseLinkHeader(link)).toEqual({
        next:
          'https://api.github.com/search/code?q=addClass+user%3Amozilla&page=2',
        last:
          'https://api.github.com/search/code?q=addClass+user%3Amozilla&page=34',
      });
    });
  });

  describe('createPullRequestComment', () => {
    test('should post request for pull request reply thread', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      const response = {
        ok: true,
        status: 201,
      };
      fetch.mockReturnValue(response);

      await createPullRequestComment(
        'owner',
        'repo',
        1,
        true,
        'body',
        'commentId',
      );

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/1/comments/commentId/replies',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `token ${token}`,
          },
          body: JSON.stringify({ body: 'body' }),
        },
      );
    });

    test('should post request for pull request main thread', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      const response = {
        ok: true,
        status: 201,
      };
      fetch.mockReturnValue(response);

      await createPullRequestComment('owner', 'repo', 1, false, 'body', '');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/1/comments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `token ${token}`,
          },
          body: JSON.stringify({ body: 'body' }),
        },
      );
    });
  });

  describe('deletePullRequestComment', () => {
    test('should delete request for pull request reply comment', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      const response = {
        status: 204,
      };
      fetch.mockReturnValue(response);

      await deletePullRequestComment('owner', 'repo', true, 'commentId');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls/comments/commentId',
        {
          method: 'DELETE',
          headers: {
            authorization: `token ${token}`,
          },
        },
      );
    });

    test('should post request for pull request main thread', async () => {
      const token = 'token';
      get.mockReturnValue(Promise.resolve(token));

      const response = {
        ok: true,
        status: 201,
      };
      fetch.mockReturnValue(response);

      await deletePullRequestComment('owner', 'repo', false, 'commentId');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues/comments/commentId',
        {
          method: 'DELETE',
          headers: {
            authorization: `token ${token}`,
          },
        },
      );
    });
  });

  describe('getPullRequest', () => {
    test('should return pull request data', async () => {
      get.mockImplementation((key: string) => {
        if (key === 'token') {
          return Promise.resolve('token');
        }
        if (key === 'login') {
          return Promise.resolve('login');
        }

        return Promise.resolve();
      });

      const pullRequest = {
        id: 1,
        body: 'body',
        title: 'title',
        created_at: new Date(0).toISOString(),
        user: {
          avatar_url: 'avatar_url',
          login: 'login',
        },
      };

      const pullsResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(pullRequest),
      };

      const issueComments = [
        {
          id: 100,
          body: 'issue comment',
          user: {
            avatar_url: 'avatar_url',
            login: 'login',
          },
          created_at: new Date(1).toISOString(),
        },
      ];

      const issueCommentsResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(issueComments),
      };

      const prComments = [
        {
          body: 'pr comment 1',
          id: 1000,
          created_at: new Date(2).toISOString(),
          user: {
            avatar_url: 'avatar_url',
            login: 'login',
          },
          path: 'Readme.md',
        },
        {
          body: 'pr comment 2',
          id: 2000,
          created_at: new Date(2).toISOString(),
          in_reply_to_id: 1000,
          user: {
            avatar_url: 'avatar_url',
            login: 'login',
          },
          path: 'Readme.md',
        },
      ];

      const link = `<https://api.github.com/page2>; rel="next", <https://api.github.com/page10>; rel="last"`;
      const prCommentsResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve(prComments),
        headers: { get: jest.fn(() => link) },
      };

      fetch.mockImplementation((...args) => {
        if (
          args[0] ===
          'https://api.github.com/repos/owner/repo/pulls/1?timestamp=0'
        ) {
          return Promise.resolve(pullsResponse);
        }
        if (
          args[0] ===
          'https://api.github.com/repos/owner/repo/issues/1/comments?timestamp=0'
        ) {
          return Promise.resolve(issueCommentsResponse);
        }
        if (
          args[0] ===
          'https://api.github.com/repos/owner/repo/pulls/1/comments?per_page=100&timestamp=0'
        ) {
          return Promise.resolve(prCommentsResponse);
        }

        if (args[0] === 'https://api.github.com/page2') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve([]),
            headers: { get: jest.fn() },
          });
        }

        return Promise.resolve({});
      });

      const result = await getPullRequest('owner', 'repo', 1);

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
      expect(result).toEqual({
        ...pr,
        channels: [
          {
            key: pr.id,
            title: 'Main',
            isReview: false,
            comments: [
              { ...pr, canDelete: false },
              {
                id: '100',
                bodyText: 'issue comment',
                author: {
                  avatarUrl: 'avatar_url',
                  login: 'login',
                },
                createdAt: new Date(1),
                canDelete: true,
              },
            ],
          },
          {
            key: `${prComments[0].id}`,
            title: prComments[0].path,
            isReview: true,
            comments: [
              {
                bodyText: 'pr comment 1',
                id: '1000',
                createdAt: new Date(2),
                inReplyToId: undefined,
                author: {
                  avatarUrl: 'avatar_url',
                  login: 'login',
                },
                canDelete: true,
              },
              {
                bodyText: 'pr comment 2',
                id: '2000',
                createdAt: new Date(2),
                inReplyToId: 1000,
                author: {
                  avatarUrl: 'avatar_url',
                  login: 'login',
                },
                canDelete: true,
              },
            ],
          },
        ],
      });
    });
  });
});
