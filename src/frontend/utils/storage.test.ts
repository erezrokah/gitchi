import { get, set } from './storage';

const chrome = {
  storage: {
    sync: { get: jest.fn(), set: jest.fn() },
  },
};
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
global.chrome = chrome;

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return item when get is called for existing item', async () => {
    const key = 'key';
    const value = 'value';

    const promise = get(key);

    expect(chrome.storage.sync.get).toHaveBeenCalledTimes(1);
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      key,
      expect.any(Function),
    );

    chrome.storage.sync.get.mock.calls[0][1]({ key: value });

    const result = await promise;

    expect(result).toBe(value);
  });

  test('should return empty string item when get is called for non existing item', async () => {
    const key = 'key';

    const promise = get(key);

    expect(chrome.storage.sync.get).toHaveBeenCalledTimes(1);
    expect(chrome.storage.sync.get).toHaveBeenCalledWith(
      key,
      expect.any(Function),
    );

    chrome.storage.sync.get.mock.calls[0][1]({});

    const result = await promise;

    expect(result).toBe('');
  });

  test('should set object when set is called', async () => {
    const object = { key: 'value' };

    const promise = set(object);

    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1);
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      object,
      expect.any(Function),
    );

    chrome.storage.sync.set.mock.calls[0][1]();

    const result = await promise;

    expect(result).toBeUndefined();
  });
});
