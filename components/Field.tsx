import { useId, cloneElement, isValidElement } from 'react';
import type { ReactNode, ReactElement } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

/**
 * Labeled form field wrapper. Auto-associates the label with a single
 * input/select/textarea child via htmlFor + id. Pair the child with
 * className="input".
 */
export default function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  const child =
    isValidElement(children)
      ? cloneElement(children as ReactElement<{ id?: string }>, { id })
      : children;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[13.5px] font-semibold text-charcoal">
        {label}
      </label>
      {child}
      {hint && <p className="mt-1 text-[12.5px] text-steel">{hint}</p>}
    </div>
  );
}
