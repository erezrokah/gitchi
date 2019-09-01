import * as React from 'react';
import { useEffect, useReducer } from 'react';
import {
  getCurrentUser,
  getPullRequest,
  AuthorizationError,
  createPullRequestComment,
  deletePullRequestComment,
} from '../lib/github';
import { ChatMenu as Menu } from './ChatMenu';
import { ChatFeed as Feed } from './ChatFeed';
import { Auth } from './Auth';
import { MessageBox } from './MessageBox';

interface State {
  collapsed: boolean;
  loading: boolean;
  user?: User;
  pr?: Pr;
  channel: string;
}

const initialState: State = {
  collapsed: false,
  loading: true,
  channel: '',
};

type Payload = boolean | User | Pr | string;

enum ActionType {
  USER_RECEIVED = 'USER_RECEIVED',
  API_AUTH_ERROR_RECEIVED = 'API_AUTH_ERROR_RECEIVED',
  API_UNKNOWN_ERROR_RECEIVED = 'API_UNKNOWN_ERROR_RECEIVED',
  MENU_TOGGLED = 'MENU_TOGGLED',
  PR_RECEIVED = 'PR_RECEIVED',
  CHANNEL_SELECTED = 'CHANNEL_SELECTED',
}

interface Action {
  type: ActionType;
  payload?: Payload;
}

type Dispatch = React.Dispatch<Action>;

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.USER_RECEIVED: {
      const user = action.payload as User;
      return { ...state, user, loading: false };
    }
    case ActionType.API_AUTH_ERROR_RECEIVED: {
      return { ...state, loading: false };
    }
    case ActionType.API_UNKNOWN_ERROR_RECEIVED: {
      return { ...state, loading: false };
    }
    case ActionType.MENU_TOGGLED: {
      const collapsed = action.payload as boolean;
      return { ...state, collapsed };
    }
    case ActionType.PR_RECEIVED: {
      const pr = action.payload as Pr;
      return { ...state, pr };
    }
    case ActionType.CHANNEL_SELECTED: {
      const channel = action.payload as string;
      return { ...state, channel };
    }
    default: {
      return state;
    }
  }
};

export const fetchCurrentUser = (dispatch: Dispatch) => {
  let isSubscribed = true;
  getCurrentUser()
    .then(user => {
      if (isSubscribed) {
        dispatch({
          type: ActionType.USER_RECEIVED,
          payload: user,
        });
      }
    })
    .catch(e => {
      if (e instanceof AuthorizationError) {
        dispatch({
          type: ActionType.API_AUTH_ERROR_RECEIVED,
        });
      } else {
        dispatch({
          type: ActionType.API_UNKNOWN_ERROR_RECEIVED,
        });
      }
    });

  return () => {
    isSubscribed = false;
  };
};

const parseLocation = () => {
  const match = window.location.href.match(
    /https:\/\/github.com\/(.+?)\/(.+?)\/pull\/(\d+)/,
  );

  if (match) {
    return { owner: match[1], repo: match[2], prNumber: parseInt(match[3]) };
  } else {
    return null;
  }
};

export const fetchPullRequest = (dispatch: Dispatch) => {
  let isSubscribed = true;
  const parsed = parseLocation();
  if (parsed) {
    const { owner, repo, prNumber } = parsed;
    getPullRequest(owner, repo, prNumber).then(pr => {
      if (isSubscribed) {
        dispatch({
          payload: pr,
          type: ActionType.PR_RECEIVED,
        });
      }
    });
  }

  return () => {
    isSubscribed = false;
  };
};

const useGetCurrentUserEffect = (dispatch: Dispatch) => {
  useEffect(() => fetchCurrentUser(dispatch), [dispatch]);
};

const useGetPullRequestEffect = (
  user: User | undefined,
  dispatch: Dispatch,
) => {
  useEffect(() => {
    if (user) {
      return fetchPullRequest(dispatch);
    }
    return () => {};
  }, [user, dispatch]);
};

const useWebSocketEffect = (user: User | undefined, dispatch: Dispatch) => {
  useEffect(() => {
    let timeout: number | null = null;
    if (user) {
      const webSocketLink = document.querySelector(
        'link[rel="web-socket"]',
      ) as HTMLLinkElement;

      if (webSocketLink) {
        const socket = new WebSocket(webSocketLink.href);

        socket.addEventListener('open', () => {
          console.log('GitHub WebSocket open');
        });

        socket.addEventListener('close', () => {
          console.log('GitHub WebSocket close');
        });

        // Listen for messages
        socket.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data[0] && data[0].startsWith('pull_request:')) {
              const pr = {
                id: data[0].split(':')[1] || '',
                ...data[1],
              };
              console.log('GitHub Pull Request Updated', pr);
              timeout = setTimeout(() => fetchPullRequest(dispatch), pr.wait);
            }
          } catch (e) {
            console.log('error', e);
          }
        });
      }
    }
    if (timeout) {
      return () => clearTimeout(timeout as number);
    } else {
      return () => {};
    }
  }, [user, dispatch]);
};

export const Chat = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useGetCurrentUserEffect(dispatch);
  useGetPullRequestEffect(state.user, dispatch);
  useWebSocketEffect(state.user, dispatch);

  const toggleMenu = (collapsed: boolean) => {
    dispatch({
      type: ActionType.MENU_TOGGLED,
      payload: collapsed,
    });
  };

  const selectChannel = (key: string) => {
    dispatch({
      type: ActionType.CHANNEL_SELECTED,
      payload: key,
    });
  };

  const refreshData = () => {
    fetchPullRequest(dispatch);
  };

  const onAuthSuccess = async () => {
    const user = await getCurrentUser();
    dispatch({
      type: ActionType.USER_RECEIVED,
      payload: user,
    });
  };

  if (state.loading) {
    return <div />;
  }

  if (!state.user) {
    return <Auth onAuthSuccess={onAuthSuccess} />;
  }

  if (!state.pr) {
    return <div />;
  }

  const { collapsed, pr, channel } = state;

  const activeChannel = channel
    ? pr.channels.find(c => c.key === channel) || pr.channels[0]
    : pr.channels[0];

  const onSendMessage = async (message: string) => {
    const parsed = parseLocation();
    if (parsed && activeChannel) {
      const { owner, repo, prNumber } = parsed;
      const { isReview, key } = activeChannel;
      await createPullRequestComment(
        owner,
        repo,
        prNumber,
        isReview,
        message,
        key,
      );
    }
  };

  const onDeleteMessage = async (id: string) => {
    const parsed = parseLocation();
    if (parsed && activeChannel) {
      const { owner, repo } = parsed;
      const { isReview } = activeChannel;
      await deletePullRequestComment(owner, repo, isReview, id);
    }
  };

  const comments = activeChannel ? activeChannel.comments : [];

  return (
    <div>
      <Menu
        onMenuToggle={toggleMenu}
        onChannelSelect={selectChannel}
        channels={pr.channels}
        onRefreshClicked={refreshData}
      />
      {collapsed ? null : (
        <Feed comments={comments} onDeleteMessage={onDeleteMessage} />
      )}
      {collapsed ? null : <MessageBox onSendMessage={onSendMessage} />}
    </div>
  );
};
