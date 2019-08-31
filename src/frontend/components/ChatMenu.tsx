import * as React from 'react';
import { useState } from 'react';
import { Menu, MenuItemProps, Icon } from 'semantic-ui-react';

interface Props {
  onMenuToggle: (collapsed: boolean) => void;
  onChannelSelect: (key: string) => void;
  channels: Channel[];
}

export const ChatMenu = (props: Props) => {
  const { onMenuToggle, onChannelSelect } = props;

  const [active, setActive] = useState('main');
  const [collapsed, setCollapsed] = useState(false);

  const handleItemClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    { name }: MenuItemProps,
  ) => {
    setActive(name || '');
    onChannelSelect(name || '');
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    onMenuToggle(!collapsed);
  };

  const items = props.channels.map(({ key, title }) => {
    return (
      <Menu.Item
        key={key}
        name={key}
        active={active === key}
        onClick={handleItemClick}
      >
        {title}
      </Menu.Item>
    );
  });

  const collapseButton = collapsed ? (
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
  );

  const menus: React.ReactElement[] = [];
  const itemsPerRow = 4;
  for (let index = 0; index < items.length; index = index + itemsPerRow) {
    const part = items.slice(index, index + itemsPerRow);

    menus.push(
      <Menu tabular attached="top" key={index}>
        {part}
        {index === 0 ? collapseButton : null}
      </Menu>,
    );
  }

  return <div>{menus}</div>;
};
