export const getWebSocketUrl = async () => {
  const response = await fetch(window.location.href);
  const text = await response.text();

  const match = text.match(/href="(wss:.+?)"/);
  if (match) {
    return match[1];
  }
  return '';
};
