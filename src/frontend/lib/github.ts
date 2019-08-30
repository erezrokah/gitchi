import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import * as queries from './queries';

const NO_CACHE = 'no-cache';
const CACHE_FIRST = 'cache-first';

export class AuthorizationError extends Error {}

const getToken = async () => {
  const tokenPromise: Promise<Record<string, string>> = new Promise(
    (resolve, reject) => {
      chrome.storage.sync.get(['token'], ({ token }) => {
        if (token) {
          resolve(token);
        } else {
          reject(new AuthorizationError());
        }
      });
    },
  );

  const token = await tokenPromise;

  return token;
};

const getApolloClient = async () => {
  const token = await getToken();
  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        ...(token && { authorization: `token ${token}` }),
      },
    };
  });
  const httpLink = createHttpLink({ uri: `https://api.github.com/graphql` });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: NO_CACHE,
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: NO_CACHE,
        errorPolicy: 'all',
      },
    },
  });
};

export const getCurrentUser = async () => {
  try {
    const client = await getApolloClient();
    const { data } = await client.query({
      query: queries.viewer,
      fetchPolicy: CACHE_FIRST,
    });
    return data.viewer;
  } catch (e) {
    if (e.statusCode === 401) {
      throw new AuthorizationError();
    } else {
      throw e;
    }
  }
};

export const getPullRequest = async (
  repoOwner: string,
  repoName: string,
  prNumber: number,
) => {
  const client = await getApolloClient();
  const { data } = await client.query({
    query: queries.pullRequest,
    variables: { repoOwner, repoName, prNumber },
  });

  const { pullRequest } = data.repository;
  const { bodyText, createdAt, author, id } = pullRequest;
  const comments = pullRequest.comments.nodes;
  return {
    ...data.repository.pullRequest,
    channels: [
      {
        key: 'main',
        title: 'Main',
        comments: [{ bodyText, createdAt, author, id }, ...comments],
      },
    ],
  };
};
