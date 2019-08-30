import gql from 'graphql-tag';

export const viewer = gql`
  query {
    viewer {
      login
      avatarUrl
      name
    }
  }
`;

export const pullRequest = gql`
  query pullRequest($repoOwner: String!, $repoName: String!, $prNumber: Int!) {
    repository(owner: $repoOwner, name: $repoName) {
      pullRequest(number: $prNumber) {
        id
        bodyText
        createdAt
        title
        author {
          avatarUrl
          login
        }
        comments(last: 50) {
          nodes {
            id
            bodyText
            createdAt
            author {
              avatarUrl
              login
            }
          }
        }
      }
    }
  }
`;
