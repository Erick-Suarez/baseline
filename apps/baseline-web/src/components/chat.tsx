import classNames from 'classnames';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RiRefreshLine } from 'react-icons/ri';
import { ChatInputBar } from '@components/chatInputBar';
import { useState, useRef, useEffect } from 'react';
import { HUMAN_PROFILE_IMAGE, AI_PROFILE_IMAGE } from '@utils/images';
import { io, Socket } from 'socket.io-client';
import BeatLoader from 'react-spinners/BeatLoader';
import {
  ServerAIQueryResponse,
  ResponseContent,
  ResponseContentTypes as ChatEntryContentType,
  ServerAIQueryRequest,
} from '@baselinedocs/shared';

type ChatEntryContent = ResponseContent;

interface ChatEntry {
  type: ChatEntryTypes;
  data: ChatEntryContent[];
}

enum ChatEntryTypes {
  HUMAN = 'human',
  AI = 'ai',
  LOADING = 'loading',
}

export const Chat = () => {
  const [socketConnection, setSocketConnection] = useState<Socket | null>(null);
  const [chatEntryList, setChatEntryList] = useState<ChatEntry[]>([
    {
      type: ChatEntryTypes.AI,
      data: [
        {
          type: ChatEntryContentType.TEXT,
          data: 'Hey I am Baseline AI! Type something to get started',
        },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);

  const chatBoxEnd = useRef(null);

  function _handleResetChat() {
    setChatEntryList([
      {
        type: ChatEntryTypes.AI,
        data: [
          {
            type: ChatEntryContentType.TEXT,
            data: 'Hey I am Baseline AI! Type something to get started',
          },
        ],
      },
    ]);

    setInputValue('');
    setWaitingForResponse(false);
  }

  function _addNewEntryToChatDataList(entry: ChatEntry) {
    const updatedChatDataList = [entry, ...chatEntryList] as ChatEntry[];

    setChatEntryList(updatedChatDataList);
  }

  function _handleSubmit() {
    if (inputValue.length > 0) {
      const newHumanEntry: ChatEntry = {
        type: ChatEntryTypes.HUMAN,
        data: [{ type: ChatEntryContentType.TEXT, data: inputValue }],
      };

      const queryRequest: ServerAIQueryRequest = { query: inputValue };

      if (socketConnection) {
        socketConnection.emit('query-request', queryRequest);
      }

      _addNewEntryToChatDataList(newHumanEntry);
      setInputValue('');
      setWaitingForResponse(true);
    }
  }

  function _scrollToBottom() {
    //@ts-expect-error ScrollIntoView is set to null initially but will be assigned after first render
    chatBoxEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    const socket = io('http://localhost:3000');

    setSocketConnection(socket);

    socket.on('query-response', (data: ServerAIQueryResponse) => {
      const updatedChatDataList = [
        {
          type: ChatEntryTypes.AI,
          data: [...data.response],
        },
        ...chatEntryList,
      ] as ChatEntry[];

      setChatEntryList(updatedChatDataList);
      setWaitingForResponse(false);
    });

    return () => {
      socket.close();
    };
  }, [chatEntryList]);

  useEffect(() => {
    _scrollToBottom();
  }, [chatEntryList]);

  return (
    <div className="flex h-[95vh] max-h-[1080px] w-[80vw] max-w-[1440px] flex-col px-2">
      <div className="mb-2 flex w-full justify-end">
        <button
          className="group flex items-center gap-2 rounded-md p-2 hover:bg-indigo-200"
          onClick={_handleResetChat}
        >
          <RiRefreshLine className="h-5 w-5 text-slate-600 group-hover:text-indigo-600" />
          <h1 className="text-slate-600 group-hover:text-indigo-600">
            Reset Chat
          </h1>
        </button>
      </div>
      <div className="mb-5 h-full w-full overflow-clip rounded-xl shadow-lg">
        <div className="flex h-full w-full flex-col-reverse overflow-y-auto pt-5">
          <div ref={chatBoxEnd} />
          {waitingForResponse && <ChatBlock type={ChatEntryTypes.LOADING} />}
          {chatEntryList.reverse().map((chatData, index) => {
            const chatBlockId = `chatBlock_${index}`;
            return (
              <ChatBlock
                key={chatBlockId}
                type={chatData.type}
                hideSeperator={index === 0}
              >
                {chatData.data.map((content, index) => {
                  return (
                    <Content
                      key={`${chatBlockId}_content_${index}`}
                      content={content.data}
                      language={content.type}
                    />
                  );
                })}
              </ChatBlock>
            );
          })}
        </div>
      </div>
      <ChatInputBar
        value={inputValue}
        handleChange={(e) => {
          setInputValue(e.target.value);
        }}
        handleSubmit={(e) => {
          _handleSubmit();
        }}
      />
    </div>
  );
};

export const ChatBlock = ({
  children,
  hideSeperator,
  type,
}: {
  type: ChatEntryTypes;
  children?: JSX.Element | JSX.Element[];
  hideSeperator?: boolean;
}) => {
  const [requestHasTimedOut, setRequestHasTimedOut] = useState<boolean>(false);
  const timeoutLimit = 20000;

  let profile_src = '';
  switch (type) {
    case ChatEntryTypes.HUMAN:
      profile_src = HUMAN_PROFILE_IMAGE;
      break;

    case ChatEntryTypes.AI:
      profile_src = AI_PROFILE_IMAGE;
      break;

    case ChatEntryTypes.LOADING:
      profile_src = AI_PROFILE_IMAGE;
      children = (
        <div>
          {!requestHasTimedOut && <BeatLoader size={12} color={'#818cf8'} />}
          {requestHasTimedOut && (
            <p className="font-semibold text-red-500">
              Request has timed out. Server might be down or you may need to
              reset chat and try again.
            </p>
          )}
        </div>
      );
      if (!requestHasTimedOut) {
        setTimeout(() => {
          setRequestHasTimedOut(true);
        }, timeoutLimit);
      }
      break;

    default:
      throw console.error('Invalid chat entity type');
  }
  return (
    <div className="flex w-full flex-col items-center leading-8">
      <div className="flex w-full justify-center gap-5 px-16 py-5">
        <img
          src={profile_src}
          alt="Profile picture"
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="flex w-full flex-grow flex-col">{children}</div>
      </div>

      <div
        className={classNames('w-[60%] border-b-2', {
          hidden: hideSeperator,
        })}
      ></div>
    </div>
  );
};

// TODO: Layout bug when w set to 100%
const Content = ({
  content,
  language = 'text',
}: {
  content: string;
  language?: 'text' | string;
}) => {
  if (language === 'text') {
    return <p>{content}</p>;
  }
  return (
    <SyntaxHighlighter
      className="w-[100%] max-w-[1200px] flex-shrink"
      language={language}
      style={atomDark}
    >
      {content}
    </SyntaxHighlighter>
  );
};
