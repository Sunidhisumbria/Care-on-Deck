import { customAlphabet } from 'nanoid';

/**
 * The booking ID a patient reads out on the phone: eight characters, with no
 * 0/O or 1/I to mishear. Shared by booking and rescheduling, because a moved
 * appointment is a new appointment with its own reference.
 */
export const newBookingReference = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
