/**
 * Every project and contribution on the home page. This file is the only
 * place to edit; see the README for a walkthrough.
 *
 * - Keep entries newest first. `date` is the first authored commit, not
 *   GitHub metadata; display order is derived from it and ties keep file order.
 * - `blurb` is one sentence and supports inline links: `[text](https://...)`.
 * - Leave `href` off for private repos and pre-GitHub work; set `private` to
 *   show a private repository note; name upstream forks in the blurb.
 * - `featured: n` puts a project at position n of "Selected work". Give it a
 *   `highlight`: one line of verifiable evidence (stack, hard problem, scale).
 *   No invented numbers; round live counts down so they age gracefully.
 * - `notable: n` names a merged upstream contribution at position n of the
 *   OSS line.
 * - Non-featured projects appear in Everything else, grouped by year.
 * - `media` lists captures of the project, served from `public/work/<slug>/`.
 *   Anything personal in them is made up; only use captures checked for
 *   personal data. Give each its pixel `width` and `height` (the frame
 *   reserves that shape before it loads), factual `alt` text, and a `frame`:
 *   `desktop` for anything shown as a screen (a browser, a desktop app),
 *   `phone`, or `tv` for console output on a television. The project view
 *   shows the first desktop capture with the first phone capture set in front
 *   of it at the lower right and the first TV capture at the lower left; the
 *   rest are not shown. Images and videos share one frame. Mark pixel art and
 *   console output `pixelated: true` (export it scaled 2x nearest neighbor) so
 *   it stays sharp. A video is a short silent loop: `src` is an H.264 MP4 and
 *   `poster` a representative frame, shown before it plays and whenever it
 *   can't.
 */

export type Label =
  /** In progress. */
  | "wip"
  /** Maintained and in use. */
  | "active"
  | "archived"
  /** Merged or adopted upstream contribution to someone else's repo. */
  | "oss"
  /** Upstream PR still in review. */
  | "pending";

/** What a capture is shown in: a screen, a phone, or a television. */
export type MediaFrame = "desktop" | "phone" | "tv";

export type Media =
  | {
      kind: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
      frame: MediaFrame;
      /** Pixel art, such as console output: scaled nearest neighbor, never smoothed. */
      pixelated?: true;
    }
  | {
      kind: "video";
      /** H.264 MP4: every browser plays it. */
      src: string;
      poster: string;
      alt: string;
      width: number;
      height: number;
      frame: MediaFrame;
    };

export interface Project {
  title: string;
  href?: string;
  /** First authored commit, `YYYY-MM-DD`. */
  date: string;
  blurb: string;
  labels?: Label[];
  /** Private repo; rendered with a private repository note. */
  private?: boolean;
  /** Fork of another repo; the blurb names upstream. */
  fork?: boolean;
  /** Position in "Selected work", starting at 1. */
  featured?: number;
  /** Evidence line shown under a featured project. */
  highlight?: string;
  /** Position in the OSS line under "Selected work", starting at 1. */
  notable?: number;
  /** Short label for the contribution footer. */
  contributionName?: string;
  /** Captures, lead first; see the note at the top. */
  media?: Media[];
}

