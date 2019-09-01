export const get = async (key: string) => {
  const promise: Promise<string> = new Promise(resolve => {
    chrome.storage.sync.get(key, result => {
      resolve(result[key] || '');
    });
  });

  const value = await promise;

  return value;
};

export const set = async (object: Record<string, string>) => {
  const promise = new Promise(resolve => {
    chrome.storage.sync.set(object, resolve);
  });

  await promise;
};
