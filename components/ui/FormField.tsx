type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  min?: string;
  step?: string;
  autoComplete?: string;
};

export function FormField({
  label,
  name,
  type = "text",
  defaultValue,
  required = true,
  min,
  step,
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-[13px] font-medium text-zinc-500"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        step={step}
        autoComplete={autoComplete}
        className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition-all duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}
