import * as React from 'react';
import { createRef, useEffect, forwardRef, Fragment } from 'react';
import { Feed, Segment, Icon, Image } from 'semantic-ui-react';
import styled from 'styled-components';
import { formatRelative } from 'date-fns';

const StyledSegment = styled(Segment)`
  height: 500px;
  width: 500px;
  overflow: auto;
`;

interface Props {
  onDeleteMessage: (id: string) => void;
  comments: Comment[];
}

interface FeedEventProps {
  id: string;
  avatarUrl: string;
  login: string;
  bodyText: string;
  createdAt: Date;
  canDelete: boolean;
  onDeleteMessage: (id: string) => void;
}

const FeedEvent = (props: FeedEventProps) => {
  const {
    id,
    avatarUrl,
    login,
    bodyText,
    createdAt,
    canDelete,
    onDeleteMessage,
  } = props;

  return (
    <Fragment>
      <Feed.Label>
        <Image src={avatarUrl} />
      </Feed.Label>
      <Feed.Content>
        <Feed.Summary>
          <Feed.User>{login}</Feed.User>
          <Feed.Extra text>{bodyText}</Feed.Extra>
          <Feed.Date>{formatRelative(createdAt, new Date())}</Feed.Date>
        </Feed.Summary>
        {canDelete ? (
          <Feed.Meta>
            <Feed.Like>
              <Icon name="delete" onClick={() => onDeleteMessage(id)} />
            </Feed.Like>
          </Feed.Meta>
        ) : null}
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
    ({ bodyText, id, author, createdAt, canDelete }, index) => {
      if (props.comments.length - 1 === index) {
        function feedEventWithRef(
          props: FeedEventProps,
          ref: React.Ref<HTMLDivElement>,
        ) {
          return (
            <div ref={ref} className="event">
              <FeedEvent {...props} />
            </div>
          );
        }

        const FeedEventWithRef = forwardRef<HTMLDivElement, FeedEventProps>(
          feedEventWithRef,
        );

        return (
          <FeedEventWithRef
            key={id}
            ref={lastCommentRef}
            id={id}
            bodyText={bodyText}
            createdAt={createdAt}
            avatarUrl={author.avatarUrl}
            login={author.login}
            canDelete={canDelete}
            onDeleteMessage={props.onDeleteMessage}
          />
        );
      } else {
        return (
          <div key={id} className="event">
            <FeedEvent
              id={id}
              bodyText={bodyText}
              createdAt={createdAt}
              avatarUrl={author.avatarUrl}
              login={author.login}
              canDelete={canDelete}
              onDeleteMessage={props.onDeleteMessage}
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
