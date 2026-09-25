'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

import { CheckIcon, ChevronDown } from './icons';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * The dropdown list, drawn by us rather than by the operating system.
 *
 * A native `<select>` cannot be styled once it is open: the popup belongs to
 * the OS, which is why it arrives as a grey box with a blue highlight in the
 * middle of a pink form. This is the standard listbox pattern instead --
 * a button that opens a list of options -- so it can look like the rest of
 * the app.
 *
 * What the OS gave us for free and is rebuilt here: keyboard opening and
 * moving, Home/End, type-ahead, Escape to cancel, closing on an outside
 * click, and announcing the whole thing to a screen reader as one control.
 */
export function SelectMenu({
  options,
  value,
  onSelect,
  placeholder,
  disabled = false,
  invalid = false,
  labelledBy,
  describedBy,
  className = '',
  triggerClassName = '',
  align = 'stretch',
}: {
  options: SelectOption[];
  value: string;
  onSelect: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  triggerClassName?: string;
  /** `stretch` matches the field width; `end` hangs a compact menu off the right. */
  align?: 'stretch' | 'end';
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const selected = options.findIndex((option) => option.value === value);
  const chosen = selected >= 0 ? options[selected] : null;

  // A click anywhere else is a cancel, and so is scrolling the page away.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Open upwards when the list would otherwise run off the bottom of the window.
  useLayoutEffect(() => {
    if (!open || !root.current) return;

    const box = root.current.getBoundingClientRect();
    const wanted = Math.min(options.length * 40 + 8, 240);
    setDropUp(box.bottom + wanted > window.innerHeight && box.top > wanted);
  }, [open, options.length]);

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openAt(index: number) {
    setActive(clampToEnabled(options, index, 1));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onSelect(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openAt(selected >= 0 ? selected : 0);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActive(clampToEnabled(options, active + 1, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive(clampToEnabled(options, active - 1, -1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(clampToEnabled(options, 0, 1));
        break;
      case 'End':
        event.preventDefault();
        setActive(clampToEnabled(options, options.length - 1, -1));
        break;
      default:
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          const now = Date.now();
          typed.current = {
            text: now - typed.current.at < 800 ? typed.current.text + event.key : event.key,
            at: now,
          };
          const found = options.findIndex(
            (option) =>
              !option.disabled && option.label.toLowerCase().startsWith(typed.current.text.toLowerCase()),
          );
          if (found >= 0) setActive(found);
        }
    }
  }

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openAt(selected >= 0 ? selected : 0))}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center gap-2 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60 ${triggerClassName}`}
      >
        <span className={`min-w-0 flex-1 truncate ${chosen ? 'text-ink-900' : 'text-ink-300'}`}>
          {chosen?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          className={[
            'absolute z-30 max-h-60 overflow-y-auto rounded-card border border-line bg-white p-1 shadow-lg shadow-ink-900/5',
            dropUp ? 'bottom-full mb-1' : 'top-full mt-1',
            align === 'end' ? 'right-0 min-w-[12rem]' : 'left-0 w-full min-w-[10rem]',
          ].join(' ')}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={index === active}
                  disabled={option.disabled}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                  className={[
                    'flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm transition-colors',
                    option.disabled
                      ? 'cursor-not-allowed text-ink-300'
                      : index === active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-ink-700',
                    isSelected ? 'font-semibold text-brand-700' : '',
                  ].join(' ')}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected ? <CheckIcon className="h-4 w-4 shrink-0 text-brand-600" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** The next selectable row in `step` direction, wrapping at both ends. */
function clampToEnabled(options: SelectOption[], from: number, step: 1 | -1): number {
  if (options.length === 0) return 0;

  let index = (from + options.length) % options.length;
  for (let tries = 0; tries < options.length; tries += 1) {
    if (!options[index]?.disabled) return index;
    index = (index + step + options.length) % options.length;
  }

  return from;
}
