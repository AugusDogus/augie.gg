"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus --
   An ARIA combobox: the search field keeps focus and handles every key, and rows are aria-activedescendant options. */

import {
  ArrowUpRightIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  GitMergeIcon,
  GithubLogoIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toggleAnimation, usePlaying } from "~/components/flight-background";
import { STATUS_LABEL, StatusIcon, statusOf } from "~/components/status-icon";
import { openProject } from "~/lib/peek";
import { yearOf } from "~/lib/projects";
import { EMAIL, GITHUB_URL } from "~/lib/site";
import { cn } from "~/lib/utils";
import {
  searchGroups,
  type ActionId,
  type Entry,
  type ProjectEntry,
} from "./entries";
import { useApple, withModifier } from "./platform";
import { closeMenu, handOffMenu } from "./store";

const ACTIONS: readonly ActionId[] = [
  "copy-email",
  "resume",
  "github",
  "animation",
];
const KEYWORDS: Readonly<Record<ActionId, readonly string[]>> = {
  "copy-email": ["email", "mail", "contact", EMAIL],
  resume: ["resume", "cv", "experience"],
  github: ["github", "code", "profile", "repositories"],
  animation: ["animation", "pause", "play", "motion", "painting", "flight"],
};

type Copy = "idle" | "copied" | "failed";
/** The highlighted row; null means the first enabled one. Only keyboard moves scroll it into view. */
type Selection = { key: string; via: "keyboard" | "pointer" } | null;

