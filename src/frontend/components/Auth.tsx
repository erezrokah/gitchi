import * as React from 'react';
import { useRef, useState } from 'react';
import cryptoRandomString = require('crypto-random-string');
import { Segment, Button, Message } from 'semantic-ui-react';
import * as storage from '../utils/storage';

const encodeQueryData = (data: Record<string, string>) => {
  const args = [];
  for (const d in data) {
    args.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
  }
  return args.join('&');
};

const authEndpoint = process.env.REACT_APP_AUTH_ENDPOINT || '';
const origin = authEndpoint.substring(0, authEndpoint.lastIndexOf('/'));

interface Data {
  token: string;
}

interface Event {
  origin: string;
  data: string;
}

interface Props {
  onAuthSuccess: () => void;
}

const ErrorMessage = () => {
  return (
    <Message negative>
      <Message.Header>
        Failed to sign in to GitHub, please try again
      </Message.Header>
    </Message>
  );
};

export const Auth = ({ onAuthSuccess }: Props) => {
  const [error, setError] = useState<Error>();
  const authWindowRef = useRef<Window | null>(null);

  const callback = (error: Error | null, data: Data = { token: '' }) => {
    if (error) {
      console.log(error);
      setError(error);
    } else {
      const { token } = data;
      storage.set({ token }).then(() => onAuthSuccess());
    }
  };

  const authorizeCallback = () => {
    const fn = (e: Event) => {
      if (e.origin !== origin) {
        return;
      }

      if (e.data.indexOf('authorization:github:success:') === 0) {
        const match = e.data.match(
          new RegExp('^authorization:github:success:(.+)$'),
        );
        if (match) {
          const data = JSON.parse(match[1]) as Data;
          window.removeEventListener('message', fn, false);
          authWindowRef.current && authWindowRef.current.close();
          callback(null, data);
        } else {
          callback(new Error("Can't get github success data"));
        }
      }
      if (e.data.indexOf('authorization:github:error:') === 0) {
        const match = e.data.match(
          new RegExp('^authorization:github:error:(.+)$'),
        );
        if (match) {
          const err = JSON.parse(match[1]);
          window.removeEventListener('message', fn, false);
          authWindowRef.current && authWindowRef.current.close();
          callback(new Error(err));
        } else {
          callback(new Error("Can't get github error"));
        }
      }
    };
    return fn;
  };

  const handshakeCallback = () => {
    const fn = (e: Event) => {
      if (e.data === 'authorizing:github' && e.origin === origin) {
        window.removeEventListener('message', fn, false);
        window.addEventListener('message', authorizeCallback(), false);
        return (
          authWindowRef.current &&
          authWindowRef.current.postMessage(e.data, e.origin)
        );
      }
    };
    return fn;
  };

  const openAuthWindow = () => {
    const width = 960;
    const height = 600;
    const left = screen.width / 2 - width / 2;
    const top = screen.height / 2 - height / 2;

    window.addEventListener('message', handshakeCallback(), false);

    const url = `https://github.com/login/oauth/authorize?${encodeQueryData({
      client_id: process.env.REACT_APP_OAUTH_CLIENT_ID || '',
      state: cryptoRandomString({ length: 32, type: 'url-safe' }),
      allow_signup: `${false}`,
      scope: 'public_repo',
    })}`;

    const authWindow = window.open(
      url,
      'Gitchi Authorization',
      `width=${width}, height=${height}, top=${top}, left=${left}`,
    );

    authWindowRef.current = authWindow;
    authWindowRef.current && authWindowRef.current.focus();
  };

  return (
    <Segment basic textAlign="center">
      <Button primary onClick={openAuthWindow}>
        Sign in to Gitchi
      </Button>
      {error ? <ErrorMessage /> : null}
    </Segment>
  );
};
