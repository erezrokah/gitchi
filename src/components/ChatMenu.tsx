import * as React from 'react';
import { useState } from 'react';
import { Menu, MenuItemProps, Icon } from 'semantic-ui-react';

export const ChatMenu = () => {
  const [active, setActive] = useState('channel-1');

  const handleItemClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    { name }: MenuItemProps,
  ) => {
    setActive(name || '');
  };

  const handleClose = () => {};

  return (
    <Menu tabular attached="top">
      <Menu.Item
        name="channel-1"
        active={active === 'channel-1'}
        onClick={handleItemClick}
      >
        Channel 1
      </Menu.Item>
      <Menu.Item
        name="new-tab"
        active={active === 'new-tab'}
        onClick={handleClose}
        position="right"
      >
        <Icon name="close" />
        Close
      </Menu.Item>
    </Menu>
  );
};
