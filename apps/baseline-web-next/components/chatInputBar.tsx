import { RiSendPlane2Fill } from 'react-icons/ri';
import classNames from 'classnames';
export const ChatInputBar = ({
  disabled,
  value,
  handleChange,
  handleSubmit,
}: {
  disabled: boolean;
  value: string;
  handleChange: (arg: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (
    arg:
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
      | React.KeyboardEvent<HTMLInputElement>
  ) => void;
}) => {
  return (
    <div
      className={classNames(
        'group flex w-full items-center justify-between rounded-xl border px-5 py-3',
        {
          'border-slate-200 bg-slate-200 hover:border-slate-200 focus:border-slate-200':
            disabled,
          'border-slate-400 hover:border-slate-800 focus:border-slate-800':
            !disabled,
        }
      )}
    >
      <input
        disabled={disabled}
        type="text"
        className="flex-grow bg-transparent p-2 text-slate-800 outline-none"
        placeholder={disabled ? 'Generating Response...' : 'Type something'}
        value={value}
        onChange={(e) => {
          handleChange(e);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSubmit(e);
          }
        }}
      />
      <button
        disabled={disabled}
        onClick={(e) => {
          handleSubmit(e);
        }}
      >
        <RiSendPlane2Fill className="h-6 w-6 text-slate-400 hover:text-indigo-600" />
      </button>
    </div>
  );
};
