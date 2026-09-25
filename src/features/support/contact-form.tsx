'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { Field, SubmitButton, TextAreaField } from '@/components/ui/field';
import { useCurrentUser } from '@/features/auth/hooks';
import { apiPost } from '@/lib/http/client';
import { useApiForm } from '@/lib/forms/use-api-form';
import { contactSchema, type ContactValues } from '@/lib/support';

/**
 * Contact Us, for patients and practices alike. Name and email start from the
 * account and stay editable -- someone may want the reply somewhere else.
 */
export function ContactForm() {
  const { user, isPending } = useCurrentUser();
  if (isPending) return null;
  return <Form defaults={{ name: [user?.first_name, user?.last_name].filter(Boolean).join(' '), email: user?.email ?? '' }} />;
}

function Form({ defaults }: { defaults: { name: string; email: string } }) {
  const [sent, setSent] = useState(false);
  const send = useMutation({ mutationFn: (values: ContactValues) => apiPost<{ id: string }>('/support/contact', values) });
  const { register, submit, error, formState, reset } = useApiForm(contactSchema, { ...defaults, subject: '', message: '' });

  if (sent) {
    return (
      <div className="rounded-card border border-line bg-white p-8 text-center">
        <p className="text-base font-bold text-ink-900">Thanks — your message is on its way.</p>
        <p className="mt-2 text-sm text-ink-500">Our team will reply to {defaults.email || 'your email'} as soon as they can.</p>
        <button
          type="button"
          onClick={() => {
            reset({ ...defaults, subject: '', message: '' });
            setSent(false);
          }}
          className="mt-5 text-sm font-semibold text-brand-600 hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={submit(async (values) => {
        await send.mutateAsync(values);
        toast.success('Message sent.');
        setSent(true);
      })}
      className="space-y-4"
    >
      <h2 className="text-xl font-bold text-ink-900">How Can We Help?</h2>
      <Field label="Name" placeholder="Enter name" autoComplete="name" error={error('name')} {...register('name')} />
      <Field label="Email" type="email" placeholder="Enter email address" autoComplete="email" error={error('email')} {...register('email')} />
      <Field label="Subject" placeholder="Enter subject" error={error('subject')} {...register('subject')} />
      <TextAreaField label="Message" placeholder="Enter here…" rows={6} error={error('message')} {...register('message')} />
      <SubmitButton pending={formState.isSubmitting}>Send</SubmitButton>
    </form>
  );
}
