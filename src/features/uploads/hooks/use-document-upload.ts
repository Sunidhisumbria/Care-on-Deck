'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { toApiError } from '@/lib/http/errors';
import {
  FILE_FORMATS,
  UPLOAD_PURPOSES,
  formatBytes,
  formatFromFile,
  formatList,
  isAllowedFormat,
  type UploadPurpose,
} from '@/lib/uploads';

import { uploadsApi } from '../api/uploads.api';
import type { UploadedFile, UploadTicket } from '../types';

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; progress: number }
  | { status: 'error'; message: string }
  /** Storage is not configured. Not a failure the person can fix by retrying. */
  | { status: 'unavailable' };

class UploadCancelled extends Error {}

/**
 * Uploads one document: ask the server, send the file to the store, confirm.
 *
 * The file goes by XMLHttpRequest rather than fetch only because fetch still
 * cannot report upload progress, and ten megabytes on a clinic's connection is
 * long enough that a frozen button reads as broken.
 */
export function useDocumentUpload(purpose: UploadPurpose) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const request = useRef<XMLHttpRequest | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      const rules = UPLOAD_PURPOSES[purpose];
      const format = formatFromFile(file);

      // Caught here so a wrong file never makes a request. The server checks
      // again against what actually arrives.
      if (!isAllowedFormat(purpose, format)) {
        setState({ status: 'error', message: `Upload a ${formatList(rules.formats)} file.` });
        return null;
      }
      if (file.size === 0) {
        setState({ status: 'error', message: 'That file is empty.' });
        return null;
      }
      if (file.size > rules.maxBytes) {
        setState({
          status: 'error',
          message: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(rules.maxBytes)}.`,
        });
        return null;
      }

      setState({ status: 'uploading', fileName: file.name, progress: 0 });

      try {
        const ticket = await uploadsApi.create({
          purpose,
          content_type: FILE_FORMATS[format].contentType,
          byte_size: file.size,
        });
        await sendToStore(ticket, file, request, (progress) =>
          setState({ status: 'uploading', fileName: file.name, progress }),
        );
        const stored = await uploadsApi.complete({ purpose, key: ticket.key });

        setState({ status: 'idle' });
        return { ...stored, file_name: file.name };
      } catch (error) {
        if (error instanceof UploadCancelled) {
          setState({ status: 'idle' });
          return null;
        }
        const apiError = toApiError(error);
        setState(
          apiError.code === 'NOT_IMPLEMENTED'
            ? { status: 'unavailable' }
            : { status: 'error', message: apiError.message },
        );
        return null;
      } finally {
        request.current = null;
      }
    },
    [purpose],
  );

  const cancel = useCallback(() => request.current?.abort(), []);

  return { state, upload, cancel };
}

function sendToStore(
  ticket: UploadTicket,
  file: File,
  holder: MutableRefObject<XMLHttpRequest | null>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.upload.fields)) form.append(name, value);
    // The file goes last: some stores stop reading fields once they reach it.
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    holder.current = xhr;

    xhr.open('POST', ticket.upload.url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error('The file service did not accept that file. Check it is a readable document and try again.'));
    xhr.onerror = () =>
      reject(new Error('The upload did not reach the file service. Check your connection and try again.'));
    xhr.onabort = () => reject(new UploadCancelled());

    xhr.send(form);
  });
}
