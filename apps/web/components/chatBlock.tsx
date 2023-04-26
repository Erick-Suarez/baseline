/* eslint-disable @next/next/no-img-element */
//TODO: Remove eslint disable when we switch to optimized nextjs images

import ReactMarkdown from "react-markdown";
import {
  createHumanProfileFromName,
  AI_PROFILE_IMAGE,
  profileImageSizes,
} from "@/utils/images";
import classNames from "classnames";
import { BeatLoader } from "react-spinners";
import { filepath } from "@baselinedocs/shared";
import { Disclosure } from "@headlessui/react";
import { RiArrowDropDownLine } from "react-icons/ri";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { wrap } from "module";

export enum ChatBlockType {
  HUMAN = "human",
  AI = "ai",
  LOADING = "loading",
  TIMEOUT = "timeout",
}

export const ChatBlock = ({
  content,
  type,
  hideSeparator,
  sources,
  user,
}: {
  content: string;
  type: ChatBlockType;
  hideSeparator?: boolean;
  sources?: filepath[];
  user?: { name: string };
}) => {
  let profile = null;
  switch (type) {
    case ChatBlockType.HUMAN:
      profile = createHumanProfileFromName(user!.name, profileImageSizes.SMALL);
      break;

    case ChatBlockType.AI:
      profile = (
        <img
          src={AI_PROFILE_IMAGE}
          alt="Profile picture"
          className="h-12 w-12 rounded-full object-cover"
        />
      );
      break;

    case ChatBlockType.LOADING:
      profile = (
        <img
          src={AI_PROFILE_IMAGE}
          alt="Profile picture"
          className="h-12 w-12 rounded-full object-cover"
        />
      );
      break;

    default:
      throw console.error("Invalid chat entity type");
  }

  return (
    <div className="flex w-full flex-col items-center leading-8">
      <div className="flex w-full justify-center gap-5 px-16 py-5">
        {profile}
        <div className="flex w-full flex-grow flex-col justify-center">
          {type === ChatBlockType.LOADING && (
            <BeatLoader size={12} color={"#818cf8"} />
          )}
          {type === ChatBlockType.AI && (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  return !inline ? (
                    <SyntaxHighlighter
                      className="w-[100%] flex-shrink"
                      language={"javascript"}
                      wrapLines={true}
                      showLineNumbers={true}
                      PreTag="div"
                      style={atomDark}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}
          {type === ChatBlockType.HUMAN && (
            <div className="whitespace-pre-wrap">{content}</div>
          )}

          {sources && sources.length > 0 && <Sources sources={sources} />}
        </div>
      </div>

      <div
        className={classNames("w-[60%] border-b border-slate-200", {
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
        {sources.map((source, index) => {
          return <p key={`source_${index}`}>{source}</p>;
        })}
      </Disclosure.Panel>
    </Disclosure>
  );
};
