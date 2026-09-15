'use client';

import { StethoscopeIcon, UserIcon } from '@/components/ui/icons';
import { Segmented } from '@/components/ui/segmented';

import type { InterfaceRole } from '../types';

/**
 * The Patient / Doctor choice, shared by sign-in and sign-up.
 *
 * "Doctor" is the word on the button and `provider` is the word in the API;
 * this is the only component that has to know both.
 */
export function RoleTabs({
  label,
  value,
  onChange,
}: {
  label: string;
  value: InterfaceRole;
  onChange: (next: InterfaceRole) => void;
}) {
  return (
    <>
      <p className="mb-1.5 mt-6 text-[0.8125rem] font-semibold text-ink-700">{label}</p>
      <Segmented
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: 'patient', label: 'Patient', icon: <UserIcon /> },
          { value: 'provider', label: 'Doctor', icon: <StethoscopeIcon /> },
        ]}
      />
    </>
  );
}
