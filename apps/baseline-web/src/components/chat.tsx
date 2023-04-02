import { RiRefreshLine } from 'react-icons/ri';
import { ChatInputBar } from '@components/chatInputBar';
import { useState, useRef, useEffect } from 'react';

import { io, Socket } from 'socket.io-client';
import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
  filepath,
  MarkdownContent,
} from '@baselinedocs/shared';
import { ChatBlock, ChatBlockType } from '@components/chatBlock';

interface ChatEntry {
  type: ChatBlockType;
  data: MarkdownContent;
  sources?: filepath[];
}

const TIMEOUT_LIMIT = 30000;

export const Chat = () => {
  const [socketConnection, setSocketConnection] = useState<Socket | null>(null);
  const [chatBlockList, setChatBlockList] = useState<ChatEntry[]>([
    {
      type: ChatBlockType.AI,
      data: 'Welcome to Baseline! Ask questions about your codebase to get started',
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const [streamBuffer, setStreamBuffer] = useState<string[]>([]);

  const chatBoxEnd = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3000');

    setSocketConnection(socket);

    return () => {
      socket.close();
    };
  }, [window]);

  useEffect(() => {
    socketConnection?.on('query-response-stream-token', (token) => {
      setStreamBuffer((streamBuffer) => [...streamBuffer, token]);
    });

    socketConnection?.on(
      'query-response-stream-finished',
      (data: ServerAIQueryResponse) => {
        setChatBlockList((chatBlockList) => [
          ...chatBlockList,
          {
            type: ChatBlockType.AI,
            data: data.response,
            sources: data.sources,
          },
        ]);
        setStreamBuffer([]);
        setWaitingForResponse(false);
      }
    );

    _scrollToBottom();
  }, [socketConnection]);

  async function _handleResetChat() {
    setChatBlockList([
      {
        type: ChatBlockType.AI,
        data: 'Welcome to Baseline! Ask questions about your codebase to get started',
      },
    ]);
    setInputValue('');
    setStreamBuffer([]);
    setWaitingForResponse(false);
    socketConnection?.emit('reset-chat');
  }

  function _handleSubmit() {
    if (inputValue.length > 0) {
      const queryRequest: ServerAIQueryRequest = { query: inputValue };

      if (socketConnection) {
        setChatBlockList([
          ...chatBlockList,
          { type: ChatBlockType.HUMAN, data: queryRequest.query },
        ]);
        setWaitingForResponse(true);
        socketConnection.emit('query-request', queryRequest);
      }
    }

    setInputValue('');
  }

  function _scrollToBottom() {
    //@ts-expect-error ScrollIntoView is set to null initially but will be assigned after first render
    chatBoxEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }

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
      <div className="mb-5 h-full w-full overflow-clip rounded-xl border border-slate-300 shadow-xl">
        <div className="flex h-full w-full flex-col-reverse overflow-y-auto pt-5">
          {waitingForResponse && (
            <ChatBlock
              type={
                streamBuffer.length > 0
                  ? ChatBlockType.AI
                  : ChatBlockType.LOADING
              }
              content={streamBuffer.join('')}
            />
          )}
          {chatBlockList
            .map((chatBlock, index) => {
              return (
                <ChatBlock
                  key={`chat_block_${index}`}
                  type={chatBlock.type}
                  content={chatBlock.data}
                  sources={chatBlock.sources}
                />
              );
            })
            .reverse()}
          <div ref={chatBoxEnd} />
        </div>
      </div>
      <ChatInputBar
        disabled={waitingForResponse}
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
