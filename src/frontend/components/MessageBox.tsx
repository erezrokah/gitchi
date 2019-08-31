import * as React from 'react';
import { useState } from 'react';
import styled from 'styled-components';
import { Input } from 'semantic-ui-react';

const StyledInput = styled(Input)`
  min-width: 400px;
`;

interface Props {
  onSendMessage: (message: string) => void;
}

export const MessageBox = (props: Props) => {
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
  };

  const sendMessage = () => {
    props.onSendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <StyledInput
      fluid
      placeholder="Message..."
      name="message"
      type="text"
      value={message}
      onChange={handleChange}
      onKeyPress={handleKeyPress}
      action={{
        icon: 'send',
        onClick: sendMessage,
        primary: true,
        title: 'Send Message',
      }}
    />
  );
};
