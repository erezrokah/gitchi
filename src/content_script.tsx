import * as React from 'react';
import * as ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css';
import './css/content_script.css';

const tabs = document.querySelector('[class="tabnav-tabs"]');
if (tabs) {
  const buttonId = 'gitchi-chat-button';
  const chatButton = document.createElement('a');
  chatButton.setAttribute('id', buttonId);
  chatButton.setAttribute('href', '#');
  chatButton.setAttribute('class', 'tabnav-tab js-pjax-history-navigate');
  tabs.appendChild(chatButton);

  import('./components/OpenChatButton').then(({ OpenChatButton }) => {
    ReactDOM.render(<OpenChatButton />, document.getElementById(buttonId));
  });

  const chatId = 'gitchi-chat';
  const chat = document.createElement('div');
  chat.setAttribute('id', chatId);
  chat.setAttribute('class', 'gitchi-chat');
  chat.setAttribute('style', 'display: block;');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.body.parentNode!.appendChild(chat);
  import('./components/Chat').then(({ Chat }) => {
    ReactDOM.render(<Chat />, document.getElementById(chatId));
  });
}
