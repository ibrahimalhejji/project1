import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string;
  error?: string;
  help?: string;
  required?: boolean;
  optionalLabel?: string;
  className?: string;
  children: React.ReactNode;
};

export function Field({ label, name, error, help, required, optionalLabel, className, children }: Props) {
  return (
    <div className={cn(className)}>
      <label htmlFor={name} className="label">
        {label}
        {required ? <span className="text-red-500"> *</span> : optionalLabel ? <span className="font-normal text-slate-400"> ({optionalLabel})</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  );
}
