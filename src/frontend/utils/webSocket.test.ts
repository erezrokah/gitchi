import { getWebSocketUrl } from './webSocket';

const fetch = jest.fn();
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
global.fetch = fetch;

describe('webSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return web socket url from response', async () => {
    const text = jest.fn(() =>
      Promise.resolve(
        '<link rel="web-socket" href="wss://live.github.com/_sockets/webSocketToken">',
      ),
    );
    fetch.mockReturnValueOnce(Promise.resolve({ text }));

    const webSocketUrl = await getWebSocketUrl();
    expect(webSocketUrl).toBe('wss://live.github.com/_sockets/webSocketToken');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(window.location.href);
    expect(text).toHaveBeenCalledTimes(1);
  });

  test('should return empty string on no match', async () => {
    const text = jest.fn(() => Promise.resolve(''));
    fetch.mockReturnValueOnce(Promise.resolve({ text }));

    const webSocketUrl = await getWebSocketUrl();
    expect(webSocketUrl).toBe('');
  });
});
