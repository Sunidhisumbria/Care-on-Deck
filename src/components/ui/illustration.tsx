import Image from 'next/image';

/**
 * The full-colour icons exported from Figma, in public/images/icons.
 *
 * Unlike the line icons in ./icons, these carry their own colour, so they sit
 * on a card without the tinted square the line icons need. Decorative, like
 * every icon: the label beside it carries the meaning.
 */
const ILLUSTRATIONS = {
  insuranceHealth: '/images/icons/insurance-health.png',
  insuranceDental: '/images/icons/insurance-dental.png',
  selfPay: '/images/icons/self-pay.png',
  reasonCheckup: '/images/icons/reason-checkup.png',
  reasonCold: '/images/icons/reason-cold.png',
  reasonChronic: '/images/icons/reason-chronic.png',
  reasonSkin: '/images/icons/reason-skin.png',
  reasonOther: '/images/icons/reason-other.png',
} as const;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

export function Illustration({ name, className = 'h-10 w-10' }: { name: IllustrationName; className?: string }) {
  return (
    <Image
      src={ILLUSTRATIONS[name]}
      alt=""
      aria-hidden="true"
      width={60}
      height={60}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
