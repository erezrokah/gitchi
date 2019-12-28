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
import { getWebSocketUrl } from '../utils/webSocket';
import { User, Pr, Channel } from './types';

interface State {
  collapsed: boolean;
  loading: boolean;
  user?: User;
  pr?: Pr;
  selectedChannel?: string;
}

const initialState: State = {
  collapsed: false,
  loading: true,
};

type Payload = boolean | User | Pr | string;

export enum ActionType {
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
      let { selectedChannel } = state;

      if (
        // initial load
        !selectedChannel ||
        // if the channel was removed
        !pr.channels.some(c => c.key === selectedChannel)
      ) {
        selectedChannel = pr.channels[0].key;
      }

      return { ...state, pr, selectedChannel };
    }
    case ActionType.CHANNEL_SELECTED: {
      const selectedChannel = action.payload as string;
      return { ...state, selectedChannel };
    }
    default: {
      return state;
    }
  }
};

export const fetchCurrentUser = (dispatch: Dispatch) => {
  getCurrentUser()
    .then(user => {
      dispatch({
        type: ActionType.USER_RECEIVED,
        payload: user,
      });
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
};

export const parseLocation = () => {
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
  const parsed = parseLocation();
  if (parsed) {
    const { owner, repo, prNumber } = parsed;
    getPullRequest(owner, repo, prNumber).then(pr => {
      dispatch({
        payload: pr,
        type: ActionType.PR_RECEIVED,
      });
    });
  }
};

export const useGetCurrentUserEffect = (dispatch: Dispatch) => {
  useEffect(() => fetchCurrentUser(dispatch), [dispatch]);
};

export const useGetPullRequestEffect = (
  user: User | undefined,
  dispatch: Dispatch,
) => {
  useEffect(() => {
    if (user) {
      return fetchPullRequest(dispatch);
    }
    return () => undefined;
  }, [user, dispatch]);
};

export const useWebSocketEffect = (
  user: User | undefined,
  prId: string | undefined,
  dispatch: Dispatch,
) => {
  useEffect(() => {
    let timeout: number | null = null;
    let socket: WebSocket | null = null;

    const onOpen = () => {
      console.log('GitHub WebSocket open');
      socket && socket.send(`subscribe:pull_request:${prId}`);
    };

    const onClose = () => {
      console.log('GitHub WebSocket close');
    };

    const onMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data[0] && data[0].startsWith('pull_request:')) {
          const pr = {
            id: data[0].split(':')[1] as string,
            ...data[1],
          };
          console.log('GitHub Pull Request Updated', pr);
          timeout = setTimeout(() => fetchPullRequest(dispatch), pr.wait);
        }
      } catch (e) {
        console.log('error', e);
      }
    };

    if (user && prId) {
      console.log(user, prId);
      getWebSocketUrl().then(url => {
        if (url) {
          socket = new WebSocket(url);

          socket.addEventListener('open', onOpen);
          socket.addEventListener('close', onClose);
          socket.addEventListener('message', onMessage);
        }
      });
    }

    return () => {
      if (socket) {
        socket.removeEventListener('message', onMessage);
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('close', onClose);
        socket.close();
      }
      if (timeout) {
        clearTimeout(timeout as number);
      }
    };
  }, [user, prId, dispatch]);
};

export const onSendMessage = (activeChannel: Channel | undefined) => async (
  message: string,
) => {
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

export const onDeleteMessage = (activeChannel: Channel | undefined) => async (
  id: string,
) => {
  const parsed = parseLocation();
  if (parsed && activeChannel) {
    const { owner, repo } = parsed;
    const { isReview } = activeChannel;
    await deletePullRequestComment(owner, repo, isReview, id);
  }
};

export const Chat = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useGetCurrentUserEffect(dispatch);
  useGetPullRequestEffect(state.user, dispatch);
  useWebSocketEffect(state.user, state.pr ? state.pr.id : '', dispatch);

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

  const { collapsed, pr, selectedChannel } = state;

  const activeChannel = pr.channels.find(
    c => c.key === selectedChannel,
  ) as Channel;
  const comments = activeChannel.comments;

  return (
    <div>
      <Menu
        onMenuToggle={toggleMenu}
        onChannelSelect={selectChannel}
        channels={pr.channels}
        onRefreshClicked={refreshData}
      />
      {collapsed ? null : (
        <Feed
          comments={comments}
          onDeleteMessage={onDeleteMessage(activeChannel)}
        />
      )}
      {collapsed ? null : (
        <MessageBox onSendMessage={onSendMessage(activeChannel)} />
      )}
    </div>
  );
};
