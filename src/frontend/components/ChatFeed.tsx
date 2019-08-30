import * as React from 'react';
import { createRef, useEffect, forwardRef, Fragment } from 'react';
import { Feed, Segment } from 'semantic-ui-react';
import styled from 'styled-components';

const StyledSegment = styled(Segment)`
  max-height: 500px;
  overflow: auto;
  overflow-x: hidden;
`;

interface Props {
  comments: Comment[];
}

interface FeedEventProps {
  avatarUrl: string;
  login: string;
  bodyText: string;
  createdAt: Date;
}

const FeedEvent = (props: FeedEventProps) => {
  const { avatarUrl, login, bodyText, createdAt } = props;
  return (
    <Fragment>
      <Feed.Label>
        <img src={avatarUrl} />
      </Feed.Label>
      <Feed.Content>
        <Feed.Summary>
          <Feed.User>{login}</Feed.User>
          <Feed.Extra text>{bodyText}</Feed.Extra>
          <Feed.Date>{createdAt}</Feed.Date>
        </Feed.Summary>
      </Feed.Content>
    </Fragment>
  );
};

export const ChatFeed = (props: Props) => {
  const lastCommentRef = createRef<HTMLDivElement>();

  useEffect(() => {
    if (lastCommentRef.current) {
      lastCommentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lastCommentRef]);

  const events = props.comments.map(
    ({ bodyText, id, author, createdAt }, index) => {
      if (props.comments.length - 1 === index) {
        function feedEventWithRef(
          props: FeedEventProps,
          ref: React.Ref<HTMLDivElement>,
        ) {
          return (
            <div key={id} ref={ref} className="event">
              <FeedEvent {...props} />
            </div>
          );
        }

        const FeedEventWithRef = forwardRef<HTMLDivElement, FeedEventProps>(
          feedEventWithRef,
        );

        return (
          <FeedEventWithRef
            ref={lastCommentRef}
            bodyText={bodyText}
            createdAt={createdAt}
            avatarUrl={author.avatarUrl}
            login={author.login}
          />
        );
      } else {
        return (
          <div key={id} className="event">
            <FeedEvent
              bodyText={bodyText}
              createdAt={createdAt}
              avatarUrl={author.avatarUrl}
              login={author.login}
            />
          </div>
        );
      }
    },
  );

  return (
    <StyledSegment attached="bottom">
      <Feed>{events}</Feed>
    </StyledSegment>
  );
};
