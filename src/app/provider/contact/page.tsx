'use client';

import { AccountHero } from '@/features/patient/components/account-hero';
import { ContactForm } from '@/features/support/contact-form';

/** Account menu > Contact Us. */
export default function ContactPage() {
  return (
    <>
      <AccountHero title="Contact Us" subtitle="Have questions or need assistance? We're happy to help." />
      <div className="mx-auto max-w-lg px-5 py-10 lg:py-12">
        <ContactForm />
      </div>
    </>
  );
}