export const projects: Project[] = [
  // 2026
  {
    title: "siri-remote-bridge",
    date: "2026-10-09",
    blurb:
      "A Linux bridge for a USB-C Siri Remote with Apple TV navigation, native IR, and experimental Siri voice forwarding.",
    labels: ["wip"],
    private: true,
    media: [
      {
        kind: "video",
        src: "/work/siri-remote-bridge/desktop.mp4",
        poster: "/work/siri-remote-bridge/desktop-poster.webp",
        alt: "A terminal runs the siri-protocol crate's 12 unit tests, which pass, then runs the crate's protocol smoke tests on an emulated ESP32-C3, which pass all four groups.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "cubefarm",
    href: "https://cubefarm.vercel.app",
    date: "2026-10-04",
    blurb:
      "An incremental office game where employees, workflows, and company choices grow a corporation.",
    media: [
      {
        kind: "video",
        src: "/work/cubefarm/desktop.mp4",
        poster: "/work/cubefarm/desktop-poster.webp",
        alt: "In the Cube Farm office game, the player hires two employees as the isometric office grows from three cubicles to five, buys an office equipment upgrade, and scrolls back up to stats showing 5 employees and lower funds.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/cubefarm/phone.mp4",
        poster: "/work/cubefarm/phone-poster.webp",
        alt: "On a phone, the player taps Hire employee twice, the cube farm grows from three cubicles to five, and then the player taps the office equipment upgrade.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "contacts",
    href: "https://contacts.exchange",
    date: "2026-10-03",
    blurb:
      "An address book where invitees fill in their own details for Google Contacts or vCard export.",
    media: [
      {
        kind: "video",
        src: "/work/contacts/desktop.mp4",
        poster: "/work/contacts/desktop-poster.webp",
        alt: "In the Contacts Exchange address book, a search for 'pri' filters the list to Priya Nair, her contact card opens with email, phone, address and a vCard export button, and the search is then cleared.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/contacts/phone.mp4",
        poster: "/work/contacts/phone-poster.webp",
        alt: "On a phone, an invitee fills in their first name, last name, email and phone number on the 'Share your details with Mira' form, and the phone number formats itself while being typed.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "mixpsi",
    href: "https://mixpsi.vercel.app",
    date: "2026-09-28",
    blurb:
      "A nitrox blending calculator for planning scuba gas mixes by partial pressure and final pressure.",
    media: [
      {
        kind: "video",
        src: "/work/mixpsi/desktop.mp4",
        poster: "/work/mixpsi/desktop-poster.webp",
        alt: "The current pressure field is changed from 500 to 700 PSI and the 32% target is clicked, and the fill plan updates to stops at 700, 2,911 and 3,000 PSI.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/mixpsi/phone.mp4",
        poster: "/work/mixpsi/phone-poster.webp",
        alt: "On a phone, 700 PSI is entered as the current pressure and 32% is tapped, then the page scrolls down to the fill plan with its three pressure checkpoints and back up.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "root",
    href: "https://github.com/AugusDogus/root",
    date: "2026-09-26",
    blurb:
      "An experimental Root launcher and mod for private six-player games with Steam friends on Windows and Linux.",
    media: [
      {
        kind: "video",
        src: "/work/root/desktop.mp4",
        poster: "/work/root/desktop-poster.webp",
        alt: "The Root Six Player startup window, set over Root's forest artwork, steps through its setup messages from checking for updates to opening Root.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "Valheim mods",
    href: "https://thunderstore.io/c/valheim/p/AugusDogus/",
    date: "2026-09-11",
    blurb:
      "Seven Valheim client and server mods, including [Buildheim](https://github.com/AugusDogus/Buildheim), [ComfortView](https://github.com/AugusDogus/ComfortView), and [Soundheim](https://github.com/AugusDogus/Soundheim).",
    labels: ["active"],
    media: [
      {
        kind: "image",
        src: "/work/valheim-mods/desktop.webp",
        alt: "A Valheim character stands before carved runestones in a Meadows forest while a top-left notification reads 1 of 3 players asleep and lists Bob and Charlie as not sleeping.",
        width: 1920,
        height: 1080,
        frame: "desktop",
      },
    ],
  },
  {
    title: "DashSplit",
    href: "https://dashsplit.vercel.app",
    date: "2026-08-30",
    blurb:
      "A fully static bill splitter for DoorDash and Uber Eats receipts, with in-browser OCR and share links that carry the order.",
    media: [
      {
        kind: "video",
        src: "/work/dashsplit/desktop.mp4",
        poster: "/work/dashsplit/desktop-poster.webp",
        alt: "A DashSplit order page for a Thai restaurant where Pad Thai is split two ways, one of two spring rolls and the chicken satay are picked, and the bottom bar updates to Pay $37.25 with Venmo.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/dashsplit/phone.mp4",
        poster: "/work/dashsplit/phone-poster.webp",
        alt: "On a phone, Pad Thai, spring rolls and chicken satay are tapped on a DashSplit order, each row expands with its share, and the bottom bar shows Pay $58.33 with Venmo.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "teams-rs",
    date: "2026-08-26",
    blurb: "A native Linux Microsoft Teams client, written in Rust.",
    labels: ["wip"],
    private: true,
    featured: 5,
    highlight:
      "Built on GPUI, the GPU-accelerated UI framework behind the Zed editor",
    media: [
      {
        kind: "video",
        src: "/work/teams-rs/app.mp4",
        poster: "/work/teams-rs/app-poster.webp",
        alt: "teams-rs with made-up demo data: reacting and typing in a chat, the Ctrl+K palette jumping between chats, a calendar week with an event flyout, and a six-person call.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "pomodoro",
    href: "https://github.com/AugusDogus/pomodoro",
    date: "2026-08-23",
    blurb:
      "A calm, offline-first to-do list and Pomodoro timer built with Astro, React, Convex, and Automerge.",
    media: [
      {
        kind: "video",
        src: "/work/pomodoro/desktop.mp4",
        poster: "/work/pomodoro/desktop-poster.webp",
        alt: "A task called Make flashcards is typed into the task list, selected as the focus task, and the 25 minute focus timer is started and counts down.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/pomodoro/phone.webp",
        alt: "The mobile timer view shows a focus session running at 24:57 for the task Outline the lab report, with Timer, Tasks and Log tabs at the bottom.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "marketplace",
    href: "https://github.com/AugusDogus/marketplace",
    date: "2026-08-23",
    blurb:
      "A focused Expo Android client for browsing Facebook Marketplace, with local saves and saved-search notifications.",
    media: [
      {
        kind: "video",
        src: "/work/marketplace/phone.mp4",
        poster: "/work/marketplace/phone-poster.webp",
        alt: "A Marketplace feed of made-up listings scrolls, a side table is bookmarked, and the Filters sheet is set to 40 mi and Home & garden to show six listings.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "grand-buffet",
    href: "https://grandbuffet.vercel.app",
    date: "2026-08-20",
    blurb: "A fast Astro website for Grand Buffet in Pace, Florida.",
    media: [
      {
        kind: "video",
        src: "/work/grand-buffet/desktop.mp4",
        poster: "/work/grand-buffet/desktop-poster.webp",
        alt: "The Grand Buffet homepage scrolls from the hero with a buffet food photo down to the lunch, dinner and Sunday buffet prices and the takeout menu band, then back to the top.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/grand-buffet/phone.mp4",
        poster: "/work/grand-buffet/phone-poster.webp",
        alt: "On a phone, the Grand Buffet takeout menu scrolls past the dinner special to the category list, where Appetizers is tapped open to show its items and prices, then the page returns to the top.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "fairth",
    href: "https://github.com/AugusDogus/fairth",
    date: "2026-08-19",
    blurb:
      "A self-hosted Google Photos backup bridge that sends media from an Expo companion to a private containerized Android appliance.",
    media: [
      {
        kind: "image",
        src: "/work/fairth/desktop.webp",
        alt: "The Fairth owner web app's Authorized devices page lists two Fairth Companion phone sessions with Revoke buttons and the current browser session.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/fairth/phone.mp4",
        poster: "/work/fairth/phone-poster.webp",
        alt: "In the Fairth companion app, tapping Start backing up opens the home screen, which counts down from 18 items left to Backed up while Google Photos changes from Preparing to Backup on.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "pingdotgg/t3code",
    href: "https://github.com/pingdotgg/t3code/pull/7421",
    date: "2026-08-18",
    blurb:
      "Fixed missing GNOME and KDE launcher icons in the in-repo AUR packages by installing the AppImage’s hicolor icon set.",
    labels: ["oss"],
    notable: 1,
    contributionName: "T3 Code",
    media: [
      {
        kind: "video",
        src: "/work/t3code-icons/desktop.mp4",
        poster: "/work/t3code-icons/desktop-poster.webp",
        alt: "The merged pull request's Files changed tab on GitHub scrolls down from the title and Merged badge to the PKGBUILD change that installs the AppImage's hicolor icons at every size, then scrolls back to the top.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "Little Age",
    date: "2026-08-15",
    blurb:
      "A cozy, combat-free hamlet builder: gather resources, build, and watch villagers potter about.",
    private: true,
    media: [
      {
        kind: "video",
        src: "/work/little-age/desktop.mp4",
        poster: "/work/little-age/desktop-poster.webp",
        alt: "Three villagers carry logs to a blue stone keep in a grassy meadow, then a cottage is placed from the build bar and the villagers hammer it up until the population count rises from 3/5 to 3/9.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "cursor-acp-auth-shim",
    href: "https://github.com/AugusDogus/cursor-acp-auth-shim",
    date: "2026-07-31",
    blurb:
      "A compatibility shim that lets T3 Code authenticate Cursor Agent with CURSOR_API_KEY, working around the null userEmail that API-key auth reports. Implemented in Rust, C, Go, and Bun, with benchmarks.",
    labels: ["active"],
    media: [
      {
        kind: "video",
        src: "/work/cursor-acp-auth-shim/desktop.mp4",
        poster: "/work/cursor-acp-auth-shim/desktop-poster.webp",
        alt: "A terminal runs the shim's test suite, which passes for the C, Rust, Go and Bun builds, then runs a benchmark that prints a table comparing each build's size, startup latency and memory use against the mock Cursor agent.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "t3code-nightly-docker",
    href: "https://github.com/AugusDogus/t3code-nightly-docker",
    date: "2026-07-24",
    blurb:
      "Publishes smoke-tested Docker images of each T3 Code nightly, built for long-running hosting on an Unraid server.",
    media: [
      {
        kind: "video",
        src: "/work/t3code-nightly-docker/desktop.mp4",
        poster: "/work/t3code-nightly-docker/desktop-poster.webp",
        alt: "T3 Code's web interface, served from the Docker container, opens its terminal drawer and prints the bundled Codex, Claude Code and OpenCode versions.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "Goodix fingerprint reader driver",
    date: "2026-07-13",
    blurb: "Reverse engineering the protocol to get it working on Linux.",
    labels: ["wip"],
    private: true,
    media: [
      {
        kind: "video",
        src: "/work/goodix-driver/desktop.mp4",
        poster: "/work/goodix-driver/desktop-poster.webp",
        alt: "A terminal runs the project's replay tool on a captured USB trace, and it decodes each frame of the reader's TLS handshake, config upload and encrypted image transfer, ending with 22 logical frames and 0 validation failures.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "kenwood-rj45-usb-ptt",
    href: "https://github.com/AugusDogus/kenwood-rj45-usb-ptt",
    date: "2026-06-26",
    blurb:
      "A PCB and planned RP2040 firmware that turns a Kenwood-style handheld microphone into USB audio plus an F13 push-to-talk key.",
    labels: ["wip"],
    media: [
      {
        kind: "image",
        src: "/work/kenwood-rj45-usb-ptt/desktop.webp",
        alt: "A 3D render of the bare green Rev A circuit board, tilted slightly, with gold pads for the RJ45 mic jack on the left, the XIAO RP2040 module pads on the right, and the silkscreen label radio-mic-usb-ptt RevA.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },
  {
    title: "gnome-dock",
    href: "https://github.com/AugusDogus/gnome-dock",
    date: "2026-05-30",
    blurb:
      "A floating bottom dock for GNOME Shell with frosted squircle visuals.",
    media: [
      {
        kind: "video",
        src: "/work/gnome-dock/desktop.mp4",
        poster: "/work/gnome-dock/desktop-poster.webp",
        alt: "The pointer hovers the Weather and Clocks icons on a floating frosted-glass dock, opens the Text Editor window previews, and drags the first thumbnail past the second to swap their order.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "eml.md",
    href: "https://github.com/AugusDogus/eml.md",
    date: "2026-05-15",
    blurb: "Private, local conversion of .eml email files to Markdown.",
    media: [
      {
        kind: "video",
        src: "/work/eml-md/desktop.mp4",
        poster: "/work/eml-md/desktop-poster.webp",
        alt: "A sample email file is chosen in the eml to md drop zone, its Markdown appears in the output panel, Copy is clicked, and the panel scrolls to a receipt table and tracking link.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/eml-md/phone.webp",
        alt: "The eml to md page on a phone shows a converted sample email, with its file name under the drop zone and the Markdown output listing the subject, sender, recipient and one attached file.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "maria-rcks/t3code-aur",
    href: "https://github.com/maria-rcks/t3code-aur/pull/9",
    date: "2026-05-03",
    blurb: "Fixed the nightly launcher icon.",
    labels: ["oss"],
    media: [
      {
        kind: "image",
        src: "/work/t3code-aur-icon/desktop.webp",
        alt: 'The merged pull request "fix nightly launcher icon" open on its Files changed tab, where the PKGBUILD diff bumps pkgrel from 1 to 2 and adds StartupWMClass=t3code to the desktop entry.',
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/t3code-aur-icon/phone.webp",
        alt: 'The merged pull request "fix nightly launcher icon" on a phone, with its summary explaining that adding StartupWMClass=t3code lets desktop environments match the window to its launcher icon.',
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "firefly",
    href: "https://github.com/AugusDogus/firefly",
    date: "2026-04-28",
    blurb:
      "A mobile-first turn flow chart and player aid for Firefly: The Game.",
    media: [
      {
        kind: "image",
        src: "/work/firefly/desktop.webp",
        alt: "The Firefly Turn Flow page on desktop shows the title, action counters, a row of route buttons for All, Fly, Buy, Deal and Work, and the top of the Fly route card.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/firefly/phone.mp4",
        poster: "/work/firefly/phone-poster.webp",
        alt: "On a phone, the Fly route is selected, the Choose Fly orders sheet slides up and is checked off, Full Burn is marked complete, and the page scrolls back to the top, where the turn is reset and the All route is selected again.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "Ghidra-GameCube-Loader",
    href: "https://github.com/AugusDogus/Ghidra-GameCube-Loader",
    date: "2026-03-27",
    blurb:
      "A fork of Cuyler36/Ghidra-GameCube-Loader adding headless support: non-interactive options, symbol map loading, and REL module address validation, so decompilation can be scripted.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/ghidra-gamecube-loader/desktop.mp4",
        poster: "/work/ghidra-gamecube-loader/desktop-poster.webp",
        alt: "A terminal shows a script that runs Ghidra's analyzeHeadless on a homebrew GameCube DOL with a symbol map option, then runs it and prints Ghidra's decompiled C for the copy_buffers function with the map's symbol names applied.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "superflight",
    href: "https://superflightgame.vercel.app",
    date: "2026-03-23",
    blurb:
      "A realtime multiplayer browser game built with Vite and PartyKit. Repo is private; the build is public.",
    media: [
      {
        kind: "video",
        src: "/work/superflight/desktop.mp4",
        poster: "/work/superflight/desktop-poster.webp",
        alt: "Two wingsuit flyers, one red and one yellow labeled Jonah, dive together over green mountains and level off low through a valley while the HUD reads 2 flyers live.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "minesweeper",
    href: "https://github.com/AugusDogus/minesweeper",
    date: "2026-03-21",
    blurb: "Guessing wrong, instant regret simulator.",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/minesweeper/desktop.mp4",
        poster: "/work/minesweeper/desktop-poster.webp",
        alt: "A cursor clicks the middle of a blank 16 by 16 Minesweeper board to open a numbered area, right-clicks two cells to flag them, clicks a safe cell that opens a second area, and flags one more mine.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/minesweeper/phone.mp4",
        poster: "/work/minesweeper/phone-poster.webp",
        alt: "On a phone, a tap on a blank 9 by 9 Minesweeper board opens a numbered area, a long press flags a mine, another tap opens a second area, and a final long press flags another mine.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "tak2",
    href: "https://github.com/AugusDogus/tak2",
    date: "2026-03-20",
    blurb: "A decompilation of Tak 2: The Staff of Dreams.",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/tak2/desktop.mp4",
        poster: "/work/tak2/desktop-poster.webp",
        alt: "A terminal runs a SHA-1 check that reports the rebuilt main.dol as OK, then prints the decompilation progress report showing 28 of 10459 functions matched.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "aur-cursor-bin-updater",
    href: "https://github.com/AugusDogus/aur-cursor-bin-updater",
    date: "2026-03-20",
    blurb:
      "Tracks Cursor’s early access and nightly Linux builds and publishes matching AUR packages.",
    labels: ["active"],
    media: [
      {
        kind: "video",
        src: "/work/aur-cursor-bin-updater/desktop.mp4",
        poster: "/work/aur-cursor-bin-updater/desktop-poster.webp",
        alt: "A terminal runs the updater for the nightly channel, which reports the PKGBUILD updated to Cursor 3.28.7, and git diff then shows the new pkgver, commit and sha512 checksum.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "react-native-media-compositor",
    href: "https://github.com/AugusDogus/react-native-media-compositor",
    date: "2026-03-16",
    blurb:
      "A Nitro-based React Native module for burning styled text overlays into local images and videos.",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/react-native-media-compositor/phone.mp4",
        poster: "/work/react-native-media-compositor/phone-poster.webp",
        alt: "In the media compositor example app, a caption is dragged to the top of a lake landscape photo, Export is tapped, and the exported image appears below with the caption burned in.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "vercel-labs/portless",
    notable: 3,
    contributionName: "Portless",
    href: "https://github.com/vercel-labs/portless/pull/122",
    date: "2026-03-16",
    blurb: "Documented the Windows requirements.",
    labels: ["oss"],
    media: [
      {
        kind: "image",
        src: "/work/portless-docs/desktop.webp",
        alt: "The portless docs page in dark mode is scrolled to its How it works and Requirements sections, and the Requirements list reads Node.js 24+ and macOS, Linux, or Windows.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/portless-docs/phone.webp",
        alt: "The portless docs on a phone in dark mode show the How it works section above a Requirements list that reads Node.js 24+ and macOS, Linux, or Windows.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "frameburn",
    href: "https://github.com/AugusDogus/frameburn",
    date: "2026-03-15",
    blurb:
      "A Bun monorepo for native caption burn-in on React Native: an Expo dev client plus a NitroModule that rasterizes captions into images and video on iOS and Android.",
    media: [
      {
        kind: "video",
        src: "/work/frameburn/phone.mp4",
        poster: "/work/frameburn/phone-poster.webp",
        alt: "A caption reading Golden hour is typed over a sunset sea clip, dragged to the lower third, and saved while the status pill steps through rasterizing the video and saving to the camera roll.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "cosmic-applets",
    href: "https://github.com/AugusDogus/cosmic-applets",
    date: "2026-03-09",
    blurb:
      "A fork of pop-os/cosmic-applets adding live window previews, drag-to-reorder, and persisted window ordering to the COSMIC dock, plus cross-monitor minimize and screencopy session cleanup.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/cosmic-applets/desktop.mp4",
        poster: "/work/cosmic-applets/desktop-poster.webp",
        alt: "In a nested COSMIC desktop, the dock's Terminal popup shows live previews of three terminal windows while the notes preview is dragged from last place to first and then back to last.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "discord.mov",
    href: "https://github.com/AugusDogus/discord.mov",
    date: "2026-02-20",
    blurb:
      "A Discord “Go Live” recorder built on discord.js-selfbot-v13 and FFmpeg.",
  },
  {
    title: "nimbus",
    date: "2026-02-03",
    blurb: "A self-hosted Google Drive replacement.",
    labels: ["wip"],
    private: true,
    media: [
      {
        kind: "video",
        src: "/work/nimbus/desktop.mp4",
        poster: "/work/nimbus/desktop-poster.webp",
        alt: "In the Trip photos folder in Nimbus, the cursor uploads a new photo that shows a progress bar and then appears in the grid, then opens it in the preview dialog and closes it.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/nimbus/phone.mp4",
        poster: "/work/nimbus/phone-poster.webp",
        alt: "On a phone, Nimbus opens the Trip photos folder, scrolls the photo grid, previews one photo, closes it and returns to My Drive.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "caffeine",
    href: "https://github.com/AugusDogus/caffeine",
    date: "2026-01-28",
    blurb:
      "Keeps Windows awake by simulating keyboard activity, in TypeScript.",
    media: [
      {
        kind: "video",
        src: "/work/caffeine/desktop.mp4",
        poster: "/work/caffeine/desktop-poster.webp",
        alt: "A terminal runs caffeine under Wine with a 2 second interval, and it prints a startup banner followed by four timestamped Simulated F15 key press lines.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "atproto-better-auth",
    href: "https://github.com/AugusDogus/atproto-better-auth",
    date: "2026-01-24",
    blurb:
      "A better-auth plugin for authenticating with AT Protocol and Bluesky.",
    media: [
      {
        kind: "video",
        src: "/work/atproto-better-auth/desktop.mp4",
        poster: "/work/atproto-better-auth/desktop-poster.webp",
        alt: "A service URL is typed into the example app's Bluesky Handle field, Sign in with Bluesky is clicked, and the browser redirects to Bluesky's authorization page asking the user to authenticate.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/atproto-better-auth/phone.mp4",
        poster: "/work/atproto-better-auth/phone-poster.webp",
        alt: "On a phone, a service URL is typed into the example app's Bluesky Handle field, Sign in with Bluesky is tapped, and Bluesky's authorization page opens.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "hytale-server",
    href: "https://github.com/AugusDogus/hytale-server",
    date: "2026-01-13",
    blurb: "A Docker image for running a dedicated Hytale server.",
    media: [
      {
        kind: "video",
        src: "/work/hytale-server/desktop.mp4",
        poster: "/work/hytale-server/desktop-poster.webp",
        alt: "A terminal runs podman run -it --rm -e LOG_TIMESTAMP=false hytale-server, and the container prints its Hytale Dedicated Server banner and an authentication required notice, then starts the Hytale downloader.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "hytale-plugin-template",
    href: "https://github.com/AugusDogus/hytale-plugin-template",
    date: "2026-01-13",
    blurb: "A development template for creating Hytale server plugins.",
    media: [
      {
        kind: "video",
        src: "/work/hytale-plugin-template/desktop.mp4",
        poster: "/work/hytale-plugin-template/desktop-poster.webp",
        alt: "A terminal clones the hytale-plugin-template repository into a folder named my-plugin, then lists its files, including the Gradle build scripts, the HytaleDevPlugin build plugin, TemplatePlugin.java and manifest.json.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },

  // 2025
  {
    title: "trpc-chrome",
    href: "https://github.com/AugusDogus/trpc-chrome",
    date: "2025-12-20",
    blurb:
      "A fork of jlalmes/trpc-chrome, a tRPC adapter for web extensions. Upgraded to tRPC v11 and migrated to a Bun monorepo.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/trpc-chrome/desktop.mp4",
        poster: "/work/trpc-chrome/desktop-poster.webp",
        alt: "A terminal shows the package's tRPC v11 peer dependencies, then runs the monorepo test script, and the query, mutation and subscription tests all pass.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "neweer-tray",
    href: "https://github.com/AugusDogus/neweer-tray",
    date: "2025-12-18",
    blurb:
      "Toggles my Neewer studio lights from the tray. 50KB, no vendor software, talks to the USB dongle directly.",
    media: [
      {
        kind: "video",
        src: "/work/neweer-tray/desktop.mp4",
        poster: "/work/neweer-tray/desktop-poster.webp",
        alt: "In the GNOME quick settings menu, the pointer clicks the Neewer Lights tile, which shows Toggling… and then On, and a second click turns it back to Off before the pointer returns to the desktop.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "opentab.sh",
    href: "https://opentab.sh",
    date: "2025-12-16",
    blurb: "Send tabs between your browser and your phone instantly.",
    labels: ["active"],
    featured: 4,
    highlight:
      "iOS, Android, and browser extension on one tRPC API; tabs arrive live over SSE",
    media: [
      {
        kind: "video",
        src: "/work/opentab/send-tab.mp4",
        poster: "/work/opentab/send-tab-poster.webp",
        alt: "A tab sent from an Android phone to a desktop browser: Chrome’s Share menu, the opentab share target, the app’s device list, then helium.computer opening in a new desktop tab.",
        width: 1156,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/opentab/send-tab-still.webp",
        alt: "The opentab Android app listing the account’s devices while the desktop browser is already opening the sent tab, helium.computer.",
        width: 1434,
        height: 992,
        frame: "desktop",
      },
    ],
  },
  {
    title: "hyperimport",
    href: "https://github.com/AugusDogus/hyperimport",
    date: "2025-11-22",
    blurb:
      "A fork of tr1ckydev/hyperimport, which imports C, Rust, and Zig files from TypeScript. Adds Windows support; the upstream PR is still open.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/hyperimport/desktop.mp4",
        poster: "/work/hyperimport/desktop-poster.webp",
        alt: "A terminal lists a small Bun project, prints its bunfig.toml and an index.ts that imports printf, gets, puts and exit from ./libc.so, then runs it with bun, enters the name Mira and prints Hello, Mira.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "ytpl",
    href: "https://github.com/AugusDogus/ytpl",
    date: "2025-11-08",
    blurb:
      "A fork of distubejs/ytpl, an anonymous YouTube playlist resolver, modernized to TypeScript with Bun and Zod.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/ytpl/desktop.mp4",
        poster: "/work/ytpl/desktop-poster.webp",
        alt: "A terminal shows a short TypeScript script that calls ytpl with a playlist ID, then runs it with Bun and prints the playlist title and a table of eight videos with their titles, durations and IDs.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "ytsr",
    href: "https://github.com/AugusDogus/ytsr",
    date: "2025-11-01",
    blurb:
      "A fork of distubejs/ytsr, for anonymous YouTube search requests, modernized to TypeScript with Bun and Zod. Fixed playlist parsing against YouTube’s lockupViewModel format and connection pooling.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/ytsr/desktop.mp4",
        poster: "/work/ytsr/desktop-poster.webp",
        alt: 'A terminal prints a short TypeScript script that calls ytsr, then runs it with Bun to search YouTube for "bun javascript runtime" and lists eight videos with their durations, view counts and titles.',
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "capy-bun",
    href: "https://github.com/AugusDogus/capy-bun",
    date: "2025-11-07",
    blurb:
      "TypeScript bindings for the Capy UI framework using Bun’s FFI, for native cross-platform desktop apps.",
    media: [
      {
        kind: "video",
        src: "/work/capy-bun/desktop.mp4",
        poster: "/work/capy-bun/desktop-poster.webp",
        alt: "A native GTK window titled Capy + Bun, created from TypeScript, where the name Mira is typed into a text field and the Say hello button is clicked.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "adb-autoconnect",
    href: "https://github.com/AugusDogus/adb-autoconnect",
    date: "2025-10-01",
    blurb:
      "Discovers and connects to wireless ADB devices over mDNS service discovery.",
    media: [
      {
        kind: "video",
        src: "/work/adb-autoconnect/desktop.mp4",
        poster: "/work/adb-autoconnect/desktop-poster.webp",
        alt: "In a terminal, adb devices lists nothing, then adb-autoconnect finds one wireless ADB target over mDNS at 192.168.77.96:37249, connects to it, and a follow-up adb shell command returns the emulator's model name.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "whisp.chat",
    href: "https://whisp.chat",
    date: "2025-09-30",
    blurb: "Ephemeral photos, videos, and messages for your closest friends.",
    labels: ["active"],
    featured: 3,
    highlight:
      "End-to-end encrypted with MLS (RFC 9420) via OpenMLS in Rust, bridged to React Native",
    media: [
      {
        kind: "image",
        src: "/work/whisp/hero.webp",
        alt: "The whisp.chat landing page in dark mode: the headline “Ephemeral messaging that doesn’t suck”, a privacy-first tagline, and a Join Waitlist with Discord button.",
        width: 1360,
        height: 680,
        frame: "desktop",
      },
    ],
  },
  {
    title: "create-electrobun-react",
    href: "https://github.com/AugusDogus/create-electrobun-react",
    date: "2025-09-05",
    blurb:
      "A starter template for desktop apps built with Electrobun and React.",
    media: [
      {
        kind: "video",
        src: "/work/create-electrobun-react/desktop.mp4",
        poster: "/work/create-electrobun-react/desktop-poster.webp",
        alt: "A purple Electrobun React App window counts from 0 to 4 as its blue Count button is clicked, then returns to 0 when the red Reset button is clicked.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "blackboardsh/electrobun",
    href: "https://github.com/blackboardsh/electrobun",
    date: "2025-09-04",
    blurb:
      "Fixed a WebView2 deadlock on window resize from worker threads ([#83](https://github.com/blackboardsh/electrobun/pull/83)) and Windows tar extraction failures under MSYS and Git Bash ([#76](https://github.com/blackboardsh/electrobun/pull/76)).",
    labels: ["oss"],
    media: [
      {
        kind: "image",
        src: "/work/electrobun-fixes/desktop.webp",
        alt: 'The merged GitHub pull request #83 for blackboardsh/electrobun, titled "fix(win): resolve WebView2 window resize deadlock on worker threads", is open on its Files changed tab, showing the diff that adds an async dispatch method to nativeWrapper.cpp.',
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },
  {
    title: "screenshot",
    href: "https://github.com/AugusDogus/screenshot",
    date: "2025-08-19",
    blurb:
      "A small, fast region screenshot overlay for Windows (C/Win32/GDI) and macOS (Objective-C/Cocoa).",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/screenshot/desktop.mp4",
        poster: "/work/screenshot/desktop-poster.webp",
        alt: "PrintScreen dims the desktop, a region is dragged over a landscape photo in a notes window with its pixel size shown beside it, then the region is moved and resized from a corner handle before Enter closes the overlay.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "junkyardindex.com",
    href: "https://junkyardindex.com",
    date: "2025-07-31",
    blurb:
      "One search across salvage yard inventory nationwide, with alerts when a match arrives.",
    labels: ["active"],
    featured: 2,
    highlight:
      "220k+ vehicles across 200+ yards and seven inventory networks, with paid plans",
    media: [
      {
        kind: "video",
        src: "/work/junkyardindex/search.mp4",
        poster: "/work/junkyardindex/search-poster.webp",
        alt: "Junkyard Index search in dark mode: the field is cleared, “Honda Civic” is typed, and 5,120 matching vehicles appear with yard photos.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/junkyardindex/search-mobile.webp",
        alt: "Junkyard Index on a phone: “Honda Civic” in the search field, filter, sort, and save controls, 5,120 vehicles, and the first result card.",
        width: 1179,
        height: 2556,
        frame: "phone",
      },
      {
        kind: "image",
        src: "/work/junkyardindex/results.webp",
        alt: "Junkyard Index desktop results for “Honda Civic”: 5,120 vehicles, with cards showing a yard photo, stock number, yard, VIN, date available, and city.",
        width: 1600,
        height: 922,
        frame: "desktop",
      },
    ],
  },
  {
    title: "metrics",
    href: "https://github.com/AugusDogus/metrics",
    date: "2025-07-17",
    blurb:
      "A dashboard for monitoring and visualizing Google Lighthouse performance metrics.",
    media: [
      {
        kind: "video",
        src: "/work/metrics/desktop.mp4",
        poster: "/work/metrics/desktop-poster.webp",
        alt: "The Lighthouse Metrics dashboard shows a week of desktop and mobile Performance and First Contentful Paint charts for augie.gg, a tooltip follows the cursor across the days, and the view switches to the Resume page and back.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "moo",
    href: "https://github.com/AugusDogus/moo",
    date: "2025-07-04",
    blurb:
      "A cottagecore deduction game where you crack four-emoji codes with bulls and cows feedback.",
    media: [
      {
        kind: "video",
        src: "/work/moo/desktop.mp4",
        poster: "/work/moo/desktop-poster.webp",
        alt: "A player fills four emoji slots from the moo picker and submits two guesses, and each new row in Your Guesses shows its bulls and cows counts before the round advances.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/moo/phone.webp",
        alt: "On a phone, the moo game page shows a You Won! card with a New Game button above the player's earlier guesses and their bulls and cows counts.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "multiplex",
    href: "https://github.com/AugusDogus/multiplex",
    date: "2025-06-19",
    blurb:
      "Watch Plex with friends in perfect sync, built after Plex retired Watch Together.",
    labels: ["wip"],
    featured: 1,
    highlight:
      "Native GameCube and Wii clients in C: H.264 over HLS, TLS 1.2, synced with web viewers",
    media: [
      {
        kind: "video",
        src: "/work/multiplex/web.mp4",
        poster: "/work/multiplex/web-poster.webp",
        alt: "The Multiplex web app in dark mode: poster shelves for Watch Together, Continue Watching and Recently Added scroll by, then a Watch Together room for Godzilla Minus One opens.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/multiplex/phone.mp4",
        poster: "/work/multiplex/phone-poster.webp",
        alt: "Multiplex on a phone: swiping through the home shelves, then opening the Godzilla Minus One Watch Together room from the bottom tab layout.",
        width: 590,
        height: 1280,
        frame: "phone",
      },
      {
        kind: "video",
        src: "/work/multiplex/gamecube.mp4",
        poster: "/work/multiplex/gamecube-poster.webp",
        alt: "The Multiplex GameCube client moves focus along its Continue Watching row, opens the details page for Signal Hill with a Resume button, then returns to the home rows.",
        width: 1280,
        height: 960,
        frame: "tv",
      },
    ],
  },
  {
    title: "awesome-windows",
    href: "https://github.com/AugusDogus/awesome-windows",
    date: "2025-04-02",
    blurb: "A curated list of the best applications and tools for Windows.",
    media: [
      {
        kind: "image",
        src: "/work/awesome-windows/desktop.webp",
        alt: "The awesome-windows repository page on GitHub in dark mode, showing the top of the README's linked list of Windows tools, starting with Atlas and Rufus.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },
  {
    title: "acacode/swagger-typescript-api",
    href: "https://github.com/acacode/swagger-typescript-api/pull/1046",
    date: "2025-02-12",
    blurb:
      "Made debug and silent logging configuration apply in both CLI and library modes.",
    labels: ["oss"],
    media: [
      {
        kind: "video",
        src: "/work/swagger-typescript-api/desktop.mp4",
        poster: "/work/swagger-typescript-api/desktop-poster.webp",
        alt: "A terminal shows a script that calls generateApi from swagger-typescript-api, runs it with --silent and gets no output, lists the generated api.ts, then runs it with --debug and gets info and debug log lines.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/swagger-typescript-api/phone.webp",
        alt: 'The merged GitHub pull request "Respect debug and silent logging configuration for both cli and lib modes" open on a phone at its files tab, showing the changeset diff.',
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "pact",
    href: "https://github.com/AugusDogus/pact",
    date: "2025-01-18",
    blurb: "A Unity game made for a game jam.",
    labels: ["archived"],
    media: [
      {
        kind: "video",
        src: "/work/pact/desktop.mp4",
        poster: "/work/pact/desktop-poster.webp",
        alt: "A pixel-art demon rises from a glowing pentagram in a candlelit library as flames burst up around it.",
        width: 1280,
        height: 720,
        frame: "desktop",
      },
    ],
  },
  {
    title: "bun-opencv",
    href: "https://github.com/AugusDogus/bun-opencv",
    date: "2025-01-03",
    blurb:
      "OpenCV bindings for Bun, exposing a native TypeScript interface. Published to npm as @augusdogus/bun-opencv.",
    media: [
      {
        kind: "video",
        src: "/work/bun-opencv/desktop.mp4",
        poster: "/work/bun-opencv/desktop-poster.webp",
        alt: "A terminal prints a short TypeScript script that loads two images with bun-opencv and runs template matching, then runs it, listing five match coordinates and drawing the scene with a box around each yellow star found.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "chrisbenincasa/tunarr",
    href: "https://github.com/chrisbenincasa/tunarr/pull/1039",
    date: "2025-01-03",
    blurb:
      "Contributed FFmpeg audio language preferences, adopted upstream with [credit in the changelog and release](https://github.com/chrisbenincasa/tunarr/pull/1039#issuecomment-2600977338).",
    labels: ["oss"],
    media: [
      {
        kind: "video",
        src: "/work/tunarr-audio-language/desktop.mp4",
        poster: "/work/tunarr-audio-language/desktop-poster.webp",
        alt: "In Tunarr's FFmpeg settings, Spanish and Japanese are added after English in the Audio Language Preferences field and the settings are saved.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/tunarr-audio-language/phone.webp",
        alt: "Tunarr's mobile FFmpeg settings page shows the Audio Language Preferences field with English, Spanish and Japanese selected in order.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },

  // 2024
  {
    title: "dmm",
    href: "https://github.com/AugusDogus/dmm",
    date: "2024-11-08",
    blurb: "A mod manager for Deadlock.",
    labels: ["archived"],
    media: [
      {
        kind: "video",
        src: "/work/dmm/desktop.mp4",
        poster: "/work/dmm/desktop-poster.webp",
        alt: "In Deadlock Mod Manager, the sort menu is switched from Most Viewed to Most Liked, a loading skeleton briefly replaces the mod grid, and the re-sorted mod cards are scrolled down and back to the top.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "username-colors",
    href: "https://github.com/AugusDogus/username-colors",
    date: "2024-11-02",
    blurb:
      "A Vendetta plugin for recoloring usernames in Discord’s mobile client.",
  },
  {
    title: "ct3a-electron",
    href: "https://github.com/AugusDogus/ct3a-electron",
    date: "2024-08-15",
    blurb: "A create-t3-app project rewired to run as an Electron desktop app.",
    media: [
      {
        kind: "video",
        src: "/work/ct3a-electron/desktop.mp4",
        poster: "/work/ct3a-electron/desktop-poster.webp",
        alt: "The Create T3 App page runs in an Electron window that says Is Electron Yes, the pointer hovers Ping Electron, the page scrolls down, a post titled Lunch with Mira is typed and submitted and shows as the most recent post, and the page scrolls back to the top.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "plex-rich-presence-cli",
    href: "https://github.com/AugusDogus/plex-rich-presence-cli",
    date: "2024-06-23",
    blurb:
      "Publishes what you are watching on Plex to Discord Rich Presence, using Bun, Drizzle, and the Discord IPC API.",
    labels: ["wip"],
  },
  {
    title: "gnmyt/MySpeed",
    href: "https://github.com/gnmyt/MySpeed/pull/723",
    date: "2024-06-23",
    blurb: "Improved the Open Graph image.",
    labels: ["oss"],
    media: [
      {
        kind: "image",
        src: "/work/myspeed-og/desktop.webp",
        alt: "The MySpeed Open Graph image on a dark background, showing the MySpeed logo, the date and time in UTC, 120.47 Mbps download, 72.93 Mbps upload and a 14 ms ping.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },
  {
    title: "timer",
    href: "https://github.com/AugusDogus/timer",
    date: "2024-03-23",
    blurb:
      "A shot timer for mobile. Calibrates a background noise floor, then records split times whenever the mic picks up a peak above the threshold.",
    media: [
      {
        kind: "video",
        src: "/work/timer/phone.mp4",
        poster: "/work/timer/phone-poster.webp",
        alt: "The timer app calibrates its background noise level in Settings, then on the Home tab the stopwatch runs and six split times appear under Splits #1 before it is stopped.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "oven-sh/bun",
    href: "https://github.com/oven-sh/bun/pull/8875",
    date: "2024-02-13",
    blurb:
      "Made the curl install script hand off to the Windows installer when run through Cygwin.",
    labels: ["oss"],
    notable: 2,
    contributionName: "Bun",
    media: [
      {
        kind: "image",
        src: "/work/bun-cygwin-install/desktop.webp",
        alt: "A merged GitHub pull request in dark mode shows a diff to bun's install.sh, where the line telling Windows users to use WSL is replaced by a PowerShell call to the Windows installer.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },

  // 2023
  {
    title: "apex-calendar",
    href: "https://dsc.gg/apex-calendar",
    date: "2023-04-11",
    blurb:
      "A Discord bot that posts and auto-updates a calendar of Oversight Esports events.",
    media: [
      {
        kind: "image",
        src: "/work/apex-calendar/desktop.webp",
        alt: "A November 2026 month calendar under a red header, with green scrim cards, red series and draft cards, and blue collegiate cup cards placed on their days, each showing start and end times and the groups playing.",
        width: 1920,
        height: 1080,
        frame: "desktop",
      },
    ],
  },

  // 2022
  {
    title: "ionic-team/capacitor-docs",
    href: "https://github.com/ionic-team/capacitor-docs/pull/122",
    date: "2022-12-22",
    blurb: "Fixed a broken link in the Electron tutorial.",
    labels: ["oss"],
    media: [
      {
        kind: "image",
        src: "/work/capacitor-docs/desktop.webp",
        alt: 'The merged GitHub pull request "docs: fix Electron tutorial link" shows a one-line diff that changes the Electron guide link from electronjs.org/docs/tutorial/first-app to www.electronjs.org/docs/latest/tutorial/tutorial-first-app.',
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/capacitor-docs/phone.mp4",
        poster: "/work/capacitor-docs/phone-poster.webp",
        alt: 'On a phone, the merged GitHub pull request "docs: fix Electron tutorial link" scrolls from its title and Merged badge down to the diff that replaces the old Electron guide link with the new one, then back to the top.',
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "santahat.gg",
    href: "https://github.com/AugusDogus/santahat.gg",
    date: "2022-08-20",
    blurb: "Slap a Santa hat on your Discord avatar.",
    media: [
      {
        kind: "video",
        src: "/work/santahat/desktop.mp4",
        poster: "/work/santahat/desktop-poster.webp",
        alt: "A Santa hat on an illustrated cat avatar is shrunk with a corner handle, dragged onto the cat's head and tilted with the rotate handle, and the square and round previews below update.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },

  // 2020
  {
    title: "apex-status-bot",
    href: "https://github.com/AugusDogus/apex-status-bot",
    date: "2020-02-11",
    blurb:
      "A Discord bot that swaps a user’s role based on whether they are playing Apex.",
  },
  {
    title: "minecraft-status-bot",
    href: "https://github.com/AugusDogus/minecraft-status-bot",
    date: "2020-02-04",
    blurb: "A Discord bot that displays a server’s current player count.",
    media: [
      {
        kind: "image",
        src: "/work/minecraft-status-bot/desktop.webp",
        alt: "The Minecraft Status Bot logo beside a Discord member list in which the bot, listed as Server IP, shows the status Playing 0 of 16.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
    ],
  },

  // 2019
  {
    title: "uwu-bot",
    href: "https://github.com/AugusDogus/uwu-bot",
    date: "2019-12-17",
    blurb: "OwO ipsum dowow sit amet, consectetuw adipiscing ewit.",
    labels: ["archived"],
    media: [
      {
        kind: "video",
        src: "/work/uwu-bot/desktop.mp4",
        poster: "/work/uwu-bot/desktop-poster.webp",
        alt: "Two sentences are passed to uwu-bot's translate script in a terminal, and each comes back with r and l turned into w, n and m sounds turned into ny and my, and uwu added at the end.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "docker-haloce-sapp",
    href: "https://github.com/AugusDogus/docker-haloce-sapp",
    date: "2019-12-11",
    blurb:
      "A containerized Halo CE dedicated server running SAPP, converted from a Docker image originally built for Eldewrito.",
  },
  {
    title: "jwt-pwa-boilerplate",
    href: "https://github.com/AugusDogus/jwt-pwa-boilerplate",
    date: "2019-03-25",
    blurb: "A PWA example app for exercising express-jwt-boilerplate.",
    media: [
      {
        kind: "image",
        src: "/work/jwt-pwa-boilerplate/desktop.webp",
        alt: "The app's Home page in a desktop browser shows the members-only message, the signed-in email sam@example.com, a green Healthy status badge and a full-width Logout button under a blue Home toolbar.",
        width: 2560,
        height: 1600,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/jwt-pwa-boilerplate/phone.mp4",
        poster: "/work/jwt-pwa-boilerplate/phone-poster.webp",
        alt: "On a phone, an email and password are typed into the Login form, Register is tapped, the Home page slides in showing sam@example.com and a Healthy badge, and Logout returns to the Login page.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "express-jwt-boilerplate",
    href: "https://github.com/AugusDogus/express-jwt-boilerplate",
    date: "2019-03-24",
    blurb: "An Express and MongoDB starter with JWT authentication.",
    media: [
      {
        kind: "video",
        src: "/work/express-jwt-boilerplate/desktop.mp4",
        poster: "/work/express-jwt-boilerplate/desktop-poster.webp",
        alt: "A terminal registers sam@example.com with the Express API using curl, then logs in and gets back a JSON response containing a signed JWT.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "plexguide-node-http-server",
    href: "https://github.com/AugusDogus/plexguide-node-http-server",
    date: "2019-01-29",
    blurb: "A wrapper around node-http-server for use with PlexGuide.",
  },

  // 2018
  {
    title: "cordova-plugin-fcm",
    href: "https://github.com/AugusDogus/cordova-plugin-fcm",
    date: "2018-07-31",
    blurb:
      "A fork of fechanique/cordova-plugin-fcm, Google FCM push notifications for Cordova.",
    fork: true,
  },
  {
    title: "Re-Spite-Proxy",
    href: "https://github.com/AugusDogus/Re-Spite-Proxy",
    date: "2018-07-18",
    blurb:
      "A TCP proxy for intercepting packets to and from the game Re:Spite.",
  },
  {
    title: "disc-golf-scorekeeper",
    href: "https://github.com/AugusDogus/disc-golf-scorekeeper",
    date: "2018-05-12",
    blurb: "Just another disc golf scorekeeper.",
    media: [
      {
        kind: "image",
        src: "/work/disc-golf-scorekeeper/phone.webp",
        alt: "The app's launch screen shows a white line drawing of a disc golf basket centered on a solid green background.",
        width: 780,
        height: 1688,
        frame: "phone",
      },
    ],
  },
  {
    title: "gc-rom-dl",
    href: "https://github.com/AugusDogus/gc-rom-dl",
    date: "2018-04-14",
    blurb: "A GameCube ROM downloader.",
  },
  {
    title: "plex-anime-support",
    href: "https://github.com/AugusDogus/plex-anime-support",
    date: "2018-04-08",
    blurb:
      "A shell script that wires HAMA and the Absolute Series Scanner into Plex so anime libraries scan and match correctly.",
    media: [
      {
        kind: "video",
        src: "/work/plex-anime-support/desktop.mp4",
        poster: "/work/plex-anime-support/desktop-poster.webp",
        alt: "A terminal runs install-hama-and-ass.sh, which stops the plex container, clones Hama.bundle, downloads Absolute Series Scanner.py into the Plex Scanners folder, restarts the container and prints Finished Installation.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
    ],
  },
  {
    title: "casper",
    href: "https://github.com/AugusDogus/casper",
    date: "2018-02-09",
    blurb: "A third-party Snapchat client.",
    media: [
      {
        kind: "video",
        src: "/work/casper/phone.mp4",
        poster: "/work/casper/phone-poster.webp",
        alt: "On the blue Casper sign-in screen, an email address and password are typed, Register slides up the registration form, and Back slides it away to an empty sign-in form.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },

  // 2017
  {
    title: "rpg",
    href: "https://github.com/AugusDogus/rpg",
    date: "2017-11-08",
    blurb: "A Unity RPG project in C#.",
    labels: ["archived"],
  },
  {
    title: "Yang / Mars",
    href: "https://github.com/AugusDogus/Yang",
    date: "2017-01-22",
    blurb:
      "Yet Another Name Generator, a REST API and frontend for short generated names, plus Mars, a RuneScape dashboard that consumed Yang’s output to build account URIs.",
    labels: ["archived"],
    media: [
      {
        kind: "video",
        src: "/work/yang-mars/desktop.mp4",
        poster: "/work/yang-mars/desktop-poster.webp",
        alt: 'The Yang page under a blue navigation bar reads "Yet another name generator", and each click on Home or the Yang logo reloads it with a new generated name such as Thalia671102, Adriel510 or Amara2109.',
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },

  // 2016
  {
    title: "Chivskape",
    href: "https://github.com/AugusDogus/Chivskape",
    date: "2016-12-15",
    blurb:
      "A multiplayer roguelike dungeon crawler in Unity, with a separate socket.io server handling replication.",
    labels: ["archived"],
    media: [
      {
        kind: "image",
        src: "/work/chivskape/desktop.webp",
        alt: "Two Chivskape windows show the same green arena side by side, with the same player mid-run in both clients.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "optifine_phishing",
    href: "https://github.com/AugusDogus/optifine_phishing",
    date: "2016-10-20",
    blurb:
      "A walkthrough of common phishing techniques, using Minecraft as the example so it reaches a broad audience.",
    labels: ["archived"],
  },
];
