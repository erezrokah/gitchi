import * as React from 'react';
import { useState, useEffect } from 'react';
import { Menu, MenuItemProps, Icon } from 'semantic-ui-react';
import styled from 'styled-components';

const StyledItem = styled(Menu.Item)`
  width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  display: block !important;
`;

interface Props {
  onMenuToggle: (collapsed: boolean) => void;
  onRefreshClicked: () => void;
  onChannelSelect: (key: string) => void;
  channels: Channel[];
}

export const ChatMenu = (props: Props) => {
  const { onMenuToggle, onChannelSelect, onRefreshClicked } = props;

  const [active, setActive] = useState(props.channels[0].key);
  const [collapsed, setCollapsed] = useState(false);

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
    onMenuToggle(!collapsed);
  };

  const handleItemClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    { name }: MenuItemProps,
  ) => {
    setActive(name || '');
    onChannelSelect(name || '');

    if (collapsed) {
      toggleCollapse();
    }
  };

  // reset active if channel is removed
  useEffect(() => {
    if (!props.channels.some(c => c.key === active)) {
      setActive(props.channels[0].key);
    }
    return () => {};
  }, [props.channels, active]);

  const items = props.channels.map(({ key, title }) => {
    return (
      <StyledItem
        key={key}
        name={key}
        active={active === key}
        onClick={handleItemClick}
        title={title}
      >
        {title}
      </StyledItem>
    );
  });

  const collapseButton = collapsed ? (
    <Menu.Item
      name="open"
      active={false}
      position="right"
      onClick={toggleCollapse}
      title="Open"
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
      title="Collapse"
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
        {index + itemsPerRow >= items.length ? (
          <Menu.Item
            name="refresh"
            active={false}
            onClick={onRefreshClicked}
            title="Refresh"
          >
            <Icon name="refresh" />
          </Menu.Item>
        ) : null}
        {index === 0 ? collapseButton : null}
      </Menu>,
    );
  }

  return <div>{menus}</div>;
};
