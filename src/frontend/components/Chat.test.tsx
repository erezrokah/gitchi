/* eslint-disable @typescript-eslint/no-var-requires */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import WS from 'jest-websocket-mock';
import {
  parseLocation,
  Chat,
  fetchCurrentUser,
  ActionType,
  reducer,
  onSendMessage,
  onDeleteMessage,
} from './Chat';
import { Pr, User } from './types';
import { AuthorizationError } from '../lib/github';

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock('../lib/github', () => {
  const { AuthorizationError } = jest.requireActual('../lib/github');
  return {
    AuthorizationError,
    getCurrentUser: jest.fn(() => Promise.resolve()),
    getPullRequest: jest.fn(() => Promise.resolve()),
    createPullRequestComment: jest.fn(() => Promise.resolve()),
    deletePullRequestComment: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('./Auth', () => {
  return {
    Auth: function auth({ onAuthSuccess }: { onAuthSuccess: jest.Mock }) {
      return (
        <div onClick={onAuthSuccess} data-testid="mocked-auth-component">
          Auth
        </div>
      );
    },
  };
});

jest.mock('../utils/webSocket', () => {
  return {
    getWebSocketUrl: jest.fn(() => Promise.resolve()),
  };
});

jest.spyOn(console, 'log').mockImplementation(() => {});

const location = { href: 'https://github.com/' };
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
global.window = Object.create(window);
Object.defineProperty(window, 'location', {
  value: location,
});

describe('Chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('parseLocation', () => {
    test('should extract owner, repo and pr number from location href', () => {
      location.href = 'https://github.com/owner/repo/pull/666';

      expect(parseLocation()).toEqual({
        owner: 'owner',
        repo: 'repo',
        prNumber: 666,
      });
    });

    test('return null on none pull request url', () => {
      location.href = 'https://github.com/owner/repo/issues/111';

      expect(parseLocation()).toBeNull();
    });
  });

  const user: User = {
    name: 'name',
    avatarUrl: 'avatarUrl',
    login: 'login',
  };

  const author = {
    avatarUrl: 'authorAvatarUrl',
    login: 'authorLogin',
  };

  const pr: Pr = {
    id: '1',
    bodyText: 'bodyText',
    title: 'title',
    author,
    channels: [
      {
        key: '1',
        title: 'Main',
        isReview: false,
        comments: [
          {
            id: '100',
            bodyText: 'comment 100',
            createdAt: new Date(0),
            author,
            canDelete: false,
          },
        ],
      },
      {
        key: '2',
        title: 'Channel 2',
        isReview: true,
        comments: [
          {
            id: '200',
            bodyText: 'comment 200',
            createdAt: new Date(100),
            author: user,
            canDelete: true,
          },
        ],
      },
    ],
  };

  const {
    getCurrentUser,
    getPullRequest,
    createPullRequestComment,
    deletePullRequestComment,
  } = require('../lib/github') as {
    getCurrentUser: jest.Mock;
    getPullRequest: jest.Mock;
    createPullRequestComment: jest.Mock;
    deletePullRequestComment: jest.Mock;
  };

  const { getWebSocketUrl } = require('../utils/webSocket') as {
    getWebSocketUrl: jest.Mock;
  };

  describe('Chat', () => {
    afterEach(() => {
      WS.clean();
    });

    test('should match snapshot when loading', async () => {
      await act(async () => {
        const { asFragment } = render(<Chat />);
        expect(asFragment()).toMatchSnapshot();
        expect(getCurrentUser as jest.Mock).toHaveBeenCalledTimes(0);
      });
    });

    test('should match snapshot when not loading, but unauthenticated', async () => {
      await act(async () => {
        const userPromise = Promise.resolve();
        getCurrentUser.mockReturnValue(userPromise);
        const { asFragment, rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        expect(asFragment()).toMatchSnapshot();
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
      });
    });

    test('should match snapshot when not loading, authenticated but no pr', async () => {
      await act(async () => {
        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const { asFragment, rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        expect(asFragment()).toMatchSnapshot();
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
      });
    });

    test('should match snapshot when not loading, authenticated with pr', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const { asFragment, rerender, getByText, queryByText } = render(
          <Chat />,
        );

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        expect(asFragment()).toMatchSnapshot();
        expect(getCurrentUser).toHaveBeenCalledTimes(1);
        expect(getPullRequest).toHaveBeenCalledTimes(1);
        expect(getPullRequest).toHaveBeenCalledWith('owner', 'repo', 666);

        expect(
          getByText(pr.channels[0].comments[0].bodyText),
        ).toBeInTheDocument();
        expect(queryByText(pr.channels[1].comments[0].bodyText)).toBeNull();
      });
    });

    test('should match snapshot when collapsed', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const { asFragment, rerender, getByTitle, queryByText } = render(
          <Chat />,
        );

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        fireEvent.click(getByTitle('Collapse'));

        expect(asFragment()).toMatchSnapshot();

        expect(queryByText(pr.channels[0].comments[0].bodyText)).toBeNull();
        expect(queryByText(pr.channels[1].comments[0].bodyText)).toBeNull();
      });
    });

    test('should match snapshot channel is selected', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const {
          asFragment,
          rerender,
          getByTitle,
          getByText,
          queryByText,
        } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        fireEvent.click(getByTitle(pr.channels[1].title));

        expect(asFragment()).toMatchSnapshot();

        expect(
          getByText(pr.channels[1].comments[0].bodyText),
        ).toBeInTheDocument();
        expect(queryByText(pr.channels[0].comments[0].bodyText)).toBeNull();
      });
    });

    test('should call createPullRequestComment when send message button is clicked', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const { getByTestId, rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        fireEvent.click(getByTestId('sendMessageButton'));

        expect(createPullRequestComment).toHaveBeenCalledTimes(1);
        expect(createPullRequestComment).toHaveBeenCalledWith(
          'owner',
          'repo',
          666,
          pr.channels[0].isReview,
          '',
          pr.channels[0].key,
        );
      });
    });

    test('should call deletePullRequestComment when delete button is clicked', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const { getByTitle, rerender, getByTestId } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        fireEvent.click(getByTitle(pr.channels[1].title));
        fireEvent.click(
          getByTestId(`delete-comment-${pr.channels[1].comments[0].id}`),
        );

        expect(deletePullRequestComment).toHaveBeenCalledTimes(1);
        expect(deletePullRequestComment).toHaveBeenCalledWith(
          'owner',
          'repo',

          pr.channels[1].isReview,
          pr.channels[1].comments[0].id,
        );
      });
    });

    test('should add listeners to web socket', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const url = 'ws://localhost:1234';
        const webSocketUrlPromise = Promise.resolve(url);
        getWebSocketUrl.mockReturnValue(webSocketUrlPromise);
        const server = new WS('ws://localhost:1234');

        const { rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        rerender(<Chat />);

        await webSocketUrlPromise;

        expect(getWebSocketUrl).toHaveBeenCalledTimes(1);

        await server.connected;
        server.send('invalid json');
        server.close();

        expect(console.log).toHaveBeenCalledWith('GitHub WebSocket open');
        expect(console.log).toHaveBeenCalledWith(
          'error',
          new SyntaxError('Unexpected token i in JSON at position 0'),
        );
        expect(console.log).toHaveBeenCalledWith('GitHub WebSocket close');

        await expect(server).toReceiveMessage(
          `subscribe:pull_request:${pr.id}`,
        );
      });
    });

    test('should fetch pr data on pull_request update message', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const url = 'ws://localhost:1234';
        const webSocketUrlPromise = Promise.resolve(url);
        getWebSocketUrl.mockReturnValue(webSocketUrlPromise);
        const server = new WS('ws://localhost:1234');

        const { rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        rerender(<Chat />);

        await webSocketUrlPromise;

        await server.connected;

        const data = [
          `pull_request:${pr.id}`,
          {
            timestamp: 5,
            wait: 200,
            reason: `pull request #${pr.id} updated`,
          },
        ];

        jest.clearAllMocks();
        jest.useFakeTimers();

        server.send(JSON.stringify(data));

        expect(console.log).toHaveBeenCalledWith(
          'GitHub Pull Request Updated',
          {
            id: pr.id,
            timestamp: 5,
            wait: 200,
            reason: `pull request #${pr.id} updated`,
          },
        );
        jest.advanceTimersByTime(300);
        expect(getPullRequest).toHaveBeenCalledTimes(1);
      });
    });

    test('should ignore non pull_request update messages', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const url = 'ws://localhost:1234';
        const webSocketUrlPromise = Promise.resolve(url);
        getWebSocketUrl.mockReturnValue(webSocketUrlPromise);
        const server = new WS('ws://localhost:1234');

        const { rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        rerender(<Chat />);

        await webSocketUrlPromise;

        await server.connected;

        const data = [`some_other_message`];

        jest.clearAllMocks();
        jest.useFakeTimers();

        server.send(JSON.stringify(data));

        expect(console.log).not.toHaveBeenCalledWith(
          'GitHub Pull Request Updated',
        );
        jest.advanceTimersByTime(300);
        expect(getPullRequest).toHaveBeenCalledTimes(0);
      });
    });

    test('should fetch pr data when send refresh button is clicked', async () => {
      await act(async () => {
        location.href = 'https://github.com/owner/repo/pull/666';

        const userPromise = Promise.resolve(user);
        getCurrentUser.mockReturnValue(userPromise);

        const prPromise = Promise.resolve(pr);
        getPullRequest.mockReturnValue(prPromise);

        const { getByTitle, rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        rerender(<Chat />);

        await prPromise;

        jest.clearAllMocks();

        fireEvent.click(getByTitle('Refresh'));

        expect(getPullRequest).toHaveBeenCalledTimes(1);
        expect(getPullRequest).toHaveBeenCalledWith('owner', 'repo', 666);
      });
    });

    test('should call getCurrentUser when onAuthSuccess is invoked', async () => {
      await act(async () => {
        const userPromise = Promise.resolve();
        getCurrentUser.mockReturnValue(userPromise);
        const { getByTestId, rerender } = render(<Chat />);

        rerender(<Chat />);

        await userPromise;

        jest.clearAllMocks();

        fireEvent.click(getByTestId('mocked-auth-component'));

        expect(getCurrentUser).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('fetchCurrentUser', () => {
    test('should dispatch user received action on success', async () => {
      const user = {};
      const promise = Promise.resolve(user);
      getCurrentUser.mockReturnValue(promise);
      const dispatch = jest.fn();

      fetchCurrentUser(dispatch);
      await promise;

      expect(getCurrentUser).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: ActionType.USER_RECEIVED,
        payload: user,
      });
    });

    test('should dispatch auth error action on auth error', async () => {
      const error = new AuthorizationError();
      const promise = Promise.reject(error);
      getCurrentUser.mockReturnValue(promise);
      const dispatch = jest.fn();

      fetchCurrentUser(dispatch);
      await promise.catch(() => {});

      expect(getCurrentUser).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: ActionType.API_AUTH_ERROR_RECEIVED,
      });
    });

    test('should dispatch unknown error action on unknown error', async () => {
      const error = new Error();
      const promise = Promise.reject(error);
      getCurrentUser.mockReturnValue(promise);
      const dispatch = jest.fn();

      fetchCurrentUser(dispatch);
      await promise.catch(() => {});

      expect(getCurrentUser).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith({
        type: ActionType.API_UNKNOWN_ERROR_RECEIVED,
      });
    });
  });

  describe('reducer', () => {
    test(ActionType.USER_RECEIVED, () => {
      expect(
        reducer(
          { collapsed: false, loading: true },
          { type: ActionType.USER_RECEIVED, payload: user },
        ),
      ).toEqual({ collapsed: false, loading: false, user });
    });

    test(ActionType.API_AUTH_ERROR_RECEIVED, () => {
      expect(
        reducer(
          { collapsed: false, loading: true },
          { type: ActionType.API_AUTH_ERROR_RECEIVED },
        ),
      ).toEqual({ collapsed: false, loading: false });
    });

    test(ActionType.API_UNKNOWN_ERROR_RECEIVED, () => {
      expect(
        reducer(
          { collapsed: false, loading: true },
          { type: ActionType.API_UNKNOWN_ERROR_RECEIVED },
        ),
      ).toEqual({ collapsed: false, loading: false });
    });

    test(ActionType.MENU_TOGGLED, () => {
      expect(
        reducer(
          { collapsed: false, loading: true },
          { type: ActionType.MENU_TOGGLED, payload: true },
        ),
      ).toEqual({ loading: true, collapsed: true });
    });

    test(`${ActionType.PR_RECEIVED} initial load`, () => {
      expect(
        reducer(
          { collapsed: false, loading: false },
          { type: ActionType.PR_RECEIVED, payload: pr },
        ),
      ).toEqual({
        collapsed: false,
        loading: false,
        pr,
        selectedChannel: pr.channels[0].key,
      });
    });

    test(`${ActionType.PR_RECEIVED} selected channel removed`, () => {
      expect(
        reducer(
          { collapsed: false, loading: false, selectedChannel: 'Channel 1000' },
          { type: ActionType.PR_RECEIVED, payload: pr },
        ),
      ).toEqual({
        collapsed: false,
        loading: false,
        pr,
        selectedChannel: pr.channels[0].key,
      });
    });

    test(`${ActionType.PR_RECEIVED} selected channel not removed`, () => {
      expect(
        reducer(
          {
            collapsed: false,
            loading: false,
            selectedChannel: pr.channels[1].key,
          },
          { type: ActionType.PR_RECEIVED, payload: pr },
        ),
      ).toEqual({
        collapsed: false,
        loading: false,
        pr,
        selectedChannel: pr.channels[1].key,
      });
    });

    test(ActionType.CHANNEL_SELECTED, () => {
      expect(
        reducer(
          { collapsed: false, loading: false, selectedChannel: '1' },
          { type: ActionType.CHANNEL_SELECTED, payload: '2' },
        ),
      ).toEqual({ collapsed: false, loading: false, selectedChannel: '2' });
    });

    test('default', () => {
      const state = { collapsed: false, loading: false };
      expect(
        reducer(
          state,
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          { type: 'Unknown' },
        ),
      ).toBe(state);
    });
  });

  describe('onSendMessage', () => {
    test('should not call createPullRequestComment when location parsing fails', async () => {
      location.href = 'https://github.com/owner/repo/issues/111';

      await onSendMessage({
        key: 'key',
        title: 'title',
        isReview: false,
        comments: [],
      })('message');

      expect(createPullRequestComment).toHaveBeenCalledTimes(0);
    });

    test('should not call createPullRequestComment when activeChannel is undefined', async () => {
      location.href = 'https://github.com/owner/repo/pull/666';

      await onSendMessage(undefined)('message');

      expect(createPullRequestComment).toHaveBeenCalledTimes(0);
    });
  });

  describe('onDeleteMessage', () => {
    test('should not call deletePullRequestComment when location parsing fails', async () => {
      location.href = 'https://github.com/owner/repo/issues/111';

      await onDeleteMessage({
        key: 'key',
        title: 'title',
        isReview: false,
        comments: [],
      })('message');

      expect(deletePullRequestComment).toHaveBeenCalledTimes(0);
    });

    test('should not call deletePullRequestComment when activeChannel is undefined', async () => {
      location.href = 'https://github.com/owner/repo/pull/666';

      await onDeleteMessage(undefined)('message');

      expect(deletePullRequestComment).toHaveBeenCalledTimes(0);
    });
  });
});
