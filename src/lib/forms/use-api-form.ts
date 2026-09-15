'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { get, useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import type { ZodType } from 'zod';

import { toApiError } from '@/lib/http/errors';

/**
 * A form that validates with zod and knows what to do when the API disagrees.
 *
 * The browser catches what it can before the request; the server is the only
 * side that cannot be bypassed, so it will still reject things -- a taken
 * email address, a spent code. When it does, its `details` land on the right
 * inputs and its message goes to a toast. Without this, every screen writes
 * the same twenty lines of error plumbing.
 */
export interface ApiForm<T extends FieldValues> extends UseFormReturn<T> {
  /** Wraps a submit handler: validates, runs it, routes any API error back. */
  submit: (handler: (values: T) => Promise<unknown>) => (event?: React.BaseSyntheticEvent) => void;
  /**
   * The message for one field, as a plain string.
   *
   * `formState.errors.x.message` is typed loosely once a schema uses
   * `.refine()`, and every input would otherwise need the same cast. Reading
   * it through here is also what subscribes the component to that field.
   */
  error: (name: Path<T>) => string | undefined;
}

export function useApiForm<T extends FieldValues>(
  schema: ZodType<T>,
  defaultValues?: DefaultValues<T>,
): ApiForm<T> {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    // Complain once a field has been touched, then keep up as it is corrected.
    mode: 'onTouched',
  });

  const submit: ApiForm<T>['submit'] = (handler) =>
    form.handleSubmit(async (values) => {
      try {
        await handler(values);
      } catch (error) {
        applyApiError(form, error);
      }
    });

  // `get` follows dotted paths: `days.2.end` lives at errors.days[2].end, not at
  // a key with that name. An array-level refinement lands on `root`.
  const error: ApiForm<T>['error'] = (name) => {
    const entry = get(form.formState.errors, name) as
      | { message?: unknown; root?: { message?: unknown } }
      | undefined;
    const message = entry?.message ?? entry?.root?.message;
    return typeof message === 'string' ? message : undefined;
  };

  return { ...form, submit, error };
}

/**
 * Puts an API failure where the user will see it.
 *
 * Both places, always: the field messages go on their fields so the person
 * knows which input to fix, and the summary goes to a toast so the failure is
 * announced even when the offending field is scrolled out of view or the
 * error belongs to no field at all.
 */
function applyApiError<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): void {
  const apiError = toApiError(error);

  for (const [path, message] of Object.entries(apiError.fields)) {
    form.setError(path as Path<T>, { type: 'server', message });
  }

  toast.error(apiError.message);
}
