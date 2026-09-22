"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

import { DoctorAvatar, Icon } from "./care-visuals";
import "./landing-sections.css";

type Discover = (specialty: string) => void;
type ArtKind =
  | "tooth"
  | "skin"
  | "waist"
  | "eye"
  | "hand"
  | "brain"
  | "filling"
  | "root"
  | "implant"
  | "braces";

function CareArt({ kind }: { kind: ArtKind }) {
  const tooth = (
    <>
      <path
        d="M21 13c-8-6-15 1-11 13 3 8 2 26 8 26 4 0 3-17 7-17s3 17 7 17c6 0 5-18 8-26 4-12-3-19-11-13l-4 2Z"
        fill="#f4fbff"
        stroke="#b8dce7"
        strokeWidth="1.5"
      />
      <path
        d="m23 15 7 3M13 20c-1 5 1 10 2 12"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
  return (
    <svg viewBox="0 0 60 60" className="landing-care-art" aria-hidden="true">
      {kind === "tooth" && (
        <>
          <path d="M7 40h12l5 14H7Zm46 0H41l-5 14h17Z" fill="#e8388b" />
          {tooth}
          <path
            d="m7 8 2 4 4 1-4 2-1 4-2-4-4-1 4-2Zm37 1 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
            fill="#facd43"
          />
          <path d="m42 36 2 4 5 1-5 2-1 4-2-4-4-1 4-2Z" fill="#f8ca45" />
        </>
      )}
      {kind === "skin" && (
        <>
          <path d="M17 32C8 18 18 7 29 7s21 9 17 23Z" fill="#86514d" />
          <path d="M24 35v9L9 49v7h42v-7l-16-5v-9" fill="#f5b6a3" />
          <ellipse cx="30" cy="25" rx="12" ry="17" fill="#ffd5bd" />
          <path d="M17 19c8-1 11-9 11-9s4 8 15 10" fill="#86514d" />
          <path
            d="M24 25h2m8 0h2m-9 8q3 2 6 0"
            fill="none"
            stroke="#a46e65"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="m8 25 2 4 4 1-4 2-1 4-2-4-4-1 4-2m38 5 2 4 4 1-4 2-1 4-2-4-4-1 4-2"
            fill="#f99abb"
          />
          <path
            d="m10 49 15-8m25 8-15-8"
            stroke="#fff1e8"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "waist" && (
        <>
          <path d="M15 7h30l-5 15 3 13 3 18H14l3-18 3-13Z" fill="#ffd2a9" />
          <path d="M15 4h30v8H15Z" fill="#35bceb" />
          <path d="m17 42 13 5 13-5 3 12H14Z" fill="#3aaee7" />
          <path d="M30 32v3" stroke="#d49670" strokeWidth="2" />
          <path
            d="M9 16 7 35m0 0 5-4m-5 4-4-5M51 16l2 19m0 0-5-4m5 4 4-5"
            fill="none"
            stroke="#69c66f"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "eye" && (
        <>
          <path
            d="M2 30S13 11 30 11s28 19 28 19-11 19-28 19S2 30 2 30Z"
            fill="#f5b591"
          />
          <path
            d="M7 30s10-13 23-13 23 13 23 13-10 13-23 13S7 30 7 30Z"
            fill="#fff"
          />
          <circle cx="30" cy="30" r="12" fill="#44b5bc" />
          <circle cx="30" cy="30" r="6" fill="#305367" />
          <circle cx="34" cy="26" r="3" fill="#fff" />
        </>
      )}
      {kind === "hand" && (
        <>
          <path
            d="M20 32V14c0-5 6-5 6 0V8c0-5 6-5 6 0v4c0-5 6-5 6 0v4c0-5 6-5 6 0v21c0 9-5 13-6 19H22c0-8-5-10-8-18l-4-10c-2-6 4-8 7-3Z"
            fill="#f7b39b"
          />
          <path
            d="M26 15v14m6-14v13m6-10v11"
            stroke="#e68d86"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="37" r="5" fill="#e87579" />
          <circle cx="35" cy="31" r="2" fill="#ee8582" />
          <circle cx="24" cy="45" r="2.5" fill="#ec8582" />
        </>
      )}
      {kind === "brain" && (
        <>
          <path
            d="M30 10C18 2 6 13 8 23c-8 10 1 23 12 22 3 7 11 5 13 0 9 6 22-2 19-13 8-9 0-20-8-20-4-7-10-7-14-2Z"
            fill="#fa9ba5"
          />
          <path
            d="M30 11v33M20 13c-5 3 1 8-4 11m-2 6c8-5 3 9 10 9m-2-17c8 1 0 10 5 13m10-20c8 1-1 9 7 11m-7 4c8 0 1 9 6 11m-8-20c-5 3 1 7-2 12"
            fill="none"
            stroke="#ed788d"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="m28 44 3 12h6l-1-12" fill="#f394a0" />
        </>
      )}
      {kind === "filling" && (
        <>
          {tooth}
          <path
            d="m21 15 5 6 6-7"
            stroke="#e977a7"
            strokeWidth="5"
            fill="none"
          />
          <path d="m46 5-9 14" stroke="#a1abbc" strokeWidth="3" />
          <path d="m48 3 7-2" stroke="#b6c4d0" strokeWidth="4" />
          <path d="M42 40h13v13H42Z" fill="#f6a0ba" />
        </>
      )}
      {kind === "root" && (
        <>
          <path d="M4 35h50v20H4Z" fill="#ec92a1" />
          {tooth}
          <path
            d="M24 18v16m0-1-7 14m7-14 8 14"
            stroke="#ea677f"
            fill="none"
            strokeWidth="2.5"
          />
          <path d="m45 7-15 17" stroke="#a5acb4" strokeWidth="3" />
          <path d="m41 7 6 6" stroke="#60b6d3" strokeWidth="5" />
        </>
      )}
      {kind === "implant" && (
        <>
          <path d="M9 35h42v19H9Z" fill="#f3a0aa" />
          <path d="M25 25h12v27H25Z" fill="#a4b4be" />
          <path
            d="m22 30 18 5m-18 3 18 5m-17 3 16 5"
            stroke="#e4edf2"
            strokeWidth="3"
          />
          <path
            d="M19 22c-6-11 3-17 11-12 8-5 17 1 11 12l-4 10H23Z"
            fill="#fcffff"
            stroke="#b9d5dd"
          />
          <path d="m6 14 5 3m-3-7 4 4" stroke="#df8fa8" strokeWidth="2" />
        </>
      )}
      {kind === "braces" && (
        <>
          <path d="M3 13q27 12 54 0v29q-27 12-54 0Z" fill="#f7a6b6" />
          {[8, 19, 30, 41].map((x) => (
            <rect
              key={x}
              x={x}
              y="22"
              width="10"
              height="18"
              rx="3"
              fill="#fff"
              stroke="#d8e5eb"
            />
          ))}
          <path d="M5 31h50" stroke="#9caebb" strokeWidth="2" />
          {[11, 22, 33, 44].map((x) => (
            <rect
              key={x}
              x={x}
              y="27"
              width="5"
              height="8"
              rx="1"
              fill="#c3aec9"
            />
          ))}
        </>
      )}
    </svg>
  );
}

export function BookingShortcuts({
  onDiscover,
  onInsurance,
}: {
  onDiscover: Discover;
  onInsurance: () => void;
}) {
  return (
    <section className="landing-shortcuts" aria-label="Find care your way">
      <button onClick={() => onDiscover("Direct Booking")}>
        <Icon name="calendar" />
        <span>
          <strong>Direct Booking</strong>
          <small>Filtered providers supporting online booking.</small>
        </span>
      </button>
      <button onClick={() => onDiscover("Same-day appointments")}>
        <Icon name="clock" />
        <span>
          <strong>Same-day appointments</strong>
          <small>Filtered providers with same-day availability.</small>
        </span>
      </button>
      <button onClick={onInsurance}>
        <Icon name="shield" />
        <span>
          <strong>Filter by your insurance</strong>
          <small>Open insurance-plan filter.</small>
        </span>
      </button>
    </section>
  );
}

/**
 * An image exported from the Figma design, with a stand-in until the file exists.
 *
 * The illustrations, logos and category artwork live in public/images/landing and
 * are exported from Figma by hand. Until a file is there, `fallback` is shown in
 * its place -- never a broken-image icon -- and adding the file is the only change
 * needed for the real artwork to appear. The image stays hidden until it has
 * actually loaded, so the stand-in never flickers against it.
 */
export function DesignImage({
  src,
  alt,
  width,
  height,
  className = "",
  fallback = null,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback?: ReactNode;
  sizes?: string;
  priority?: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "missing">("loading");

  return (
    <span className={"landing-design-image " + className} data-state={state}>
      {state === "loaded" ? null : fallback}
      {state === "missing" ? null : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          onLoad={() => setState("loaded")}
          onError={() => setState("missing")}
        />
      )}
    </span>
  );
}

/** The hero's illustrations: the family with their doctor on the left, the clinic on the right. */
export function HeroArt() {
  return (
    <div className="lp-hero-art" aria-hidden="true">
      <DesignImage
        src="/images/landing/hero-family.webp"
        alt=""
        width={620}
        height={500}
        sizes="(max-width: 1000px) 0px, 34vw"
        className="lp-hero-art-left"
        priority
      />
      <DesignImage
        src="/images/landing/hero-hospital.webp"
        alt=""
        width={600}
        height={500}
        sizes="(max-width: 1000px) 0px, 32vw"
        className="lp-hero-art-right"
        priority
      />
    </div>
  );
}

const HIGHLIGHTS = [
  { title: "Book", caption: "Appointments in minutes", file: "hero-book", icon: "calendar" },
  { title: "Trusted", caption: "Verified healthcare providers", file: "hero-trusted", icon: "shield" },
  { title: "Care", caption: "For a healthier tomorrow", file: "hero-care", icon: "heart" },
] as const;

/** Book, Trusted, Care: the three promises under the hero search, joined by a dotted line. */
export function HeroHighlights() {
  return (
    <ul className="lp-hero-highlights" aria-label="Why CareOndeck">
      {HIGHLIGHTS.map((item) => (
        <li key={item.title}>
          <DesignImage
            src={"/images/landing/" + item.file + ".webp"}
            alt=""
            width={112}
            height={112}
            className="lp-hero-highlight-art"
            fallback={
              <span className="lp-hero-highlight-icon">
                <Icon name={item.icon} />
              </span>
            }
          />
          <strong>{item.title}</strong>
          <span>{item.caption}</span>
        </li>
      ))}
    </ul>
  );
}

const TRENDING: { label: string; query: string; art: ArtKind; file: string }[] = [
  { label: "Teeth Whitening", query: "Teeth Whitening", art: "tooth", file: "teeth-whitening" },
  { label: "Skin Tightening", query: "Skin Tightening", art: "skin", file: "skin-tightening" },
  { label: "Weight Lose", query: "Weight Loss", art: "waist", file: "weight-loss" },
  { label: "OB-GYN", query: "OB-GYN", art: "eye", file: "ob-gyn" },
  { label: "Dermatologist", query: "Dermatologist", art: "hand", file: "dermatologist" },
  { label: "Psychiatrist", query: "Psychiatrist", art: "brain", file: "psychiatrist" },
];

/** Trending Now: six care categories, each opening a search for it. */
export function TrendingNow({ onDiscover }: { onDiscover: Discover }) {
  return (
    <section className="lp-section landing-categories" aria-labelledby="trending-heading">
      <h2 id="trending-heading">Trending Now</h2>
      <div className="landing-category-grid">
        {TRENDING.map((item) => (
          <button key={item.label} onClick={() => onDiscover(item.query)}>
            <DesignImage
              src={"/images/landing/trending/" + item.file + ".png"}
              alt=""
              width={128}
              height={128}
              className="landing-care-art"
              fallback={<CareArt kind={item.art} />}
            />
            <strong>{item.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

const benefits = [
  {
    icon: "check",
    title: "Verified Reviews",
    body: "Every review comes from a confirmed patient visit—no fake ratings.",
  },
  {
    icon: "calendar",
    title: "Instant Booking",
    body: "Book 24/7 without phone calls, forms, or waiting on hold.",
  },
  {
    icon: "users",
    title: "In-Person or Virtual",
    body: "Track paid & overdue automatically",
  },
  {
    icon: "shield",
    title: "Privacy First",
    body: "Your health data is yours. We never sell or share patient information.",
  },
] as const;

export function BookingBenefits() {
  return (
    <section className="landing-benefits" aria-labelledby="benefits-heading">
      <div className="landing-benefits-lines" aria-hidden="true" />
      <div className="lp-container landing-benefits-grid">
        <div className="landing-benefits-art">
          <h2 id="benefits-heading">
            Trusted Care.
            <br />
            <span>Booking Benefits.</span>
          </h2>
          <Image
            src="/images/landing/booking-benefits.png"
            alt="A woman booking care on her phone beside an appointment calendar"
            width={1448}
            height={1086}
            sizes="(max-width: 760px) 90vw, 520px"
          />
        </div>
        <div className="landing-benefits-list">
          {benefits.map((benefit, index) => (
            <article key={benefit.title}>
              <span className="landing-benefit-icon">
                <Icon name={benefit.icon} />
              </span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.body}</p>
              </div>
              <span className="landing-benefit-number">
                {String(index + 1).padStart(2, "0")}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepMockup({ step }: { step: number }) {
  return (
    <div
      className={"landing-step-mockup landing-step-" + step}
      aria-hidden="true"
    >
      {step === 1 && (
        <div className="landing-mini-search">
          <div className="landing-mini-searchbar">
            <Icon name="search" />
            <span>Search doctors or specialties</span>
            <span>
              <Icon name="search" />
            </span>
          </div>
          {["Dr. Emily Carter", "Dr. Michael Lee"].map((name, i) => (
            <div className="landing-mini-result" key={name}>
              <DoctorAvatar />
              <span>
                <strong>{name}</strong>
                <small>{i ? "Dentist" : "Primary Care"}</small>
                <small>
                  <b>4.9</b> <span className="landing-mini-star">★</span> (120
                  reviews)
                </small>
              </span>
              <Icon name="chevron" />
            </div>
          ))}
        </div>
      )}
      {step === 2 && (
        <div className="landing-mini-profile">
          <div>
            <DoctorAvatar badge />
            <span>
              <strong>Dr. Emily Carter, MD</strong>
              <small>Primary Care</small>
              <small>
                <b>4.9</b> <span className="landing-mini-star">★</span> (120
                reviews)
              </small>
            </span>
          </div>
          <p>
            <Icon name="calendar" /> In-person + Video Visit
          </p>
          <p>
            <Icon name="users" /> Accepting new patients
          </p>
          <span className="landing-mini-profile-button">View Profile</span>
        </div>
      )}
      {step === 3 && (
        <div className="landing-mini-calendar">
          <strong>Select Date &amp; Time</strong>
          <div className="landing-mini-week">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
              <span key={day}>
                <small>{day}</small>
                <b className={i === 3 ? "is-selected" : ""}>{18 + i}</b>
              </span>
            ))}
          </div>
          <div className="landing-mini-times">
            {["9:00 AM", "10:00 AM", "1:00 PM", "2:00 PM"].map((time, i) => (
              <span className={i === 1 ? "is-selected" : ""} key={time}>
                {time}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingSteps({
  onDiscover,
  onInsurance,
}: {
  onDiscover: Discover;
  onInsurance: () => void;
}) {
  const steps = [
    {
      text: "Look up doctors by specialty and choose your insurance",
      action: onInsurance,
    },
    {
      text: "Browse provider profiles, read reviews, and choose the best fit.",
      action: () => onDiscover("Doctors"),
    },
    {
      text: "Pick a date and time that works for you.",
      action: () => onDiscover("Available appointments"),
    },
  ];
  return (
    <section
      className="lp-section landing-steps"
      aria-labelledby="booking-steps-heading"
    >
      <h2 id="booking-steps-heading">
        Book your online appointment in 3 easy steps
      </h2>
      <ol>
        {steps.map((step, index) => (
          <li key={step.text}>
            <button
              onClick={step.action}
              aria-label={"Step " + (index + 1) + ": " + step.text}
            >
              <span className="landing-step-number">{index + 1}</span>
              <StepMockup step={index + 1} />
              <span className="landing-step-caption">{step.text}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FeaturedCare({ onDiscover }: { onDiscover: Discover }) {
  return (
    <section
      className="lp-section landing-featured"
      aria-labelledby="featured-care-heading"
    >
      <h2 id="featured-care-heading">Featured Care</h2>
      <div className="landing-featured-grid">
        {[
          {
            badge: "Trending",
            name: "Weight Loss Programs",
            image: "featured-weight-loss.jpg",
            description:
              "Find certified weight-management specialists and dietitians near you",
            alt: "Woman exercising in a sunlit fitness studio",
          },
          {
            badge: "Popular",
            name: "Cosmetic Treatments",
            image: "featured-cosmetic.jpg",
            description:
              "Explore Botox, fillers, laser treatments and more from verified providers.",
            alt: "A facial treatment being applied at a skincare clinic",
          },
        ].map((item) => (
          <button
            className="landing-featured-card"
            key={item.name}
            onClick={() => onDiscover(item.name)}
          >
            <Image
              src={"/images/landing/" + item.image}
              alt={item.alt}
              fill
              sizes="(max-width: 600px) 90vw, 560px"
            />
            <span className="landing-featured-badge">{item.badge}</span>
            <span className="landing-featured-caption">
              <strong>{item.name}</strong>
              <span>{item.description}</span>
              <small>
                Explore <Icon name="arrow" />
              </small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
