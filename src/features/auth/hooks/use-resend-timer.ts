'use client';

import { useEffect, useState } from 'react';

/**
 * Counts down to the next allowed resend.
 *
 * Mirrors OTP_RESEND_INTERVAL_SECONDS on the server, duplicated rather than
 * imported because that module reaches for the database. The server stays the
 * authority: an early attempt is refused with a message saying how long is
 * left, and `restart` takes the real interval from that response.
 */
export const RESEND_SECONDS = 60;

export function useResendTimer(initial = RESEND_SECONDS) {
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  return {
    seconds,
    canResend: seconds <= 0,
    restart: (next = RESEND_SECONDS) => setSeconds(next || RESEND_SECONDS),
  };
}
