import * as React from 'react';
import { useState } from 'react';
import { Menu, MenuItemProps, Icon } from 'semantic-ui-react';

interface Props {
  onMenuToggle: (collapsed: boolean) => void;
}

export const ChatMenu = (props: Props) => {
  const { onMenuToggle } = props;

  const [active, setActive] = useState('channel-1');
  const [collapsed, setCollapsed] = useState(false);

  const handleItemClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    { name }: MenuItemProps,
  ) => {
    setActive(name || '');
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    onMenuToggle(!collapsed);
  };

  return (
    <Menu tabular attached="top">
      <Menu.Item
        name="channel-1"
        active={active === 'channel-1'}
        onClick={handleItemClick}
      >
        Channel 1
      </Menu.Item>
      {collapsed ? (
        <Menu.Item
          name="open"
          active={false}
          position="right"
          onClick={toggleCollapse}
        >
          <Icon name="arrow up" />
          Open
        </Menu.Item>
      ) : (
        <Menu.Item
          name="collapse"
          active={false}
          position="right"
          onClick={toggleCollapse}
        >
          <Icon name="arrow down" />
          Collapse
        </Menu.Item>
      )}
    </Menu>
  );
};
