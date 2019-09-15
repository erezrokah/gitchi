import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MessageBox } from './MessageBox';

describe('MessageBox', () => {
  test('should match snapshot', () => {
    const { asFragment } = render(<MessageBox onSendMessage={jest.fn()} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('should update message on input value change', () => {
    const { getByPlaceholderText } = render(
      <MessageBox onSendMessage={jest.fn()} />,
    );

    const message = 'LGTM!';

    const inputElement = getByPlaceholderText('Message...');
    fireEvent.change(inputElement, { target: { value: message } });

    expect(inputElement).toHaveValue(message);
  });

  test('should invoke onSendMessage on button click', () => {
    const onSendMessage = jest.fn();
    const { getByPlaceholderText, getByTestId } = render(
      <MessageBox onSendMessage={onSendMessage} />,
    );

    const message = 'LGTM!';

    fireEvent.change(getByPlaceholderText('Message...'), {
      target: { value: message },
    });
    fireEvent.click(getByTestId('sendMessageButton'));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith(message);
  });

  test('should invoke onSendMessage on enter key press', () => {
    const onSendMessage = jest.fn();
    const { getByPlaceholderText } = render(
      <MessageBox onSendMessage={onSendMessage} />,
    );

    const message = 'LGTM!';

    const inputElement = getByPlaceholderText('Message...');
    fireEvent.change(inputElement, {
      target: { value: message },
    });
    fireEvent.keyPress(inputElement, { key: 'Enter', code: 13, charCode: 13 });

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage).toHaveBeenCalledWith(message);
  });

  test('should not invoke onSendMessage on non enter key press', () => {
    const onSendMessage = jest.fn();
    const { getByPlaceholderText } = render(
      <MessageBox onSendMessage={onSendMessage} />,
    );

    const message = 'LGTM!';

    const inputElement = getByPlaceholderText('Message...');
    fireEvent.change(inputElement, {
      target: { value: message },
    });
    fireEvent.keyPress(inputElement, { key: '0', code: 48, charCode: 48 });

    expect(onSendMessage).toHaveBeenCalledTimes(0);
  });
});
