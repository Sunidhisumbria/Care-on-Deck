'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Field, SelectField, SubmitButton } from '@/components/ui/field';
import { CalendarIcon, GenderIcon, PhoneIcon, UserIcon } from '@/components/ui/icons';
import { useDependents } from '@/features/patient/hooks';
import { patientApi } from '@/features/patient/api/patient.api';
import { dependentSchema } from '@/features/patient/schemas/dependent.schema';
import { formatDate, fullName, titleCase } from '@/features/patient/lib/format';
import type { Dependent } from '@/features/patient/types';
import { useApiForm } from '@/lib/forms/use-api-form';
import { patientKeys } from '@/lib/query/keys';
import './dependents.css';

export function DependentsScreen() {
  const { data, isPending, error, refetch } = useDependents();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Dependent | null>(null);
  return (
    <div className="dependents-screen">
      <section className="dependents-hero">
        <div className="dependents-ribbons" aria-hidden="true"><i /><i /><i /></div>
        <h1>Dependents</h1>
        <p>Family members whose appointments you manage</p>
      </section>
      <div className="dependents-content">
        {isPending && <div className="dependent-loading" role="status" aria-label="Loading dependents"><div /><div /><div /><span className="sr-only">Loading dependents</span></div>}
        {error && <div className="dependent-empty" role="alert"><h2>We couldn?t load your dependents</h2><p>Please try again in a moment.</p><button onClick={() => refetch()}>Try again</button></div>}
        {data && data.length === 0 && <div className="dependent-empty"><span className="dependent-empty-icon"><UserIcon /></span><h2>Care for your family, all in one place</h2><p>Add your first dependent to start managing their care.</p></div>}
        {data && data.length > 0 && <ul className="dependent-list">{data.map(dependent => {
          const name = fullName(dependent.first_name, dependent.last_name);
          return <li key={dependent.id} className="dependent-card">
            <span className="dependent-avatar" aria-hidden="true">{dependent.first_name.slice(0, 1)}{dependent.last_name.slice(0, 1)}</span>
            <div className="dependent-summary"><h2>{name}</h2><p>{titleCase(dependent.relationship)}{dependent.date_of_birth && <> ? {age(dependent.date_of_birth)} yrs ? DOB: {formatDate(dependent.date_of_birth)}</>}</p>
              <span className="dependent-coverage"><span aria-hidden="true">?</span> Insurance not added</span>
            </div>
            <button className="dependent-view" onClick={() => setSelected(dependent)} aria-label={'View ' + name}>View</button>
          </li>;
        })}</ul>}
        <button className="dependent-add" onClick={() => setAdding(true)}><span aria-hidden="true">+</span> Add Another Dependent</button>
      </div>
      {adding && <AddDependent onClose={() => setAdding(false)} />}
      {selected && <Modal title="Dependent Details" subtitle="Family member information" onClose={() => setSelected(null)}>
        <div className="dependent-detail-name"><span className="dependent-avatar">{selected.first_name.slice(0, 1)}{selected.last_name.slice(0, 1)}</span><strong>{fullName(selected.first_name, selected.last_name)}</strong></div>
        <dl className="dependent-details">
          <div><dt>Date of birth</dt><dd>{selected.date_of_birth ? formatDate(selected.date_of_birth) : 'Not provided'}</dd></div>
          <div><dt>Gender</dt><dd>{selected.gender ? titleCase(selected.gender) : 'Not provided'}</dd></div>
          <div><dt>Relationship</dt><dd>{titleCase(selected.relationship)}</dd></div>
          <div><dt>Phone number</dt><dd>{selected.phone || 'Not provided'}</dd></div>
          <div><dt>Booking access</dt><dd>{selected.can_book_on_behalf ? 'You can book on their behalf' : 'View only'}</dd></div>
        </dl>
        <button className="dependent-done" onClick={() => setSelected(null)}>Done</button>
      </Modal>}
    </div>
  );
}

function AddDependent({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const save = useMutation({ mutationFn: patientApi.addDependent, onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: patientKeys.dependents() });
    toast.success('Dependent added'); onClose();
  } });
  const { register, formState, submit, error } = useApiForm(dependentSchema, {
    first_name: '', last_name: '', date_of_birth: '', relationship: '', phone: '',
  });
  return <Modal title="Add Dependent" subtitle="Add a family member to manage their appointments" onClose={onClose} busy={save.isPending}>
    <form noValidate className="dependent-form" onSubmit={submit(values => save.mutateAsync(values))}>
      <Field label="First Name" placeholder="First name" icon={<UserIcon />} error={error('first_name')} autoComplete="off" {...register('first_name')} />
      <Field label="Last Name" placeholder="Last name" icon={<UserIcon />} error={error('last_name')} autoComplete="off" {...register('last_name')} />
      <Field label="Date of Birth" type="date" icon={<CalendarIcon />} max={new Date().toISOString().slice(0, 10)} error={error('date_of_birth')} {...register('date_of_birth')} />
      <SelectField label="Gender" placeholder="Enter gender" icon={<GenderIcon />} error={error('gender')} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} {...register('gender')} />
      <Field label="Relationship" placeholder="Enter relationship" icon={<PhoneIcon />} error={error('relationship')} {...register('relationship')} />
      <Field label="Phone Number" type="tel" placeholder="Phone number" icon={<PhoneIcon />} hint="Optional" error={error('phone')} {...register('phone')} />
      {save.isError && <p className="dependent-save-error" role="alert">{save.error.message || 'Could not save your dependent. Please try again.'}</p>}
      <SubmitButton pending={formState.isSubmitting}>Add</SubmitButton>
    </form>
  </Modal>;
}

function Modal({ title, subtitle, children, onClose, busy = false }: { title: string; subtitle: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal(); document.body.style.overflow = 'hidden';
    return () => { element?.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, []);
  return <dialog ref={ref} className="dependent-modal" aria-labelledby="dependent-modal-title" aria-describedby="dependent-modal-subtitle" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => {
    if (busy || event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }}>
    <button className="dependent-modal-close" aria-label="Close dialog" disabled={busy} onClick={onClose}>?</button>
    <h2 id="dependent-modal-title">{title}</h2><p id="dependent-modal-subtitle">{subtitle}</p>
    {children}
  </dialog>;
}

function age(date: string) {
  const birthday = new Date(date + 'T00:00:00');
  const today = new Date();
  const years = today.getFullYear() - birthday.getFullYear();
  return years - (today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate()) ? 1 : 0);
}
