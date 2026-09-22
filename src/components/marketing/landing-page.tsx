"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { SelectMenu } from "@/components/ui/select-menu";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

import { Icon, Wordmark, DoctorAvatar } from "./care-visuals";
import {
  BookingBenefits,
  BookingShortcuts,
  BookingSteps,
  DesignImage,
  FeaturedCare,
  HeroArt,
  HeroHighlights,
  TrendingNow,
} from "./landing-sections";
import { AccountArea, RoleMenu } from "./site-header";
import "./landing-page.css";
import "./patient-home.css";
import { SiteFooter } from "./site-footer";

const insuranceNames = [
  "BlueCross BlueShield",
  "Cigna",
  "United Healthcare",
  "Aetna",
  "Delta Dental",
  "Humana",
];

/** The logo files exported from Figma, in the same order as insuranceNames. */
const insuranceLogoFiles = [
  "bluecross-blueshield",
  "cigna",
  "united-healthcare",
  "aetna",
  "delta-dental",
  "humana",
];

/** The search bar's insurance list: the two "not sure" answers, then carriers. */
const INSURANCE_CHOICES = [
  { value: "self-pay", label: "I’m paying for myself" },
  { value: "not-sure", label: "I’ll choose my insurance later" },
  ...insuranceNames.map((name) => ({ value: name, label: name })),
];
function InsuranceLogo({ index }: { index: number }) {
  if (index === 0)
    return (
      <span className="lp-insurer-bcbs">
        <svg viewBox="0 0 70 38" aria-hidden="true">
          <path d="M9 4h15v8h9v15h-9v8H9v-8H0V12h9Z" fill="#0086ba" />
          <path d="M16 8v23M5 19h24" stroke="white" strokeWidth="2" />
          <path
            d="M20 9c-13 4 4 9-7 15m7-9c-14 4 3 8-6 12"
            fill="none"
            stroke="white"
          />
          <path d="M39 5 53 1 67 5v18L53 37 39 23Z" fill="#0086ba" />
          <path
            d="m43 9 10-3 10 3v12L53 31 43 21Zm10 1v17m-5-14 9 3-8 4 7 3"
            fill="none"
            stroke="#fff"
            strokeWidth="1.5"
          />
        </svg>
        <span>
          BlueCross
          <br />
          BlueShield<small>AN INDEPENDENT LICENSEE</small>
        </span>
      </span>
    );
  if (index === 1)
    return (
      <span className="lp-insurer-cigna">
        <svg viewBox="0 0 40 48" aria-hidden="true">
          <path
            d="M19 26v18m0-11L10 23m9 10 10-10"
            stroke="#3495bc"
            strokeWidth="3"
            fill="none"
          />
          {Array.from({ length: 13 }, (_, i) => (
            <ellipse
              key={i}
              cx={Math.round((20 + Math.cos(i * 0.49) * 13) * 100) / 100}
              cy={Math.round((16 + Math.sin(i * 0.49) * 12) * 100) / 100}
              rx="2.4"
              ry="5"
              transform={
                "rotate(" +
                i * 28 +
                " " +
                Math.round((20 + Math.cos(i * 0.49) * 13) * 100) / 100 +
                " " +
                Math.round((16 + Math.sin(i * 0.49) * 12) * 100) / 100 +
                ")"
              }
              fill="#78b75d"
            />
          ))}
        </svg>
        <span>Cigna</span>
      </span>
    );
  if (index === 2)
    return (
      <span className="lp-insurer-united">
        <svg viewBox="0 0 30 45" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <path
              key={i}
              d={"M" + (3 + i * 5) + " " + (9 - i * 2) + "v25q-2 8-5 5"}
              stroke="#214e90"
              strokeWidth="3"
              fill="none"
            />
          ))}
        </svg>
        <span>
          United
          <br />
          Healthcare
        </span>
      </span>
    );
  if (index === 3)
    return (
      <span className="lp-insurer-aetna">
        <span>♥</span>aetna
      </span>
    );
  if (index === 4)
    return (
      <span className="lp-insurer-delta">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="m16 3 14 25H2L16 3Zm0 10-7 12h14L16 13Z"
            fill="currentColor"
          />
          <path d="M9 20h14" stroke="white" strokeWidth="2" />
        </svg>
        <span>
          DELTA
          <br />
          DENTAL
        </span>
      </span>
    );
  return <span className="lp-insurer-humana">Humana</span>;
}

