import * as React from 'react';
import { useEffect, useReducer } from 'react';
import {
  getCurrentUser,
  getPullRequest,
  AuthorizationError,
} from '../lib/github';
import { ChatMenu as Menu } from './ChatMenu';
import { ChatFeed as Feed } from './ChatFeed';
import { Auth } from './Auth';

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
  channel: 'main',
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

type GetCurrentUserType = typeof getCurrentUser;

export const useGetCurrentUserCallback = (
  getCurrentUser: GetCurrentUserType,
  dispatch: Dispatch,
) => {
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

type GetPullRequestType = typeof getPullRequest;

export const useGetPullRequestCallback = (
  getPullRequest: GetPullRequestType,
  dispatch: Dispatch,
) => {
  let isSubscribed = true;
  const match = window.location.href.match(
    /https:\/\/github.com\/(.+?)\/(.+?)\/pull\/(\d+)/,
  );
  if (match) {
    getPullRequest(match[1], match[2], parseInt(match[3])).then(pr => {
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
  useEffect(() => useGetCurrentUserCallback(getCurrentUser, dispatch), [
    dispatch,
  ]);
};

const useGetPullRequestEffect = (
  user: User | undefined,
  dispatch: Dispatch,
) => {
  useEffect(() => {
    if (user) {
      useGetPullRequestCallback(getPullRequest, dispatch);
    }
  }, [user, dispatch]);
};

export const Chat = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useGetCurrentUserEffect(dispatch);
  useGetPullRequestEffect(state.user, dispatch);

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

  if (!state.user || !state.pr) {
    return <Auth onAuthSuccess={onAuthSuccess} />;
  }

  const { collapsed, pr, channel } = state;

  const activeChannel = pr.channels.find(c => c.key === channel);
  const comments = activeChannel ? activeChannel.comments : [];

  return (
    <div>
      <Menu
        onMenuToggle={toggleMenu}
        onChannelSelect={selectChannel}
        channels={pr.channels.map(({ key, title }) => ({ key, title }))}
      />
      {collapsed ? null : <Feed comments={comments} />}
    </div>
  );
};
