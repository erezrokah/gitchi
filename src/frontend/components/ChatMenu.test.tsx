import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ChatMenu } from './ChatMenu';

describe('ChatMenu', () => {
  const channels = [
    { key: 'Main', title: 'Main', isReview: false, comments: [] },
    { key: 'Channel1', title: 'Channel1', isReview: true, comments: [] },
    { key: 'Channel2', title: 'Channel2', isReview: true, comments: [] },
    { key: 'Channel3', title: 'Channel3', isReview: true, comments: [] },
    { key: 'Channel4', title: 'Channel4', isReview: true, comments: [] },
  ];
  const props = {
    onMenuToggle: jest.fn(),
    onRefreshClicked: jest.fn(),
    onChannelSelect: jest.fn(),
    channels,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should match snapshot', () => {
    const { asFragment } = render(<ChatMenu {...props} />);
    expect(asFragment()).toMatchSnapshot();
  });

  test('should choose first channel as active by default', () => {
    const { getByTitle } = render(<ChatMenu {...props} />);
    expect(getByTitle(channels[0].title)).toHaveClass('active');
  });

  test('should be open by default', () => {
    const { getByTitle, queryByTitle } = render(<ChatMenu {...props} />);
    expect(getByTitle('Collapse')).toBeInTheDocument();
    expect(queryByTitle('Open')).toBeNull();
  });

  test('should collapse/open menu on button clicks', () => {
    const { getByTitle, queryByTitle, asFragment } = render(
      <ChatMenu {...props} />,
    );

    fireEvent.click(getByTitle('Collapse'));

    expect(props.onMenuToggle).toHaveBeenCalledTimes(1);
    expect(props.onMenuToggle).toHaveBeenCalledWith(true);
    expect(getByTitle('Open')).toBeInTheDocument();
    expect(queryByTitle('Collapse')).toBeNull();

    expect(asFragment()).toMatchSnapshot();

    jest.clearAllMocks();
    fireEvent.click(getByTitle('Open'));

    expect(props.onMenuToggle).toHaveBeenCalledTimes(1);
    expect(props.onMenuToggle).toHaveBeenCalledWith(false);
    expect(getByTitle('Collapse')).toBeInTheDocument();
    expect(queryByTitle('Open')).toBeNull();
  });

  test('should change active menu on menu item click', () => {
    const { getByTitle } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle(channels[1].title));
    expect(getByTitle(channels[1].title)).toHaveClass('active');

    expect(props.onChannelSelect).toHaveBeenCalledTimes(1);
    expect(props.onChannelSelect).toHaveBeenCalledWith(channels[1].key);
    expect(props.onMenuToggle).toHaveBeenCalledTimes(0);
  });

  test('should change active menu on menu item click', () => {
    const { getByTitle } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle(channels[1].title));

    expect(getByTitle(channels[1].title)).toHaveClass('active');
    expect(props.onChannelSelect).toHaveBeenCalledTimes(1);
    expect(props.onChannelSelect).toHaveBeenCalledWith(channels[1].key);
  });

  test('should open collapsed menu on menu item click', () => {
    const { getByTitle, asFragment } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle('Collapse'));
    jest.clearAllMocks();

    fireEvent.click(getByTitle(channels[0].title));

    expect(props.onMenuToggle).toHaveBeenCalledTimes(1);

    expect(asFragment()).toMatchSnapshot();
  });

  test('should not call onMenuToggle when clicking a menu item if menu is open', () => {
    const { getByTitle } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle(channels[0].title));

    expect(props.onMenuToggle).toHaveBeenCalledTimes(0);
  });

  test('should reset active menu when active channel is removed', () => {
    const { getByTitle, rerender } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle(props.channels[1].title));
    expect(getByTitle(props.channels[1].title)).toHaveClass('active');

    const channels = [...props.channels];
    channels.splice(1, 1);

    rerender(<ChatMenu {...props} channels={channels} />);

    expect(getByTitle(props.channels[0].title)).toHaveClass('active');
  });

  test('should not reset active menu when non active channel is removed', () => {
    const { getByTitle, rerender } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle(props.channels[1].title));
    expect(getByTitle(props.channels[1].title)).toHaveClass('active');

    const channels = [...props.channels];
    channels.splice(2, 1);

    rerender(<ChatMenu {...props} channels={channels} />);

    expect(getByTitle(props.channels[1].title)).toHaveClass('active');
  });

  test('should call onRefreshClicked on refresh button click', () => {
    const { getByTitle } = render(<ChatMenu {...props} />);

    fireEvent.click(getByTitle('Refresh'));

    expect(props.onRefreshClicked).toHaveBeenCalledTimes(1);
  });
});
