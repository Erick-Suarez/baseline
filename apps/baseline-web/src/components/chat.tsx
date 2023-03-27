import classNames from 'classnames';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RiRefreshLine } from 'react-icons/ri';
import { ChatInputBar } from '@components/chatInputBar';
import { useState, useRef, useEffect } from 'react';

interface content {
  type: 'text' | 'javascript';
  data: string;
}

interface chatData {
  data: content[];
}

export const Chat = () => {
  const [chatDataList, setChatDataList] = useState<chatData[]>([
    {
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
    setChatDataList([
      {
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
    const updatedChatDataList = [...chatDataList];
    updatedChatDataList.push({
      data: [{ type: 'text', data: inputValue }],
    });

    setChatDataList(updatedChatDataList);
    setInputValue('');
  }

  function _scrollToBottom() {
    chatBoxEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    _scrollToBottom();
  }, [chatDataList]);

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
        <div className="flex h-full w-full flex-col overflow-y-auto pt-5">
          {chatDataList.map((chatData) => {
            return (
              <ChatBlock>
                {chatData.data.map((content) => {
                  return (
                    <Content content={content.data} language={content.type} />
                  );
                })}
              </ChatBlock>
            );
          })}
          <div ref={chatBoxEnd} />
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
}: {
  children: JSX.Element | JSX.Element[];
  hideSeperator?: boolean;
}) => {
  return (
    <div className="flex w-full flex-col items-center leading-8">
      <div className="flex w-full justify-center gap-5 px-16 py-5">
        <img
          src="https://i.guim.co.uk/img/media/699cce4914b90ae0ba89787178bc48314d50eb89/0_215_5081_3048/master/5081.jpg?width=1200&height=1200&quality=85&auto=format&fit=crop&s=20e357d35de3b2adeb09c3b400520d39"
          alt=""
          className="h-12 w-12 rounded-full"
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
      className="w-[100%] max-w-[1200px]"
      language={language}
      style={atomDark}
    >
      {content}
    </SyntaxHighlighter>
  );
};
