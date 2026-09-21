import { useState, useRef, type ReactNode, type InputHTMLAttributes } from "react";
import { IconX } from "./icons";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  prefix?: string;
  suffix?: string;
  size?: "sm" | "md" | "lg";
  clearable?: boolean;
}

export function Input({
  label,
  error,
  hint,
  icon,
  prefix,
  suffix,
  size = "md",
  clearable,
  className = "",
  value,
  onChange,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const ref = useRef<HTMLInputElement>(null);

  const sz = {
    sm: "h-10 text-[13px] rounded-xl px-3.5",
    md: "h-12 text-[14px] rounded-2xl px-4",
    lg: "h-14 text-[15px] rounded-2xl px-5",
  }[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    onChange?.(e);
  };

  const clear = () => {
    setVal("");
    onChange?.({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>);
    ref.current?.focus();
  };

  return (
    <div className={className}>
      {label && (
        <label className="mono mb-1.5 block text-[10px] uppercase tracking-[0.22em] text-dim">
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center gap-2 border bg-bg2 transition-all duration-200 ${
          sz
        } ${
          error
            ? "border-down bg-down/[0.06]"
            : focused
              ? "el-ring border-teal/60"
              : "el-press border-line"
        }`}
      >
        {icon && <span className="shrink-0 text-dim">{icon}</span>}
        {prefix && <span className="mono shrink-0 text-[13px] text-dim">{prefix}</span>}
        <input
          ref={ref}
          value={val}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 bg-transparent text-ink outline-none placeholder:text-line"
          {...rest}
        />
        {suffix && <span className="mono shrink-0 text-[13px] text-dim">{suffix}</span>}
        {clearable && val && (
          <button onClick={clear} className="shrink-0 text-dim hover:text-ink" aria-label="Clear">
            <IconX size={14} />
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-[11.5px] text-down">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-[11.5px] text-dim">{hint}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
}

export function Textarea({ label, error, maxLength, className = "", value, onChange, ...rest }: TextareaProps) {
  const [focused, setFocused] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const len = typeof val === "string" ? val.length : 0;

  return (
    <div className={className}>
      {label && (
        <label className="mono mb-1.5 block text-[10px] uppercase tracking-[0.22em] text-dim">
          {label}
        </label>
      )}
      <textarea
        value={val}
        onChange={(e) => {
          setVal(e.target.value);
          onChange?.(e);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={maxLength}
        className={`w-full resize-none rounded-2xl border bg-bg2 px-4 py-3 text-[14px] text-ink outline-none transition-all placeholder:text-line ${
          error ? "border-down" : focused ? "border-teal/60" : "border-line"
        }`}
        {...rest}
      />
      {maxLength && (
        <p className="mt-1 text-right text-[10.5px] text-dim">
          {len}/{maxLength}
        </p>
      )}
      {error && <p className="mt-1 text-[11.5px] text-down">{error}</p>}
    </div>
  );
}
