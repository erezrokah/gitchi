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

export const parseLinkHeader = (link: string) => {
  const links = link.split(',').map(l => {
    const parts = l.split(';');

    const link = (parts[0] || '').trim().match(/<(.*?)>/);
    const rel = (parts[1] || '').match(/rel="(.*?)"/);

    return {
      link: link ? link[1] : '',
      rel: rel ? rel[1] : '',
    };
  });

  const result: Record<string, string> = {};

  links.forEach(({ rel, link }) => {
    result[rel] = link;
  });

  return result;
};

const getAllResponses = async (url: string, options: RequestInit) => {
  const maxResponses = 30;
  let responseCount = 1;

  const pageResponses = [];

  let nextURL = url;

  while (responseCount < maxResponses) {
    const pageResponse = await fetch(nextURL, options);
    pageResponses.push(pageResponse);
    responseCount++;

    const linkHeader = pageResponse.headers.get('Link');
    const next = linkHeader && parseLinkHeader(linkHeader)['next'];
    if (next) {
      nextURL = next;
    } else {
      break;
    }
  }

  const jsons = await Promise.all(pageResponses.map(r => r.json()));

  return jsons.flat();
};

export const getReviewComments = async (
  repoOwner: string,
  repoName: string,
  prNumber: number,
) => {
  const token = await getToken();

  const result = await getAllResponses(
    `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}/comments`,
    {
      headers: {
        authorization: `token ${token}`,
      },
    },
  );

  const byReviewId: Record<
    string,
    { key: string; title: string; comments: unknown[] }
  > = {};

  result.forEach(
    ({
      body: bodyText,
      id,
      created_at: createdAt,
      in_reply_to_id: inReplyToId,
      user,
    }) => {
      const comment = {
        bodyText,
        createdAt,
        id,
        inReplyToId,
        author: {
          avatarUrl: user.avatar_url,
          login: user.login,
        },
      };
      id = `${id}`;

      if (inReplyToId && byReviewId[inReplyToId]) {
        byReviewId[inReplyToId].comments.push(comment);
      } else {
        byReviewId[id] = {
          key: id,
          title: id,
          comments: [comment],
        };
      }
    },
  );

  return Object.values(byReviewId);
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

  const reviewComments = await getReviewComments(repoOwner, repoName, prNumber);

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
      ...reviewComments,
    ],
  };
};
