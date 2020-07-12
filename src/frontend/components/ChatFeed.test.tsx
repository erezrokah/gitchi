import * as React from 'react';
import { render } from '@testing-library/react';
import { ChatFeed } from './ChatFeed';
import { User } from './types';

const scrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

describe('ChatFeed', () => {
  const user: User = {
    name: 'name',
    avatarUrl: 'avatarUrl',
    login: 'login',
  };

  const author = {
    avatarUrl: 'authorAvatarUrl',
    login: 'authorLogin',
  };

  const props = {
    onDeleteMessage: jest.fn(),
    comments: [
      {
        id: '100',
        bodyText: 'comment 100',
        createdAt: new Date(100),
        author,
        canDelete: false,
      },
      {
        id: '200',
        bodyText: 'comment 200',
        createdAt: new Date(200),
        author: user,
        canDelete: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should match snapshot', () => {
    const { asFragment } = render(<ChatFeed {...props} />);
    expect(asFragment()).toMatchSnapshot();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  test('should match snapshot with empty comments array', () => {
    const { asFragment } = render(<ChatFeed {...props} comments={[]} />);
    expect(asFragment()).toMatchSnapshot();
    expect(scrollIntoView).toHaveBeenCalledTimes(0);
  });
});