const videoPortraits = [
  "doctor-woman.jpg",
  "doctor-man.jpg",
  "doctor-clinic.jpg",
  "doctor-young.jpg",
];
const slots = ["4:30 PM", "5:30 PM", "6:30 PM", "7:30 PM"];
type ModalState =
  | { kind: "insurance"; index?: number }
  | { kind: "booking"; time: string; dentist: boolean }
  | { kind: "video"; index: number }
  | { kind: "appointments" }
  | { kind: "search"; query: string; location: string; insurance: string }
  | { kind: "info"; title: string; body: string };

function SectionHeading({
  title,
  action,
  onClick,
}: {
  title: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="lp-section-heading">
      <h2>{title}</h2>
      <button className="lp-text-link" onClick={onClick}>
        {action}
        <Icon name="arrow" />
      </button>
    </div>
  );
}

function ProviderCard({
  dentist,
  index,
  onBook,
}: {
  dentist: boolean;
  index: number;
  onBook: (time: string) => void;
}) {
  const [selected, setSelected] = useState("");
  return (
    <article className="lp-provider-card">
      <div className="lp-provider-top">
        <DoctorAvatar badge={dentist ? index === 2 : index === 0} />
        <div className="lp-provider-info">
          <h3>Dr. John J. MD</h3>
          <p className="lp-provider-specialty">{dentist ? "Dentist" : "Dermatologist"}</p>
          <p className="lp-provider-rating">
            <Icon name="star" />
            <strong>4.95</strong>
            <span>·</span>
            <Icon name="pin" />
            <span>Brooklyn, NY · 3.1 miles</span>
          </p>
          <p className="lp-next-available">
            <Icon name="calendar" />
            Next Available: 3:30 PM
          </p>
        </div>
      </div>
      <div className="lp-time-slots">
        <span>Available:</span>
        {slots.map((time) => (
          <button
            key={time}
            aria-pressed={selected === time}
            className={selected === time ? "is-selected" : ""}
            onClick={() => setSelected(time)}
          >
            {time}
          </button>
        ))}
      </div>
      <div className="lp-other-locations">
        <strong>Also available at:</strong>
        <p>
          <Icon name="pin" />
          Jersey City, NJ<span>·</span>
          <Icon name="pin" />
          Jersey City, NJ
        </p>
      </div>
      <button
        className="lp-primary lp-book-button"
        onClick={() => onBook(selected || "3:30 PM")}
      >
        Book Appointment
      </button>
    </article>
  );
}

export function LandingPage() {
  return <CareDiscoveryPage variant="landing" />;
}

export function HomePage() {
  return <CareDiscoveryPage variant="home" />;
}

