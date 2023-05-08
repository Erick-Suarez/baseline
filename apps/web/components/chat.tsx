import { useCallback, useContext } from "react";
import { RiRefreshLine, RiQuestionFill } from "react-icons/ri";
import { ChatInputBar } from "@/components/chatInputBar";
import { useState, useRef, useEffect } from "react";

import { io, Socket } from "socket.io-client";
import {
  ServerAIQueryResponse,
  ServerAIQueryRequest,
  filepath,
  MarkdownContent,
  ServerSocketError,
} from "@baselinedocs/shared";
import { ChatBlock, ChatBlockType } from "@/components/chatBlock";
import { BaselineContext } from "@/context/baselineContext";
import assert from "assert";
import { useRouter } from "next/router";
import { parseCookies } from "nookies";
import { defaultGPTProject } from "@/pages/_app";
import { event } from "nextjs-google-analytics";

interface ChatEntry {
  type: ChatBlockType;
  data: MarkdownContent;
  sources?: filepath[];
}

const TIMEOUT_LIMIT = 30000;

//TODO: Update props to take in user type
export const Chat = ({
  loggedInUser,
  setModalIsOpen,
}: {
  loggedInUser: { name: string };
  setModalIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { currentProject, projects, setCurrentProject } =
    useContext(BaselineContext);
  const router = useRouter();
  const [socketConnection, setSocketConnection] = useState<Socket | null>(null);
  const [chatBlockList, setChatBlockList] = useState<ChatEntry[]>([
    {
      type: ChatBlockType.AI,
      data: "Welcome to Baseline! Ask questions about your codebase to get started",
    },
  ]);
  const [inputValue, setInputValue] = useState<string>("");
  const [waitingForResponse, setWaitingForResponse] = useState<boolean>(false);
  const [streamBuffer, setStreamBuffer] = useState<string[]>([]);
  const [errorState, setErrorState] = useState<ServerSocketError | null>(null);
  const chatBoxEnd = useRef(null);

  const _resetState = () => {
    setChatBlockList([
      {
        type: ChatBlockType.AI,
        data: "Welcome to Baseline! Ask questions about your codebase to get started",
      },
    ]);
    setInputValue("");
    setStreamBuffer([]);
    setWaitingForResponse(false);
  };

  useEffect(() => {
    _resetState();

    setChatBlockList([
      {
        type: ChatBlockType.AI,
        data: "Welcome to Baseline! Ask questions about your codebase to get started",
      },
    ]);
    setInputValue("");
    setStreamBuffer([]);
    setWaitingForResponse(false);
    setErrorState(null);

    if (!currentProject) {
      setCurrentProject(defaultGPTProject);
    }

    const socket = io(`${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}`);
    setSocketConnection(socket);
    socket.emit("auth", {
      token: parseCookies()["baseline.access-token"],
      currentProject,
    });

    return () => {
      socket.close();
    };
  }, [currentProject, router, setCurrentProject]);

  useEffect(() => {
    socketConnection?.on("query-response-stream-token", (token) => {
      setStreamBuffer((streamBuffer) => [...streamBuffer, token]);
    });

    socketConnection?.on(
      "query-response-stream-finished",
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

    socketConnection?.on("error", (error: ServerSocketError) => {
      setErrorState(error);
    });

    _scrollToBottom();
  }, [socketConnection]);

  const _handleResetChat = () => {
    _resetState();
    if (socketConnection) {
      socketConnection.close();
      const newSocket = io(`${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}`);
      newSocket.emit("auth", {
        token: parseCookies()["baseline.access-token"],
        currentProject,
      });
      setSocketConnection(newSocket);
    }
  };

  function _handleSubmit() {
    if (inputValue.length > 0) {
      const queryRequest: ServerAIQueryRequest = { query: inputValue };

      if (socketConnection) {
        setChatBlockList([
          ...chatBlockList,
          { type: ChatBlockType.HUMAN, data: queryRequest.query },
        ]);
        setWaitingForResponse(true);
        socketConnection.emit("query-request", queryRequest);
        event("submit_button", {
          category: "query_request",
          label: queryRequest.query,
        });
      }
    }

    setInputValue("");
  }

  function _scrollToBottom() {
    //@ts-expect-error ScrollIntoView is set to null initially but will be assigned after first render
    chatBoxEnd.current?.scrollIntoView({ behavior: "smooth" });
  }

  const _chatEntries = (
    <>
      {waitingForResponse && (
        <ChatBlock
          type={
            streamBuffer.length > 0 ? ChatBlockType.AI : ChatBlockType.LOADING
          }
          content={streamBuffer.join("")}
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
              user={loggedInUser}
            />
          );
        })
        .reverse()}
      <div ref={chatBoxEnd} />
    </>
  );

  return (
    <div className="flex h-[95vh] max-h-[1080px] w-[80vw] max-w-[1440px] flex-col px-2">
      <div className="mb-2 flex w-full justify-end">
        <button
          className="mr-5 flex items-center gap-2 rounded-md p-2 text-slate-600 hover:bg-indigo-200 hover:text-indigo-600"
          onClick={() => {
            setModalIsOpen((prev) => !prev);
          }}
        >
          <RiQuestionFill className="h-5 w-5" />
          <h1>Help</h1>
        </button>
        <button
          className="flex items-center gap-2 rounded-md p-2 text-slate-600 hover:bg-indigo-200 hover:text-indigo-600"
          onClick={_handleResetChat}
        >
          <RiRefreshLine className="h-5 w-5" />
          <h1>Reset Chat</h1>
        </button>
      </div>
      <div className="mb-5 h-full w-full overflow-clip rounded-xl border border-slate-300 shadow-xl">
        <div className="flex h-full w-full flex-col-reverse overflow-y-auto pt-5">
          {errorState !== null ? (
            <ChatBlock
              type={ChatBlockType.ERROR}
              content={
                errorState.type === 403
                  ? "Session timeout please try logging in again"
                  : "Server error, please submit feedback and try again later"
              }
            />
          ) : (
            _chatEntries
          )}
        </div>
      </div>
      <ChatInputBar
        disabled={waitingForResponse || errorState !== null}
        value={inputValue}
        handleChange={(value: string) => {
          setInputValue(value);
        }}
        handleSubmit={() => {
          _handleSubmit();
        }}
      />
    </div>
  );
};
