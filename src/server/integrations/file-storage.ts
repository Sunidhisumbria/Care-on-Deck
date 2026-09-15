import { cloudinary } from './cloudinary';
import type { FileStorageAdapter } from './types';

/**
 * The file store feature code uses.
 *
 * Cloudinary until the client's AWS account is connected, S3 after. Nothing
 * outside this file names a vendor, so the move is this line plus copying the
 * files that already exist -- no endpoint or screen changes.
 */
export const fileStorage: FileStorageAdapter = cloudinary;
