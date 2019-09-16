/* eslint-disable @typescript-eslint/no-var-requires */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

process.env.REACT_APP_OAUTH_CLIENT_ID = 'REACT_APP_OAUTH_CLIENT_ID';
process.env.REACT_APP_AUTH_ENDPOINT = 'REACT_APP_AUTH_ENDPOINT/';

import { Auth, Event } from './Auth';

jest.mock('crypto-random-string');
jest.mock('../utils/storage', () => {
  return {
    set: jest.fn(() => Promise.resolve()),
  };
});

jest.spyOn(console, 'log').mockImplementation(() => {});

describe('Auth', () => {
  Object.assign(window, { width: 960 * 2 });
  Object.assign(window, { height: 600 * 2 });

  const randomString = 'randomString';
  const cryptoRandomString = require('crypto-random-string') as jest.Mock;
  cryptoRandomString.mockReturnValue(randomString);

  const { set }: { set: jest.Mock } = require('../utils/storage');

  const authWindow = {
    focus: jest.fn(),
    postMessage: jest.fn(),
    close: jest.fn(),
  };

  const addEventListener = jest.fn();
  const removeEventListener = jest.fn();
  window.addEventListener = addEventListener;
  window.removeEventListener = removeEventListener;

  const open = jest.fn();
  window.open = open;

  open.mockReturnValue(authWindow);

  const props = { onAuthSuccess: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should match snapshot', () => {
    const { asFragment } = render(<Auth {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('should register to message event and open auth window on Sign in button click', () => {
    const { getByText } = render(<Auth {...props} />);

    fireEvent.click(getByText('Sign in to Gitchi'));

    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false,
    );

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith(
      'https://github.com/login/oauth/authorize?client_id=REACT_APP_OAUTH_CLIENT_ID&state=randomString&allow_signup=false&scope=public_repo',
      'Gitchi Authorization',
      'width=960, height=600, top=-300, left=-480',
    );
    expect(authWindow.focus).toHaveBeenCalledTimes(1);
  });

  test('should handle handshake on "authorizing:github" message with correct origin', () => {
    const { getByText } = render(<Auth {...props} />);

    fireEvent.click(getByText('Sign in to Gitchi'));

    const fn = addEventListener.mock.calls[4][1];
    jest.clearAllMocks();

    const event: Event = {
      origin: 'REACT_APP_AUTH_ENDPOINT',
      data: 'authorizing:github',
    };
    fn(event);

    expect(removeEventListener).toHaveBeenCalledWith('message', fn, false);

    expect(window.addEventListener).toHaveBeenCalledWith(
      'message',
      expect.any(Function),
      false,
    );

    expect(authWindow.postMessage).toHaveBeenCalledTimes(1);
    expect(authWindow.postMessage).toHaveBeenCalledWith(
      event.data,
      event.origin,
    );
  });

  test('should not handle handshake on "authorizing:github" message with wrong origin', () => {
    const { getByText } = render(<Auth {...props} />);

    fireEvent.click(getByText('Sign in to Gitchi'));

    const fn = addEventListener.mock.calls[4][1];
    jest.clearAllMocks();

    const event: Event = {
      origin: 'wrong origin',
      data: 'authorizing:github',
    };
    fn(event);

    expect(removeEventListener).toHaveBeenCalledTimes(0);
    expect(addEventListener).toHaveBeenCalledTimes(0);
    expect(authWindow.postMessage).toHaveBeenCalledTimes(0);
  });

  test('should handle "authorization:github:success" message', async () => {
    const { getByText } = render(<Auth {...props} />);

    fireEvent.click(getByText('Sign in to Gitchi'));

    let fn = addEventListener.mock.calls[4][1];
    jest.clearAllMocks();

    let event: Event = {
      origin: 'REACT_APP_AUTH_ENDPOINT',
      data: 'authorizing:github',
    };
    fn(event);

    const setPromise = Promise.resolve();
    set.mockReturnValue(setPromise);

    const data = { token: 'token' };
    fn = addEventListener.mock.calls[0][1];
    event = {
      origin: 'REACT_APP_AUTH_ENDPOINT',
      data: `authorization:github:success:${JSON.stringify(data)}`,
    };
    fn(event);

    await setPromise;

    expect(authWindow.close).toHaveBeenCalledTimes(1);

    expect(removeEventListener).toHaveBeenCalledWith('message', fn, false);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ token: data.token });
  });

  test('should handle "authorization:github:error" message', async () => {
    const { getByText, asFragment } = render(<Auth {...props} />);
    await act(async () => {
      fireEvent.click(getByText('Sign in to Gitchi'));

      let fn = addEventListener.mock.calls[4][1];
      jest.clearAllMocks();

      let event: Event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: 'authorizing:github',
      };
      fn(event);

      const setPromise = Promise.resolve();
      set.mockReturnValue(setPromise);

      const message = 'error';
      fn = addEventListener.mock.calls[0][1];
      event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: `authorization:github:error:${JSON.stringify(message)}`,
      };
      fn(event);

      await setPromise;

      expect(authWindow.close).toHaveBeenCalledTimes(1);

      expect(removeEventListener).toHaveBeenCalledWith('message', fn, false);

      expect(set).toHaveBeenCalledTimes(0);

      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(new Error(message));
    });
    expect(asFragment()).toMatchSnapshot();
  });

  test('should not handle authorize on "authorizing:github:success" message with wrong origin', () => {
    const { getByText } = render(<Auth {...props} />);

    fireEvent.click(getByText('Sign in to Gitchi'));

    let fn = addEventListener.mock.calls[4][1];
    jest.clearAllMocks();

    let event: Event = {
      origin: 'REACT_APP_AUTH_ENDPOINT',
      data: 'authorizing:github',
    };
    fn(event);

    const data = { token: 'token' };
    fn = addEventListener.mock.calls[0][1];
    event = {
      origin: 'wrong origin',
      data: `authorization:github:success:${JSON.stringify(data)}`,
    };

    jest.clearAllMocks();

    fn(event);

    expect(removeEventListener).toHaveBeenCalledTimes(0);
    expect(addEventListener).toHaveBeenCalledTimes(0);
    expect(authWindow.postMessage).toHaveBeenCalledTimes(0);
  });

  test('should set error on "authorization:github:success" with no data', () => {
    const { getByText, asFragment } = render(<Auth {...props} />);
    act(() => {
      fireEvent.click(getByText('Sign in to Gitchi'));

      let fn = addEventListener.mock.calls[4][1];
      jest.clearAllMocks();

      let event: Event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: 'authorizing:github',
      };
      fn(event);

      fn = addEventListener.mock.calls[0][1];
      event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: 'authorization:github:success:',
      };
      fn(event);

      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        new Error("Can't get github success data"),
      );
    });
    expect(asFragment()).toMatchSnapshot();
  });

  test('should set error on "authorization:github:error" with no error', () => {
    const { getByText, asFragment } = render(<Auth {...props} />);
    act(() => {
      fireEvent.click(getByText('Sign in to Gitchi'));

      let fn = addEventListener.mock.calls[4][1];
      jest.clearAllMocks();

      let event: Event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: 'authorizing:github',
      };
      fn(event);

      fn = addEventListener.mock.calls[0][1];
      event = {
        origin: 'REACT_APP_AUTH_ENDPOINT',
        data: 'authorization:github:error:',
      };
      fn(event);

      expect(console.log).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith(
        new Error("Can't get github error"),
      );
    });
    expect(asFragment()).toMatchSnapshot();
  });
});
