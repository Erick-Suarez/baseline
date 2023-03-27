import classNames from 'classnames';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RiRefreshLine } from 'react-icons/ri';
import { ChatInputBar } from '@components/chatInputBar';
import { useState, useRef, useEffect } from 'react';
import { HUMAN_PROFILE_IMAGE, AI_PROFILE_IMAGE } from '@utils/images';

interface content {
  type: 'text' | 'javascript';
  data: string;
}

interface chatEntry {
  sender: chatEntities;
  data: content[];
}

enum chatEntities {
  HUMAN = 'human',
  AI = 'ai',
}

export const Chat = () => {
  const [chatEntryList, setChatEntry] = useState<chatEntry[]>([
    {
      sender: chatEntities.HUMAN,
      data: [
        {
          type: 'text',
          data: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi aliquet
          pretium libero vel mattis. Etiam lacinia congue dapibus. Sed ut nibh
          consectetur, molestie lacus vel, ornare eros.`,
        },
      ],
    },
    {
      sender: chatEntities.AI,
      data: [
        {
          type: 'text',
          data: `Lorem ipsum dolor sit amet, 
        consectetur adipiscing elit. Morbi aliquet pretium libero vel mattis. Etiam lacinia congue dapibus. 
        Sed ut nibh consectetur, molestie lacus vel, ornare eros. Duis at laoreet turpis. 
        Nullam ultrices venenatis purus, at rutrum quam euismod ut. 
        Donec purus ante, blandit eu porta in, sollicitudin vel orci. 
        Nullam nec nulla rhoncus, pulvinar nisl in, ornare nulla. 
        Mauris sit amet bibendum augue. Nam auctor et erat at ultrices. 
        Vivamus eget odio laoreet, mattis lorem quis, hendrerit lorem. Nulla facilisis vestibulum tempus. 
        In viverra eu ligula a malesuada.`,
        },
        {
          type: 'javascript',
          data: `
        import React from "react"; 
        import uniquePropHOC from "./lib/unique-prop-hoc";
        
        // this comment is here to demonstrate an extremely long line length, well beyond what you should probably allow in your own code, though sometimes you'll be highlighting code you can't refactor, which is unfortunate but should be handled gracefully
        
        class Expire extends React.Component {
            constructor(props) {
                super(props);
                this.state = { component: props.children }
            }
            componentDidMount() {
                setTimeout(() => {
                    this.setState({
                        component: null
                    });
                }, this.props.time || this.props.seconds * 1000);
            }
            render() {
                return this.state.component;
            }
        }
        
        export default uniquePropHOC(["time", "seconds"])(Expire);
        `,
        },
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState<string>('');

  const chatBoxEnd = useRef(null);

  function _handleResetChat() {
    setChatEntry([
      {
        sender: chatEntities.AI,
        data: [
          {
            type: 'text',
            data: 'Hey I am Baseline AI! Type something to get started',
          },
        ],
      },
    ]);
  }

  function _handleSubmit() {
    if (inputValue.length > 0) {
      const updatedChatDataList = [
        {
          sender: chatEntities.HUMAN,
          data: [{ type: 'text', data: inputValue }],
        },
        ...chatEntryList,
      ] as chatEntry[];

      setChatEntry(updatedChatDataList);
      setInputValue('');
    }
  }

  function _scrollToBottom() {
    //@ts-expect-error ScrollIntoView is set to null initially but will be assigned after first render
    chatBoxEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }

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
          {chatEntryList.reverse().map((chatData, index) => {
            return (
              <ChatBlock
                key={index}
                type={chatData.sender}
                hideSeperator={index === 0}
              >
                {chatData.data.map((content) => {
                  return (
                    <Content content={content.data} language={content.type} />
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
  type: chatEntities;
  children: JSX.Element | JSX.Element[];
  hideSeperator?: boolean;
}) => {
  let profile_src = '';
  switch (type) {
    case chatEntities.HUMAN:
      profile_src = HUMAN_PROFILE_IMAGE;
      break;

    case chatEntities.AI:
      profile_src = AI_PROFILE_IMAGE;
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