const COARSE = "(pointer: coarse)";
function subscribeCoarse(listener: () => void) {
  const media = matchMedia(COARSE);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function openTab(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
  closeMenu();
}

/** What Enter does to the highlighted row, for the footer hint. */
function enterVerb(entry: Entry, newTab: boolean, playing: boolean): string {
  if (entry.kind === "project") return newTab ? "Open in new tab" : "Open";
  switch (entry.key) {
    case "copy-email":
      return "Copy";
    case "animation":
      return playing ? "Pause" : "Play";
    case "resume":
      return "Open";
    case "github":
      return "Open in new tab";
    default: {
      const unreachable: never = entry;
      return unreachable;
    }
  }
}

/** The link a row opens in a new tab, or undefined when it opens the peek instead. */
function linkFor(entry: ProjectEntry, alternate: boolean): string | undefined {
  switch (entry.group) {
    case "work":
    case "archive":
      return alternate ? entry.project.href : undefined;
    case "oss":
      return entry.project.href;
    default: {
      const unreachable: never = entry.group;
      return unreachable;
    }
  }
}

export function CommandPanel() {
  const router = useRouter();
  const apple = useApple();
  const { playing, reduced } = usePlaying();
  // Touch adds a Cancel button, which leaves phones room for only a short placeholder.
  const coarse = useSyncExternalStore(
    subscribeCoarse,
    () => matchMedia(COARSE).matches,
    () => false,
  );
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(null);
  const [copy, setCopy] = useState<Copy>("idle");
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  const optionId = (key: string) => `${id}-${key}`;
  useEffect(
    () => () => {
      if (closing.current) clearTimeout(closing.current);
    },
    [],
  );

  const animationLabel = reduced
    ? "Animation off (reduced motion)"
    : playing
      ? "Pause animation"
      : "Play animation";
  const labels: Readonly<Record<ActionId, string>> = {
    "copy-email": "Copy email",
    resume: "Open résumé",
    github: "Open GitHub",
    animation: animationLabel,
  };
  const actions: Entry[] = ACTIONS.map((key) => ({
    kind: "action",
    key,
    search: { title: labels[key], keywords: KEYWORDS[key], blurb: "" },
  }));
  const disabled = (entry: Entry) =>
    entry.kind === "action" && entry.key === "animation" && reduced;

  const groups = searchGroups(query, actions);
  const enabled = groups.flatMap((group) =>
    group.entries.filter((entry) => !disabled(entry)),
  );
  const active =
    enabled.find((entry) => entry.key === selection?.key) ?? enabled[0];
  const activeKey = active?.key;

  useEffect(() => {
    if (selection?.via !== "keyboard" || activeKey === undefined) return;
    const option = document.getElementById(`${id}-${activeKey}`);
    const previous = option?.previousElementSibling;
    // The first row of a group brings its heading along.
    if (previous instanceof HTMLElement && previous.dataset.heading)
      previous.scrollIntoView({ block: "nearest" });
    option?.scrollIntoView({ block: "nearest" });
  }, [selection, activeKey, id]);

  async function copyEmail() {
    if (closing.current) clearTimeout(closing.current);
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      setCopy("failed");
      return;
    }
    setCopy("copied");
    closing.current = setTimeout(closeMenu, 600);
  }

  function runAction(key: ActionId) {
    switch (key) {
      case "copy-email":
        void copyEmail();
        break;
      case "resume":
        closeMenu();
        router.push("/resume");
        break;
      case "github":
        openTab(GITHUB_URL);
        break;
      case "animation":
        toggleAnimation();
        closeMenu();
        break;
      default: {
        const unreachable: never = key;
        throw new Error(
          `The command menu has no handler for the "${String(unreachable)}" action.`,
        );
      }
    }
  }

  function run(entry: Entry, alternate: boolean) {
    if (disabled(entry)) return;
    if (entry.kind === "action") {
      runAction(entry.key);
      return;
    }
    const href = linkFor(entry, alternate);
    if (href) {
      openTab(href);
      return;
    }
    handOffMenu();
    openProject(entry.project.title);
  }

  function move(delta: number) {
    if (enabled.length === 0) return;
    const index = active ? enabled.indexOf(active) : -1;
    const next = enabled.at((index + delta) % enabled.length);
    if (next) setSelection({ key: next.key, via: "keyboard" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
      case "End": {
        event.preventDefault();
        const edge = event.key === "Home" ? enabled.at(0) : enabled.at(-1);
        if (edge) setSelection({ key: edge.key, via: "keyboard" });
        return;
      }
      case "Enter":
        event.preventDefault();
        if (active) run(active, withModifier(event));
        return;
    }
  }

  const searching = query.trim() !== "";
  const count = groups.reduce((sum, group) => sum + group.entries.length, 0);
  const newTab =
    active?.kind === "action"
      ? active.key === "github"
      : active !== undefined && linkFor(active, false) !== undefined;
  const alternate =
    active?.kind === "project" &&
    !newTab &&
    linkFor(active, true) !== undefined;

  return (
    <>
      <div className="border-line flex h-[52px] shrink-0 items-center gap-3 border-b pr-2 pl-4 pointer-coarse:h-14">
        <MagnifyingGlassIcon
          className="text-fg-3 size-[18px] shrink-0"
          aria-hidden="true"
        />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls={`${id}-list`}
          aria-activedescendant={
            activeKey === undefined ? undefined : optionId(activeKey)
          }
          aria-autocomplete="list"
          aria-label="Search projects and actions"
          placeholder={coarse ? "Search" : "Search projects and actions"}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="go"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelection(null);
            list.current?.scrollTo({ top: 0 });
          }}
          onKeyDown={onKeyDown}
          className="text-fg placeholder:text-fg-2 h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none pointer-coarse:text-base"
        />
        <button
          type="button"
          onClick={closeMenu}
          className="text-fg-2 hidden h-11 shrink-0 items-center rounded-lg px-2.5 text-[15px] active:bg-white/[.08] pointer-coarse:flex"
        >
          Cancel
        </button>
      </div>
      <div
        ref={list}
        className={cn(
          "min-h-0 flex-1 scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 [scrollbar-width:none]",
          count === 0 && "content-center",
        )}
      >
        <div role="listbox" id={`${id}-list`} aria-label="Results">
          {groups.map((group) => (
            <div
              key={group.id}
              role="group"
              aria-labelledby={`${id}-${group.id}-heading`}
            >
              <div
                id={`${id}-${group.id}-heading`}
                aria-hidden="true"
                data-heading="true"
                className="text-fg-2 px-2.5 pt-2.5 pb-1.5 text-xs font-medium"
              >
                {group.heading}
              </div>
              {group.entries.map((entry) => (
                <Option
                  key={entry.key}
                  id={optionId(entry.key)}
                  selected={entry.key === activeKey}
                  disabled={disabled(entry)}
                  onHover={() =>
                    setSelection({ key: entry.key, via: "pointer" })
                  }
                  onRun={(withAlternate) => run(entry, withAlternate)}
                >
                  {entry.kind === "action" ? (
                    <ActionRow
                      id={entry.key}
                      label={labels[entry.key]}
                      playing={playing}
                      copy={copy}
                    />
                  ) : (
                    <ProjectRow entry={entry} />
                  )}
                </Option>
              ))}
            </div>
          ))}
        </div>
        {count === 0 && (
          <p className="text-fg-2 px-6 py-10 text-center text-sm text-balance break-words">
            No results for <span className="text-fg">“{query.trim()}”</span>
          </p>
        )}
      </div>
      <div
        aria-hidden="true"
        className="border-line text-fg-2 flex h-10 shrink-0 items-center gap-4 border-t px-4 text-xs pointer-coarse:hidden"
      >
        {count > 0 && <Hint keys={["↑", "↓"]}>Navigate</Hint>}
        {active && (
          <Hint keys={["↵"]}>{enterVerb(active, newTab, playing)}</Hint>
        )}
        <Hint keys={["Esc"]}>Close</Hint>
        {alternate && (
          <span className="ml-auto">
            <Hint keys={[apple === false ? "Ctrl" : "⌘", "↵"]}>
              Open in new tab
            </Hint>
          </span>
        )}
      </div>
      <output className="sr-only">
        {copy === "copied"
          ? "Email address copied"
          : copy === "failed"
            ? `Couldn’t copy the email address. It is ${EMAIL}.`
            : searching
              ? count === 0
                ? `No results for “${query.trim()}”`
                : `${count} ${count === 1 ? "result" : "results"}`
              : ""}
      </output>
    </>
  );
}

