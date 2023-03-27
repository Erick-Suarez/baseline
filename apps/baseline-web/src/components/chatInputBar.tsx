import { RiSendPlane2Fill } from 'react-icons/ri';
import BeatLoader from 'react-spinners/BeatLoader';
import { useState } from 'react';
export const ChatInputBar = ({
  value,
  handleChange,
  handleSubmit,
}: {
  value: string;
  handleChange: (arg: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    arg:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => void;
}) => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="group flex w-full items-center justify-between rounded-xl border border-slate-400 px-5 py-3 hover:border-slate-800 focus:border-slate-800">
      <input
        type="text"
        className="flex-grow p-2 text-slate-800 outline-none"
        placeholder="Type something"
        value={value}
        onChange={(e) => {
          handleChange(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              handleSubmit(e);
            }, 1000);
          }
        }}
      />
      <button
        onClick={(e) => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            handleSubmit(e);
          }, 1000);
        }}
      >
        {loading && <BeatLoader loading={loading} size={12} color="#818cf8" />}
        {!loading && (
          <RiSendPlane2Fill className="h-6 w-6 text-slate-400 hover:text-indigo-600" />
        )}
      </button>
    </div>
  );
};
