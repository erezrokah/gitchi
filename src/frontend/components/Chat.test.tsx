import { parseLocation } from './Chat';

describe('Chat', () => {
  describe('parseLocation', () => {
    test('should extract owner, repo and pr number from location href', () => {
      history.replaceState({}, '', 'owner/repo/pull/666');

      expect(parseLocation()).toEqual({
        owner: 'owner',
        repo: 'repo',
        prNumber: 666,
      });
    });

    test('return null on none pull request url', () => {
      history.replaceState({}, '', 'owner/repo/issues/111');

      expect(parseLocation()).toBeNull();
    });
  });
});
