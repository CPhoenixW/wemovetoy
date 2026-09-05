interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  as?: "input" | "textarea" | "select";
  children?: React.ReactNode;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  placeholder,
  required,
  disabled,
  error,
  onChange,
  as = "input",
  children,
}: FormFieldProps) {
  const baseProps = {
    id: name,
    name,
    value,
    placeholder,
    required,
    disabled,
    onChange,
  };

  return (
    <div className={`form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={name}>
        {label}
        {required ? <span className="required"> *</span> : null}
      </label>

      {as === "textarea" ? (
        <textarea {...baseProps} rows={4} />
      ) : as === "select" ? (
        <select {...baseProps}>{children}</select>
      ) : (
        <input {...baseProps} type={type} />
      )}

      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
