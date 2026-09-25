'use client';

import { useFieldArray } from 'react-hook-form';

import { Field, SelectField, SubmitButton } from '@/components/ui/field';
import { ClockIcon, CrossIcon } from '@/components/ui/icons';
import { Toggle } from '@/components/ui/toggle';
import { useApiForm } from '@/lib/forms/use-api-form';
import {
  APPOINTMENT_LENGTHS,
  WEEKDAYS,
  formatAppointmentLength,
  scheduleSchema,
  type ScheduleValues,
} from '@/lib/schedule';

const MAX_BREAKS = 3;

/**
 * Weekly hours, breaks and appointment length. Shared by onboarding's Schedule
 * step and Personal Information > Availability. Breaks apply to every day the
 * provider is available.
 */
export function ScheduleForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues: ScheduleValues;
  submitLabel: string;
  onSubmit: (values: ScheduleValues) => Promise<unknown>;
}) {
  const { register, control, watch, setValue, formState, submit, error } = useApiForm(scheduleSchema, defaultValues);
  const breaks = useFieldArray({ control, name: 'breaks' });
  const days = watch('days');

  return (
    <form noValidate onSubmit={submit(onSubmit)}>
      <SelectField
        label="Appointment Length"
        placeholder="Select length"
        options={APPOINTMENT_LENGTHS.map((minutes) => ({
          value: String(minutes),
          label: formatAppointmentLength(minutes),
        }))}
        error={error('appointment_minutes')}
        {...register('appointment_minutes')}
      />

      <div className="mt-5 divide-y divide-line">
        {WEEKDAYS.map(({ weekday, label }) => {
          const index = days.findIndex((day) => day.weekday === weekday);
          const day = days[index];
          if (!day) return null;

          return (
            <div key={weekday} className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-900">{label}</span>
                <Toggle
                  label={`Available on ${label}`}
                  checked={day.enabled}
                  onChange={(enabled) =>
                    setValue(`days.${index}.enabled`, enabled, {
                      shouldDirty: true,
                      shouldValidate: formState.isSubmitted,
                    })
                  }
                />
              </div>

              {day.enabled ? (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Field
                    label="From"
                    type="time"
                    icon={<ClockIcon />}
                    error={error(`days.${index}.start`)}
                    {...register(`days.${index}.start`)}
                  />
                  <Field
                    label="To"
                    type="time"
                    icon={<ClockIcon />}
                    error={error(`days.${index}.end`)}
                    {...register(`days.${index}.end`)}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error('days') ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error('days')}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
        <div>
          <p className="text-sm font-semibold text-ink-900">Add Break Hours</p>
          <p className="text-xs text-ink-500">Applies to every day you&rsquo;re available.</p>
        </div>
        <button
          type="button"
          onClick={() => breaks.append({ start: '12:00', end: '13:00' })}
          disabled={breaks.fields.length >= MAX_BREAKS}
          className="text-sm font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
        >
          Add Break
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {breaks.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
            <Field
              label="Break Start"
              type="time"
              icon={<ClockIcon />}
              error={error(`breaks.${index}.start`)}
              {...register(`breaks.${index}.start`)}
            />
            <Field
              label="Break End"
              type="time"
              icon={<ClockIcon />}
              error={error(`breaks.${index}.end`)}
              {...register(`breaks.${index}.end`)}
            />
            <button
              type="button"
              onClick={() => breaks.remove(index)}
              aria-label={`Remove break ${index + 1}`}
              className="mt-8 rounded-full p-2 text-ink-500 transition-colors hover:bg-brand-50 hover:text-red-600"
            >
              <CrossIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SubmitButton pending={formState.isSubmitting}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
