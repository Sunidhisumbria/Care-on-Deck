'use client';

import { useState, type ReactNode } from 'react';

import { ChevronLeft, FormIcon, ImageIcon, ScanFrameIcon } from '@/components/ui/icons';
import { Illustration } from '@/components/ui/illustration';
import type { OptionCard } from '@/components/ui/option-cards';
import { INSURANCE_TYPES } from '@/lib/patient-insurance';

import type { InsuranceType, SavedInsurance, SavedInsuranceDetail } from '../types';
import { SecondaryButton } from './buttons';
import { CardCamera } from './card-camera';
import { PhotoForReference, PhotoReview, usePhotoPicker } from './card-photo';
import { ChoiceStep } from './choice-step';
import { InsuranceForm } from './insurance-form';

type Method = 'scan' | 'upload' | 'manual';
type Stage = 'type' | 'method' | 'camera' | 'review' | 'form';

interface Photo {
  blob: Blob;
  source: 'scan' | 'upload';
}

const TYPE_OPTIONS: OptionCard<InsuranceType>[] = INSURANCE_TYPES.map((type) => ({
  value: type.value,
  title: type.title,
  caption: type.caption,
  icon: <Illustration name={type.value === 'dental' ? 'insuranceDental' : 'insuranceHealth'} />,
}));

const METHOD_OPTIONS: OptionCard<Method>[] = [
  {
    value: 'scan',
    title: 'Scan insurance card',
    caption: 'Use your camera to capture the card',
    icon: <ScanFrameIcon className="h-5 w-5" />,
  },
  {
    value: 'upload',
    title: 'Upload a photo',
    caption: 'Choose an existing photo from your device.',
    icon: <ImageIcon className="h-5 w-5" />,
  },
  {
    value: 'manual',
    title: 'Enter information manually',
    caption: 'Type your insurance details directly',
    icon: <FormIcon className="h-5 w-5" />,
  },
];

/**
 * Adding or updating one insurance card: the type, how to enter it, then the
 * fields. Booking and the Insurance screen both use this, so they cannot drift.
 *
 * The stages are local state, not routes. The handoff asks to keep the patient
 * in the insurance context, and a patient part-way through booking should not
 * be navigated away to add a card.
 *
 * Card reading is not switched on: it needs Amazon Textract under a signed AWS
 * BAA, which is not in place. So after "Use photo" the patient types the
 * details with their photo above the form to copy from, and the photo is never
 * uploaded. When reading is approved it goes between the review and the form,
 * pre-filling the same fields.
 */
export function AddInsuranceFlow({
  editing = null,
  start,
  onSaved,
  onCancel,
}: {
  /** The card being updated, with its full member ID. */
  editing?: SavedInsuranceDetail | null;
  start?: 'type' | 'form' | 'camera';
  onSaved: (saved: SavedInsurance) => void;
  onCancel?: () => void;
}) {
  const first: Stage = start ?? (editing ? 'form' : 'type');
  const [stage, setStage] = useState<Stage>(first);
  const [type, setType] = useState<InsuranceType | null>(editing?.insurance_type ?? null);
  const [method, setMethod] = useState<Method | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);

  const picker = usePhotoPicker((blob) => {
    setPhoto({ blob, source: 'upload' });
    setStage('review');
  });

  function enterManually() {
    setPhoto(null);
    setStage('form');
  }

  function retake() {
    if (photo?.source === 'upload') picker.open();
    else setStage('camera');
  }

  const back: (() => void) | null =
    stage === 'type'
      ? (onCancel ?? null)
      : stage === 'method'
        ? () => setStage('type')
        : stage === 'review'
          ? () => setStage(editing ? 'form' : 'method')
          : stage === 'form' && !editing
            ? () => setStage('method')
            : null;

  let body: ReactNode;

  if (stage === 'type') {
    body = (
      <ChoiceStep
        title="What type of insurance are you adding?"
        subtitle="Select the insurance type printed on your card."
        name="insurance-type"
        iconFrame={false}
        options={TYPE_OPTIONS}
        value={type}
        onChange={setType}
        onContinue={() => setStage('method')}
      />
    );
  } else if (stage === 'method') {
    body = (
      <ChoiceStep
        title="Insurance information"
        subtitle={`Save time by scanning your ${type ?? 'health'} insurance card.`}
        name="insurance-method"
        options={METHOD_OPTIONS}
        value={method}
        onChange={setMethod}
        onContinue={(chosen) => {
          if (chosen === 'scan') setStage('camera');
          else if (chosen === 'upload') picker.open();
          else enterManually();
        }}
        footer={
          <p className="mt-3 text-[0.6875rem] text-ink-500">
            Your card information is used to help complete your health or dental insurance details. Please
            review all information before saving.
          </p>
        }
      />
    );
  } else if (stage === 'camera') {
    body = (
      <CardCamera
        insuranceType={type ?? 'health'}
        onPhoto={(blob) => {
          setPhoto({ blob, source: 'scan' });
          setStage('review');
        }}
        onCancel={() => (first === 'camera' ? onCancel?.() : setStage(editing ? 'form' : 'method'))}
        onUpload={picker.open}
        onManual={enterManually}
      />
    );
  } else if (stage === 'review' && photo) {
    body = <PhotoReview photo={photo.blob} onRetake={retake} onUse={() => setStage('form')} />;
  } else {
    body = (
      <InsuranceForm
        insuranceType={type ?? 'health'}
        editing={editing}
        notice={photo ? <PhotoForReference photo={photo.blob} /> : null}
        secondaryAction={photo ? <SecondaryButton onClick={retake}>Retake card photo</SecondaryButton> : null}
        onSaved={onSaved}
      />
    );
  }

  return (
    <div>
      {picker.element}
      {back ? (
        <button
          type="button"
          onClick={back}
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </button>
      ) : null}
      {body}
    </div>
  );
}
