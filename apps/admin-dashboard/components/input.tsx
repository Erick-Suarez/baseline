import classNames from "classnames";

export const Input = ({
  className,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  className?: CSSRule | string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: "email" | "text";
  required?: boolean;
}) => {
  return (
    <input
      required={required}
      placeholder={placeholder}
      type={type}
      className={classNames(
        "w-full rounded-md border bg-slate-100 p-4 outline-slate-600",
        `${classNames}`
      )}
      value={value}
      onChange={(e) => {
        onChange(e);
      }}
    />
  );
};
