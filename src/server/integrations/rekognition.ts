import { env } from '@/server/config/env';
import { IntegrationNotConfiguredError } from '@/server/http/errors';

import type { Adapter } from './types';

/**
 * IA: 15. External Services > Image Moderation > Amazon Rekognition.
 *
 * Every uploaded photo is screened before it can be served. The verdict is
 * advisory, not final: anything flagged lands in the Photo Review queue
 * (IA: 14. Control Center > Approvals > Photo Review) for a person to decide.
 * Auto-rejecting a provider's headshot on a false positive costs more than a
 * queue does.
 */
export interface ModerationLabel {
  name: string;
  confidence: number;
  parentName?: string;
}

export interface RekognitionAdapter extends Adapter {
  moderateImage(input: { storageKey: string }): Promise<{
    labels: ModerationLabel[];
    /** True when no label exceeded REKOGNITION_MIN_CONFIDENCE. */
    isClean: boolean;
  }>;
  /** Confirms a headshot actually contains one clear, front-facing face. */
  detectFaces(input: { storageKey: string }): Promise<{
    faceCount: number;
    hasClearFace: boolean;
  }>;
}

export const rekognition: RekognitionAdapter = {
  vendor: 'amazon_rekognition',
  meter: 'amazon_rekognition',

  isConfigured() {
    return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.S3_BUCKET);
  },

  async moderateImage() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Amazon Rekognition');
    throw new Error('rekognition.moderateImage is not implemented yet.');
  },

  async detectFaces() {
    if (!this.isConfigured()) throw new IntegrationNotConfiguredError('Amazon Rekognition');
    throw new Error('rekognition.detectFaces is not implemented yet.');
  },
};
