import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import ReactMarkdown from 'react-markdown';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { HUMAN_PROFILE_IMAGE, AI_PROFILE_IMAGE } from '@utils/images';
import classNames from 'classnames';
import { BeatLoader } from 'react-spinners';
import { filepath } from '@baselinedocs/shared';
import { Disclosure } from '@headlessui/react';
import { RiArrowDropDownLine } from 'react-icons/ri';

export enum ChatBlockType {
  HUMAN = 'human',
  AI = 'ai',
  LOADING = 'loading',
  TIMEOUT = 'timeout',
}

export const ChatBlock = ({
  content,
  type,
  hideSeparator,
  sources,
}: {
  content: string;
  type: ChatBlockType;
  hideSeparator?: boolean;
  sources?: filepath[];
}) => {
  let profile_src = '';
  switch (type) {
    case ChatBlockType.HUMAN:
      profile_src = HUMAN_PROFILE_IMAGE;
      break;

    case ChatBlockType.AI:
      profile_src = AI_PROFILE_IMAGE;
      break;

    case ChatBlockType.LOADING:
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
        <div className="flex w-full flex-grow flex-col justify-center">
          {type === ChatBlockType.LOADING && (
            <BeatLoader size={12} color={'#818cf8'} />
          )}
          <ReactMarkdown
            children={content}
            components={{
              code({ node, inline, className, children, ...props }) {
                return !inline ? (
                  <SyntaxHighlighter
                    className="w-[100%] flex-shrink"
                    children={String(children).replace(/\n$/, '')}
                    language={'javascript'}
                    style={atomDark}
                    wrapLines={true}
                    showLineNumbers={true}
                    PreTag="div"
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          />
          {sources && <Sources sources={sources} />}
        </div>
      </div>

      <div
        className={classNames('w-[60%] border-b border-slate-200', {
          hidden: hideSeparator,
        })}
      ></div>
    </div>
  );
};

export const Sources = ({ sources }: { sources: filepath[] }) => {
  return (
    <Disclosure>
      <Disclosure.Button className="flex w-full items-center justify-between rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-100">
        Sources
        <RiArrowDropDownLine className="h-6 w-6" />
      </Disclosure.Button>
      <Disclosure.Panel className="px-4 text-slate-600">
        {sources.map((source) => {
          return <p>{source}</p>;
        })}
      </Disclosure.Panel>
    </Disclosure>
  );
};
