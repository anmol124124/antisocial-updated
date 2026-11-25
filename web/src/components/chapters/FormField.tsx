import type { FieldDef } from '@/lib/chapters';

export const fieldClass =
  'w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-mute/50 transition focus:border-sand focus:outline-none focus:ring-2 focus:ring-sand/25';

/** One input rendered from a FieldDef in lib/chapters.ts. */
export function FormField({ field, idPrefix }: { field: FieldDef; idPrefix: string }) {
  const id = `${idPrefix}-${field.name}`;
  const common = {
    id,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    maxLength: field.maxLength,
    className: fieldClass,
  };

  return (
    <div className={field.half ? 'sm:col-span-1' : 'sm:col-span-2'}>
      <label htmlFor={id} className="eyebrow mb-2 block text-ink-mute">
        {field.label}
        {field.required && <span className="text-sand-deep"> *</span>}
      </label>
      {field.kind === 'textarea' ? (
        <textarea {...common} rows={4} className={`${fieldClass} resize-y`} />
      ) : field.kind === 'select' ? (
        <select {...common} defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          type={field.kind}
          {...(field.kind === 'number' ? { min: 1, max: 20, defaultValue: 1 } : {})}
          autoComplete={
            field.name === 'full_name' ? 'name' : field.name === 'email' ? 'email' : field.name === 'phone' ? 'tel' : undefined
          }
        />
      )}
    </div>
  );
}

/** Hidden from people, irresistible to bots; the API drops anything that fills it. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function Confirmation({ title, message }: { title: string; message: string }) {
  return (
    <div role="status" className="rounded-3xl border border-sand/40 bg-sand/10 px-8 py-12 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sand">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0b0b0c" strokeWidth="2.5" aria-hidden className="h-5 w-5">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-mute">{message}</p>
    </div>
  );
}