const inSelectable = (target: EventTarget) =>
  target instanceof Element && target.closest("[data-selectable]") !== null;

function Option({
  id,
  selected,
  disabled,
  onHover,
  onRun,
  children,
}: {
  id: string;
  selected: boolean;
  disabled: boolean;
  onHover: () => void;
  onRun: (alternate: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      // Keep focus in the search field, unless the press selects text the row offers.
      onMouseDown={(event) => {
        if (!inSelectable(event.target)) event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "touch" && !selected && !disabled) onHover();
      }}
      onClick={(event) => {
        if (!inSelectable(event.target)) onRun(withModifier(event));
      }}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-sm select-none pointer-coarse:min-h-11",
        selected && "bg-white/[.08]",
        disabled
          ? "text-fg-3 [&_svg]:text-fg-3 cursor-default"
          : "cursor-pointer",
      )}
    >
      {children}
    </div>
  );
}

function ActionRow({
  id,
  label,
  playing,
  copy,
}: {
  id: ActionId;
  label: string;
  playing: boolean;
  copy: Copy;
}) {
  const icon = "text-fg-2 size-4 shrink-0";
  switch (id) {
    case "copy-email":
      return (
        <>
          <CopyIcon className={icon} aria-hidden="true" />
          {/* A failure note on a phone goes under the label instead of squeezing it. */}
          <span
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3",
              copy === "failed" &&
                "max-sm:flex-col max-sm:items-start max-sm:gap-0.5 max-sm:py-2",
            )}
          >
            <span className="text-fg max-w-full min-w-0 flex-1 truncate">
              {label}
            </span>
            {copy === "copied" ? (
              <span className="text-fg-2 flex items-center gap-1.5 text-xs">
                <CheckIcon className="text-live size-3.5" aria-hidden="true" />
                Copied
              </span>
            ) : copy === "failed" ? (
              <span className="text-progress text-xs">
                Couldn’t copy{" "}
                <span data-selectable className="cursor-text select-all">
                  {EMAIL}
                </span>
              </span>
            ) : (
              <span className="text-fg-2 text-xs">{EMAIL}</span>
            )}
          </span>
        </>
      );
    case "resume":
      return (
        <>
          <FileTextIcon className={icon} aria-hidden="true" />
          <span className="text-fg flex-1 truncate">{label}</span>
        </>
      );
    case "github":
      return (
        <>
          <GithubLogoIcon className={icon} aria-hidden="true" />
          <span className="text-fg flex-1 truncate">{label}</span>
          <ArrowUpRightIcon className="text-fg-3 size-3.5" aria-hidden="true" />
        </>
      );
    case "animation":
      return (
        <>
          {playing ? (
            <PauseIcon className={icon} aria-hidden="true" />
          ) : (
            <PlayIcon className={icon} aria-hidden="true" />
          )}
          <span className="flex-1 truncate">{label}</span>
        </>
      );
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}

function ProjectRow({ entry }: { entry: ProjectEntry }) {
  const status = statusOf(entry.project.labels);
  return (
    <>
      <span className="flex size-4 shrink-0 items-center justify-center">
        {status ? (
          <StatusIcon status={status} />
        ) : entry.group === "oss" ? (
          <GitMergeIcon className="text-fg-3 size-4" aria-hidden="true" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 items-baseline gap-2.5 max-sm:flex-col max-sm:gap-0.5 max-sm:py-2">
        <span className="text-fg max-w-full shrink-0 truncate sm:max-w-[48%]">
          {entry.project.title}
        </span>
        {status && <span className="sr-only">{STATUS_LABEL[status]}</span>}
        <span className="text-fg-2 max-w-full min-w-0 truncate text-[13px]">
          {entry.blurb}
        </span>
      </span>
      <span className="text-fg-2 shrink-0 text-xs tabular-nums">
        {yearOf(entry.project)}
      </span>
      {/* Always reserved, so years line up across groups. */}
      <span className="flex size-3.5 shrink-0">
        {linkFor(entry, false) !== undefined && (
          <ArrowUpRightIcon className="text-fg-3 size-3.5" aria-hidden="true" />
        )}
      </span>
    </>
  );
}

function Hint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-1">
        {keys.map((key) => (
          <kbd key={key} className="kbd">
            {key}
          </kbd>
        ))}
      </span>
      {children}
    </span>
  );
}
