import * as React from 'react';
import { useState } from 'react';
import { ChatMenu as Menu } from './ChatMenu';
import { ChatFeed as Feed } from './ChatFeed';

export const Chat = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <Menu onMenuToggle={setCollapsed} />
      {collapsed ? null : <Feed />}
    </div>
  );
};
