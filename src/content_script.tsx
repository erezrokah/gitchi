import * as React from 'react';
import { ClassNames } from '@emotion/react';
import * as ReactDOM from 'react-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import s from 'semantic-ui-css/semantic.min.css';

const tabs = document.querySelector('.tabnav');
if (tabs) {
  const chatId = 'gitchi-chat';
  const chat = document.createElement('div');
  chat.setAttribute('id', chatId);
  document.body.parentNode && document.body.parentNode.appendChild(chat);
  import('./frontend/components/Chat').then(({ Chat }) => {
    ReactDOM.render(
      <ClassNames>
        {({ cx, css }) => (
          <div
            className={cx(
              css`
                ${s}
              `,
              css`
                background-color: rgb(250, 250, 250);
                bottom: 3em;
                font-size: 13px;
                display: block;
                border-width: 1px;
                border-style: solid;
                border-color: rgb(221, 221, 221);
                border-radius: 2px;
                position: fixed;
                z-index: 9999;
                right: 3em;
                color: rgb(136, 136, 136);
                padding: 1em;
              `,
            )}
          >
            <Chat />
          </div>
        )}
      </ClassNames>,
      document.getElementById(chatId),
    );
  });
}
