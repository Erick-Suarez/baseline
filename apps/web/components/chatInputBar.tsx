import { RiSendPlane2Fill } from "react-icons/ri";
import classNames from "classnames";
import { useEffect, useRef } from "react";
export const ChatInputBar = ({
  disabled,
  value,
  handleChange,
  handleSubmit,
}: {
  disabled: boolean;
  value: string;
  handleChange: (value: string) => void;
  handleSubmit: () => void;
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <div
      className={classNames(
        "group mb-5 flex w-full items-end justify-between rounded-xl border px-5 py-5",
        {
          "border-slate-200 bg-slate-200 hover:border-slate-200 focus:border-slate-200":
            disabled,
          "border-slate-400 hover:border-slate-800 focus:border-slate-800":
            !disabled,
        }
      )}
    >
      <textarea
        ref={textAreaRef}
        disabled={disabled}
        rows={1}
        className="h-auto max-h-[300px] flex-grow overflow-auto bg-transparent font-semibold text-slate-800 outline-none"
        placeholder={disabled ? "Generating Response..." : "Type something"}
        value={value}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            handleSubmit();
          } else if (e.key === "Enter" && e.shiftKey) {
            handleChange(value);
          }
        }}
      />
      <button
        disabled={disabled}
        onClick={() => {
          handleSubmit();
        }}
      >
        <RiSendPlane2Fill className="h-6 w-6 text-slate-400 hover:text-indigo-600" />
      </button>
    </div>
  );
};
