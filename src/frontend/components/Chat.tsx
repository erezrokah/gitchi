import * as React from 'react';
import { useEffect, useReducer } from 'react';
import { getCurrentUser, AuthorizationError } from '../lib/github';
import { ChatMenu as Menu } from './ChatMenu';
import { ChatFeed as Feed } from './ChatFeed';
import { Auth } from './Auth';

interface User {
  login: string;
}
interface State {
  collapsed: boolean;
  loading: boolean;
  user?: User;
}

const initialState: State = {
  collapsed: false,
  loading: true,
};

type Payload = boolean | User;

enum ActionType {
  USER_RECEIVED = 'USER_RECEIVED',
  API_AUTH_ERROR_RECEIVED = 'API_AUTH_ERROR_RECEIVED',
  API_UNKNOWN_ERROR_RECEIVED = 'API_UNKNOWN_ERROR_RECEIVED',
  MENU_TOGGLED = 'MENU_TOGGLED',
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

const useGetCurrentUserEffect = (dispatch: Dispatch) => {
  useEffect(() => useGetCurrentUserCallback(getCurrentUser, dispatch), [
    dispatch,
  ]);
};

export const Chat = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useGetCurrentUserEffect(dispatch);

  const toggleMenu = (collapsed: boolean) => {
    dispatch({
      type: ActionType.MENU_TOGGLED,
      payload: collapsed,
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

  if (!state.user) {
    return <Auth onAuthSuccess={onAuthSuccess} />;
  }

  const { collapsed } = state;

  return (
    <div>
      <Menu onMenuToggle={toggleMenu} />
      {collapsed ? null : <Feed />}
    </div>
  );
};