function CareDiscoveryPage({ variant }: { variant: "landing" | "home" }) {
  const { user } = useCurrentUser();
  const [activeNav, setActiveNav] = useState("doctor");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [insurance, setInsurance] = useState("");
  const [appointmentOffset, setAppointmentOffset] = useState(0);
  const [videoOffset, setVideoOffset] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!modal) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [modal]);

  function discover(specialty: string) {
    setQuery(specialty);
    setModal({ kind: "search", query: specialty, location, insurance });
  }
  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setModal({ kind: "search", query, location, insurance });
  }
  function navigate(section: "doctor" | "dentist") {
    setActiveNav(section);
    document
      .getElementById(section === "doctor" ? "doctors" : "dentists")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <div className={"lp lp-" + variant}>
      <a className="lp-skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="lp-hero">
        <div className="lp-hero-ribbons" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <HeroArt />
        <header className="lp-header lp-container">
          <Wordmark />
          <nav className="lp-main-nav" aria-label="Main navigation">
            <button
              className={activeNav === "doctor" ? "is-active" : ""}
              onClick={() => navigate("doctor")}
            >
              Find a Doctor
            </button>
            <button
              className={activeNav === "dentist" ? "is-active" : ""}
              onClick={() => navigate("dentist")}
            >
              Find a Dentist
            </button>
            <Link href="/signup?role=doctor">CareOndeck for Providers</Link>
          </nav>
          {variant === "landing" ? (
            <div className="lp-public-auth">
              {user ? (
                /*
                  Signed in, this header has two things to offer: the way back
                  in, and the way out. The way back in leads, because it is the
                  one people came here to use; signing out is the rarer
                  intention and sits quietly beside it. Sign Up is deliberately
                  absent -- it was the loudest control here, shown to the one
                  group with no use for it.

                  Go to Home is now the first child, which is why the
                  `:not(.lp-primary)` guard on the text-link hover rule in
                  landing-sections.css earns its keep: without it that rule
                  would turn this button's white label magenta on hover, on a
                  magenta fill.
                */
                <>
                  <Link href="/home" className="lp-primary lp-role-trigger">
                    Go to Home
                  </Link>
                  <SignOutButton className="lp-role-trigger lp-role-signin" />
                </>
              ) : (
                <>
                  <RoleMenu label="Sign In" tone="outline" doctorHref="/login?role=provider" patientHref="/login?role=patient" triggerClassName="lp-role-trigger lp-role-signin" />
                  <RoleMenu label="Sign Up" tone="solid" doctorHref="/signup?role=doctor" patientHref="/signup?role=patient" triggerClassName="lp-role-trigger lp-role-signup lp-primary" />
                </>
              )}
            </div>
          ) : (
            <div className="lp-account-area">
              <AccountArea />
            </div>
          )}
        </header>

        <main id="main-content">
          <div className="lp-hero-copy">
            <h1>
              Find the right doctor.
              <br />
              <span>On your schedule.</span>
            </h1>
            <p>
              Search, compare, and book <strong>Dentists</strong> near you.
            </p>
          </div>
          <form className="lp-search" onSubmit={submitSearch} role="search">
            <label className="lp-search-condition">
              <Icon name="search" />
              <span className="sr-only">
                Condition, doctor name or practice
              </span>
              <input
                ref={searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Condition, Doctor Name or Practice"
              />
            </label>
            <label className="lp-search-location">
              <Icon name="pin" />
              <span className="sr-only">City, state, or ZIP code</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, state, or ZIP code"
              />
            </label>
            <div className="lp-search-insurance">
              <Icon name="shield" />
              <span className="sr-only" id="lp-insurance-label">
                Insurance plan
              </span>
              <SelectMenu
                options={INSURANCE_CHOICES}
                value={insurance}
                onSelect={setInsurance}
                placeholder="Insurance plan (optional)"
                labelledBy="lp-insurance-label"
                className="lp-search-select"
                triggerClassName="lp-search-trigger"
              />
            </div>
            <button className="lp-primary" type="submit">
              Find Doctor
            </button>
          </form>
          <HeroHighlights />
        </main>
      </div>

      <div className="lp-content lp-container">
        {variant === "landing" && (
          <>
            <BookingShortcuts
              onDiscover={discover}
              onInsurance={() => setModal({ kind: "insurance" })}
            />
            <TrendingNow onDiscover={discover} />
          </>
        )}
        <section
          className="lp-section lp-insurance-section"
          id="insurance"
          aria-labelledby="insurance-heading"
        >
          <div className="lp-section-heading">
            <h2 id="insurance-heading">Insurance Plans</h2>
            <button
              className="lp-text-link"
              onClick={() => setModal({ kind: "insurance" })}
            >
              View all insurance plans
              <Icon name="arrow" />
            </button>
          </div>
          <div className="lp-insurance-grid">
            {insuranceNames.map((insurer, index) => (
              <button
                key={insurer}
                className="lp-insurance-card"
                aria-label={"View " + insurer + " insurance plan"}
                onClick={() => setModal({ kind: "insurance", index })}
              >
                <DesignImage
                  src={"/images/landing/insurance/" + insuranceLogoFiles[index] + ".png"}
                  alt=""
                  width={220}
                  height={90}
                  className="lp-insurance-logo"
                  fallback={<InsuranceLogo index={index} />}
                />
              </button>
            ))}
          </div>
        </section>

        {variant === "home" && (
          <section
            className="lp-section lp-appointments-section"
            id="appointments"
            aria-label="Upcoming appointments"
          >
            <SectionHeading
              title="Upcoming Appointments"
              action="View All Appointments"
              onClick={() => setModal({ kind: "appointments" })}
            />
            <div className="lp-carousel-wrap">
              <button
                className="lp-carousel-arrow lp-arrow-left"
                aria-label="Previous appointments"
                onClick={() => setAppointmentOffset((value) => (value + 3) % 4)}
              >
                <Icon name="chevron" />
              </button>
              <div className="lp-appointments-grid" aria-live="polite">
                {[0, 1].map((item) => (
                  <button
                    className="lp-appointment-card"
                    key={item}
                    onClick={() => setModal({ kind: "appointments" })}
                  >
                    <span className="lp-date-tile">
                      <span>AUG</span>
                      <strong>{24 + ((appointmentOffset + item) % 4)}</strong>
                      <small>{["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"][(appointmentOffset + item) % 4]}</small>
                    </span>
                    <span className="lp-appointment-details">
                      <span className="lp-appointment-time">10:30 AM</span>
                      <strong>Dr. Sarah Williams, MD</strong>
                      <span className="lp-appointment-type">
                        Primary Care<span>·</span>In-Person
                      </span>
                      <span className="lp-appointment-place">
                        <Icon name="pin" />
                        Care Medical Center<span>·</span>New York, NY
                      </span>
                    </span>
                    <span className="lp-duration">
                      <Icon name="clock" />
                      15min
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="lp-carousel-arrow lp-arrow-right"
                aria-label="Next appointments"
                onClick={() => setAppointmentOffset((value) => (value + 1) % 4)}
              >
                <Icon name="chevron" />
              </button>
            </div>
          </section>
        )}

        <section
          className="lp-section lp-providers-section"
          id="doctors"
          aria-label="Top rated doctors"
        >
          <SectionHeading
            title="Top Rated Doctors Near You"
            action="See All Doctors"
            onClick={() => discover("Doctors")}
          />
          <div className="lp-providers-grid">
            {[0, 1, 2].map((index) => (
              <ProviderCard
                key={index}
                index={index}
                dentist={false}
                onBook={(time) =>
                  setModal({ kind: "booking", time, dentist: false })
                }
              />
            ))}
          </div>
        </section>
        <section
          className="lp-section lp-providers-section"
          id="dentists"
          aria-label="Dentists"
        >
          <SectionHeading
            title="Find the Right Dentist for You"
            action="See All Dentist"
            onClick={() => discover("Dentists")}
          />
          <div className="lp-providers-grid">
            {[0, 1, 2].map((index) => (
              <ProviderCard
                key={index}
                index={index}
                dentist
                onBook={(time) =>
                  setModal({ kind: "booking", time, dentist: true })
                }
              />
            ))}
          </div>
        </section>

        <section
          className="lp-section lp-specialties-section"
          aria-labelledby="specialties-heading"
        >
          <h2 id="specialties-heading">Popular Specialties</h2>
          <div className="lp-specialties-grid">
            {(
              [
                {
                  icon: "consultation",
                  text: (
                    <>
                      Visual specialty
                      <br />
                      tiles.
                    </>
                  ),
                  specialty: "Primary Care",
                },
                {
                  icon: "cursor",
                  text: (
                    <>
                      Entire tile
                      <br />
                      clickable.
                    </>
                  ),
                  specialty: "All specialties",
                },
                {
                  icon: "doctor",
                  text: (
                    <>
                      Routes patients into
                      <br />
                      specialty discovery.
                    </>
                  ),
                  specialty: "Specialists",
                },
                {
                  icon: "eye",
                  text: (
                    <>
                      Eye Doctors included
                      <br />
                      for public vision-
                      <br />
                      care discovery.
                    </>
                  ),
                  specialty: "Eye Doctors",
                },
              ] as const
            ).map((tile) => (
              <button
                key={tile.specialty}
                aria-label={"Discover " + tile.specialty}
                onClick={() => discover(tile.specialty)}
              >
                <span className="lp-specialty-icon">
                  <Icon name={tile.icon} />
                </span>
                <strong>{variant === "home" ? tile.specialty : tile.text}</strong>
                {variant === "home" && <span className="ph-specialty-caption">{({ "Primary Care": "Your everyday health", "All specialties": "Find your kind of care", Specialists: "Expert care, made personal", "Eye Doctors": "A clearer view of health" } as Record<string, string>)[tile.specialty]}</span>}
              </button>
            ))}
          </div>
        </section>

        <section
          className="lp-section lp-talk-section"
          aria-labelledby="talk-heading"
        >
          <h2 id="talk-heading">Let’s Talk</h2>
          <div className="lp-carousel-wrap">
            <button
              className="lp-carousel-arrow lp-video-prev"
              aria-label="Previous provider videos"
              onClick={() => setVideoOffset((value) => (value + 3) % 4)}
            >
              <Icon name="chevron" />
            </button>
            <div className="lp-videos-grid">
              {[0, 1, 2, 3].map((item) => {
                const index = (item + videoOffset) % 4;
                return (
                  <button
                    className="lp-video-card"
                    key={item}
                    aria-label={"Meet Dr. Amanda Lee, video " + (index + 1)}
                    onClick={() => setModal({ kind: "video", index })}
                  >
                    <Image
                      src={"/images/landing/" + videoPortraits[index]}
                      alt={
                        [
                          "Female doctor outdoors",
                          "Experienced male doctor",
                          "Female doctor at a clinic",
                          "Smiling male doctor",
                        ][index] ?? "Doctor portrait"
                      }
                      fill
                      sizes="(max-width: 600px) 65vw, (max-width: 900px) 40vw, 280px"
                    />
                    <span className="lp-video-duration">0:48</span>
                    <span className="lp-play">
                      <Icon name="play" />
                    </span>
                    <span className="lp-video-caption">
                      <strong>Dr. Amanda Lee, DDS</strong>
                      <span>Cosmetic Dentistry</span>
                      <small>
                        <Icon name="star" />
                        4.9 (128)
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              className="lp-carousel-arrow lp-video-next"
              aria-label="Next provider videos"
              onClick={() => setVideoOffset((value) => (value + 1) % 4)}
            >
              <Icon name="chevron" />
            </button>
          </div>
        </section>

        {variant === "landing" && <FeaturedCare onDiscover={discover} />}
      </div>

      {variant === "landing" && (
        <>
          <BookingBenefits />
          <div className="lp-container lp-public-bottom">
            <BookingSteps
              onDiscover={discover}
              onInsurance={() => setModal({ kind: "insurance" })}
            />
          </div>
        </>
      )}

      <div className="ph-footer">
        <SiteFooter />
      </div>

      {modal && (
        <dialog
          className="lp-dialog"
          ref={dialog}
          onCancel={() => setModal(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
          aria-labelledby="lp-dialog-title"
        >
          <div className="lp-dialog-inner">
            <button
              className="lp-dialog-close"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <Icon name="close" />
            </button>
            {modal.kind === "insurance" && (
              <>
                <span className="lp-dialog-eyebrow">Find care that fits</span>
                <h2 id="lp-dialog-title">
                  {modal.index === undefined
                    ? "Insurance Plans"
                    : insuranceNames[modal.index]}
                </h2>
                <p>
                  Choose your insurance to personalize your search. Confirm your
                  specific plan’s coverage with the practice before your visit.
                </p>
                <div className="lp-dialog-insurers">
                  {insuranceNames.map((insurer, index) => (
                    <button
                      key={insurer}
                      onClick={() => {
                        setInsurance(insurer);
                        setModal(null);
                        searchInput.current?.focus();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <InsuranceLogo index={index} />
                      <span>
                        Search with this plan
                        <Icon name="arrow" />
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal.kind === "booking" && (
              <>
                <span className="lp-dialog-eyebrow">Appointment preview</span>
                <h2 id="lp-dialog-title">Your next step to better care</h2>
                <div className="lp-booking-preview">
                  <DoctorAvatar />
                  <div>
                    <strong>Dr. John J. MD</strong>
                    <p>
                      {modal.dentist ? "Dental care" : "Dermatology"} ·
                      Brooklyn, NY
                    </p>
                    <p>
                      <Icon name="clock" />
                      {modal.time} · In-person
                    </p>
                  </div>
                </div>
                <p>
                  This is a sample provider from the page preview. Live
                  availability and appointment booking are coming soon; no
                  appointment has been reserved.
                </p>
                <Link
                  className="lp-primary lp-dialog-cta"
                  href={user ? "/account" : "/signup?role=patient"}
                >
                  {user ? "Go to my account" : "Create your patient account"}
                </Link>
              </>
            )}
            {modal.kind === "appointments" && (
              <>
                <span className="lp-dialog-eyebrow">
                  Your care, in one place
                </span>
                <h2 id="lp-dialog-title">Upcoming Appointments</h2>
                <p>
                  The appointments shown here are examples. Your
                  personal appointment schedule will be available when booking
                  launches.
                </p>
                <Link
                  className="lp-primary lp-dialog-cta"
                  href={user ? "/account" : "/login?role=patient"}
                >
                  {user ? "View my account" : "Sign in to your account"}
                </Link>
              </>
            )}
            {modal.kind === "video" && (
              <>
                <span className="lp-dialog-eyebrow">Meet your provider</span>
                <h2 id="lp-dialog-title">Dr. Amanda Lee, DDS</h2>
                <div className="lp-video-preview">
                  <Image
                    src={"/images/landing/" + videoPortraits[modal.index]}
                    alt="Doctor portrait for the sample provider introduction"
                    width={600}
                    height={850}
                  />
                  <span>Provider introduction coming soon</span>
                </div>
                <p>Cosmetic Dentistry · 4.9 (128 reviews)</p>
                <p>
                  This sample profile previews the provider video experience. An
                  introduction video has not been added yet.
                </p>
              </>
            )}
            {modal.kind === "search" && (
              <>
                <span className="lp-dialog-eyebrow">
                  Explore care · Preview directory
                </span>
                <h2 id="lp-dialog-title">
                  {modal.query
                    ? "Search for " + modal.query
                    : "Find your next care provider"}
                </h2>
                <p>
                  {modal.location
                    ? "Near " + modal.location
                    : "Browse care near you"}
                  {modal.insurance && modal.insurance !== "not-sure"
                    ? " · " +
                      (modal.insurance === "self-pay"
                        ? "Self-pay"
                        : modal.insurance)
                    : ""}
                </p>
                <p>
                  Live provider search is coming soon. Explore the sample care
                  categories below.
                </p>
                <div className="lp-discovery-options">
                  {[
                    "Doctors",
                    "Dentists",
                    "Eye Doctors",
                    "Primary Care",
                    "Mental Health",
                  ]
                    .filter(
                      (specialty) =>
                        !modal.query ||
                        specialty
                          .toLowerCase()
                          .includes(modal.query.toLowerCase()) ||
                        ![
                          "doctors",
                          "dentists",
                          "eye doctors",
                          "primary care",
                          "mental health",
                        ].includes(modal.query.toLowerCase()),
                    )
                    .map((specialty) => (
                      <button
                        key={specialty}
                        onClick={() => {
                          setModal(null);
                          navigate(
                            specialty === "Dentists" ? "dentist" : "doctor",
                          );
                        }}
                      >
                        <Icon
                          name={
                            specialty === "Dentists"
                              ? "tooth"
                              : specialty === "Eye Doctors"
                                ? "eye"
                                : "stethoscope"
                          }
                        />
                        {specialty}
                        <Icon name="arrow" />
                      </button>
                    ))}
                </div>
              </>
            )}
            {modal.kind === "info" && (
              <>
                <span className="lp-dialog-eyebrow">CareOndeck</span>
                <h2 id="lp-dialog-title">{modal.title}</h2>
                <p>{modal.body}</p>
                {modal.title !== "Notifications" && (
                  <Link className="lp-primary lp-dialog-cta" href="/signup">
                    Get started
                  </Link>
                )}
              </>
            )}
          </div>
        </dialog>
      )}
    </div>
  );
}
