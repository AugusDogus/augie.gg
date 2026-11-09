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
 * - A circuit board is `kind: "board"`: a `poster` render of it (its pixel
 *   `width` and `height`, `alt` text) and the files an interactive viewer
 *   opens from it: the KiCad `pcb`, its root `schematic` (one sheet), and a
 *   GLB `model` exported from the board. It leads as a desktop capture would,
 *   always alone, since a phone or TV in front would cover the viewer. The
 *   poster shows until someone opens the viewer, and is the thumbnail. Say
 *   in the blurb when a board is a draft or not yet built: a render alone
 *   reads as a finished board.
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

/**
 * A photo of the console a TV capture runs on, cut out on transparency. It
 * stands at the TV's base, so the platform reads at a glance.
 */
export type Console = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** The frame a capture is shown in; only a TV has a console in front of it. */
type Framing =
  | { frame: Exclude<MediaFrame, "tv"> }
  | { frame: "tv"; console?: Console };

/** A screen capture: a still or a short silent loop. */
export type Capture = (
  | {
      kind: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
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
    }
) &
  Framing;

/** A circuit board: its poster, and the KiCad files its viewer opens. */
export type Board = {
  kind: "board";
  /** A render of the board, shown until the viewer opens. */
  poster: string;
  alt: string;
  width: number;
  height: number;
  /** The `.kicad_pcb` file. */
  pcb: string;
  /** The root `.kicad_sch` file. */
  schematic: string;
  /** A GLB export of the board. */
  model: string;
};

export type Media = Capture | Board;

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
        alt: "A diagram traces a signal from an extra Siri Remote over Bluetooth to Remote Bridge on an ESP32-C3 or Linux, then over the local network to Apple TV, while the original remote stays paired to Apple TV over Bluetooth.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/siri-remote-bridge/phone.webp",
        alt: "The Remote Bridge Android app lists two bridges, Living Room and Den, with pills for whether each is online, whether its Siri Remote is connected, its battery and its volume control.",
        width: 780,
        height: 1688,
        frame: "phone",
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
        alt: "In the Cube Farm office game, the player clicks Hire employee twice as the isometric office grows from five to seven cubicles and funds drop from $191 to $116, then clicks Improve to raise Office equipment to level 1.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/cubefarm/phone.mp4",
        poster: "/work/cubefarm/phone-poster.webp",
        alt: "On a phone, two taps on Hire employee grow the cube farm from five to seven cubicles, and a tap on Improve raises Office equipment to level 1.",
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
        alt: "Emma types a first and last name, emma@example.com and (202) 555-0147 into the 'Share your details with Augie' form and presses Enter, the page says Sent to Augie, then Augie's People list shows Emma Carter marked New beside Ben Turner, Claire Hayes and Luke Miller, and Emma's card opens with that email and phone number.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/contacts/phone.mp4",
        poster: "/work/contacts/phone-poster.webp",
        alt: "On a phone, at the same moments, Emma fills in and sends the 'Share your details with Augie' form, then Augie's People list shows Emma Carter marked New and Emma's card opens.",
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
        alt: "The current pressure is changed from 500 to 700 PSI and the 30% target is clicked, so the nitrox stop in the fill plan moves from 2,711 to 2,911 and then to 2,509 PSI before Reset brings back the 500 PSI, 32% plan.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/mixpsi/phone.mp4",
        poster: "/work/mixpsi/phone-poster.webp",
        alt: "On a phone, 700 PSI is entered as the current pressure and 30% is tapped, so the nitrox stop in the fill plan changes to 2,911 and then to 2,509 PSI before Reset brings back the 500 PSI, 32% plan.",
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
        kind: "image",
        src: "/work/root/desktop.webp",
        alt: "A six-player Root match on the Mountain map, with six faction portraits down the left side and the mod's Invite friends and Match buttons at the top right.",
        width: 1920,
        height: 1080,
        frame: "desktop",
      },
    ],
  },
  {
    title: "Valheim mods",
    href: "https://thunderstore.io/c/valheim/p/AugusDogus/",
    date: "2026-09-11",
    blurb:
      "Six Valheim client and server mods, including [Buildheim](https://github.com/AugusDogus/Buildheim), [Player Trading Reforged](https://github.com/AugusDogus/PlayerTradingReforged), and [Soundheim](https://github.com/AugusDogus/Soundheim).",
    labels: ["active"],
    media: [
      {
        kind: "video",
        src: "/work/valheim-mods/desktop.mp4",
        poster: "/work/valheim-mods/desktop-poster.webp",
        alt: "Valheim screenshots and a short gameplay clip show five mods in turn, each captioned with its name: a Buildheim blueprint hologram of a longhouse, the Player Trading Reforged trade window with the other player's name blurred, a shield equipped by Shield Me Bruh Reforged when a one-handed weapon is drawn, the Soundheim output device list in audio settings, and the Bedtime notice that 1 of 3 players is asleep.",
        width: 1280,
        height: 800,
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
        alt: "On a DashSplit order page for a Thai restaurant, Pad Thai is ticked and set to Split 2 ways and Green Curry is ticked, the bottom bar updates to Pay $35.16 with Venmo, and then both items are unticked again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/dashsplit/phone.mp4",
        poster: "/work/dashsplit/phone-poster.webp",
        alt: "On a phone, Pad Thai is tapped and set to Split 2 ways and Green Curry is tapped on the same DashSplit order, the bar shows Pay $35.16 with Venmo, and then both are tapped off again.",
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
        src: "/work/teams-rs/desktop.mp4",
        poster: "/work/teams-rs/desktop-poster.webp",
        alt: 'teams-rs, with made-up demo data, sends "Joining standup now" in a group chat, opens the work week calendar and Wednesday\'s 9:00 Standup, joins it through the pre-join screen with microphone and camera off, and sends a thumbs-up reaction in the four-person call.',
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
        alt: "In the Pomodoro app, Make flashcards is picked from the task list, a 25 minute focus session is started and counts down to 24:55, then the timer is reset and Outline the lab report is picked again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/pomodoro/phone.mp4",
        poster: "/work/pomodoro/phone-poster.webp",
        alt: "On a phone, at the same moments, Make flashcards is tapped in the Tasks tab, which returns to the timer, the focus session counts down to 24:55, and after a reset Outline the lab report is tapped again.",
        width: 592,
        height: 1280,
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
        alt: "A Marketplace feed of secondhand furniture and electronics around Portland, OR scrolls, a coffee table is saved, and the Filters sheet is set to 40 mi to show nine listings.",
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
        alt: "On the Grand Buffet homepage, the pointer clicks Takeout menu, the menu page scrolls to Browse by category and Appetizers is clicked open to show its items and prices, then the page scrolls back up and Home is clicked to return to the homepage.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/grand-buffet/phone.mp4",
        poster: "/work/grand-buffet/phone-poster.webp",
        alt: "On a phone, Menu is tapped on the Grand Buffet homepage, the takeout menu scrolls to Browse by category and Appetizers is tapped open to show its items and prices, then the page scrolls back up and Home is tapped to return to the homepage.",
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
        kind: "video",
        src: "/work/fairth/desktop.mp4",
        poster: "/work/fairth/desktop-poster.webp",
        alt: "A Google Photos web library gains a new Today row as five photos (a dog, an autumn trail, a mountain lake, a misty forest and a pizza) arrive two, two and then one at a time.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/fairth/phone.mp4",
        poster: "/work/fairth/phone-poster.webp",
        alt: "In the Fairth companion app, tapping Start backing up opens the home screen, which counts down from 5 items left to Backed up while the Google Photos row shows Backup on.",
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
        kind: "image",
        src: "/work/t3code-icons/desktop.webp",
        alt: "Two screenshots of the same GNOME dock with the T3 Code Nightly tooltip: before the fix the launcher shows a generic gear icon, and after it shows the T3 icon.",
        width: 2560,
        height: 1600,
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
        alt: "Three villagers carry logs to a blue stone keep, then a cottage is placed from the build bar and they hammer it up, raising the population cap from 3/5 to 3/9.",
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
        alt: "In T3 Code, the Cursor provider shows Not authenticated despite a stored CURSOR_API_KEY, then after Binary path is set to t3-cursor-agent it shows Authenticated as person@example.com, and a new thread on Cursor's Composer 2 adds a /health route and changes two files.",
        width: 1280,
        height: 800,
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
        alt: "In a terminal, docker compose up -d creates the t3code network and starts the t3code container, then docker exec t3code t3 --version prints t3 v0.0.46-nightly.20261005.2702.",
        width: 1920,
        height: 1200,
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
        alt: "In GNOME Settings, Fingerprint Authentication enrolls a right index finger in three touches, then GNOME Console runs fprintd-list, which lists that print on the Goodix TLS Fingerprint Sensor 55X4, and sudo whoami asks for the finger and prints root.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "radio-mic-usb-ptt",
    href: "https://github.com/AugusDogus/radio-mic-usb-ptt",
    date: "2026-06-26",
    blurb:
      "An unbuilt draft PCB and STM32 firmware that turn a BTECH QHM22 handheld mic into USB audio plus an F13 push-to-talk key. The board builds on i2cjak's rework.",
    labels: ["wip"],
    media: [
      {
        kind: "board",
        poster: "/work/radio-mic-usb-ptt/board-poster.webp",
        alt: "A 3D render of the 60 by 40 mm board: the 3.5 mm and 2.5 mm jacks for the mic's plug open toward the viewer at the front right, the STM32 sits at the center among its passives, and the USB-C port is at the far left corner.",
        width: 2560,
        height: 1600,
        pcb: "/work/radio-mic-usb-ptt/radio-mic-usb-ptt.kicad_pcb",
        schematic: "/work/radio-mic-usb-ptt/radio-mic-usb-ptt.kicad_sch",
        model: "/work/radio-mic-usb-ptt/board.glb",
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
        alt: "The pointer moves along the floating frosted-glass GNOME Dock over an aurora wallpaper, clicks Image Viewer to show previews of its three photo windows, and drags the last thumbnail to the front of the list.",
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
        alt: "In the GNOME Open File dialog over the eml to md page, studio-order-receipt.eml is double-clicked, its Markdown appears in the output panel, Copy is clicked, the output scrolls to the quoted reply and back, and the drop zone opens the dialog again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/eml-md/phone.mp4",
        poster: "/work/eml-md/phone-poster.webp",
        alt: "On a phone, studio-order-receipt.eml is tapped in the Android Files picker, the eml to md page shows its Markdown, Copy is tapped, the page scrolls to the quoted reply and back, and the drop zone opens the picker again.",
        width: 592,
        height: 1280,
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
        kind: "video",
        src: "/work/firefly/desktop.mp4",
        poster: "/work/firefly/desktop-poster.webp",
        alt: "On desktop, the Choose Fly orders open in a sheet and are checked off, Choose Buy is checked to use the second of two actions, the Deal route opens locked, and Reset clears the turn before the All route is chosen again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/firefly/phone.mp4",
        poster: "/work/firefly/phone-poster.webp",
        alt: "On a phone, the Choose Fly orders sheet slides up and is checked off, Choose Buy uses the second of two actions, the Deal route opens locked, and Reset clears the turn before the All route is chosen again.",
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
        alt: "A terminal runs Ghidra's analyzeHeadless on multiplex.dol, the fork's loader imports it as a Nintendo GameCube/Wii Binary (Executable) and logs that headless mode skipped the symbol map dialog, and bat prints the decompiled C of the function at 0x801f7f94.",
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
        alt: "A red wingsuit flyer and a yellow one labeled Flyer 4821 fly into a green valley on separate lines, then a dotted ring around the red flyer fills as it skims the ground, turns violet, and drains as it boosts and draws level with the yellow flyer while the HUD speed climbs from about 93 to 118.",
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
        alt: "Minesweeper's Pattern help dialog uses a ringed preview of the board to show why a hidden square must be a mine, and the cursor then flags that square, opens help again to see two squares marked safe, reveals them, and starts a new game.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/minesweeper/phone.mp4",
        poster: "/work/minesweeper/phone-poster.webp",
        alt: "On a phone, the same Pattern help explanation appears, a long press flags the mine it found, a second hint marks two squares safe, a tap reveals them, and Home then New Game starts over.",
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
    blurb: "A decompilation of the GameCube game Tak 2: The Staff of Dreams.",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/tak2/desktop.mp4",
        poster: "/work/tak2/desktop-poster.webp",
        alt: "objdiff lists functions from the Tak 2 decompilation with their match percentages, opens UnlockablesMenuItem_GetUserData to show the original game's PowerPC instructions and the rebuilt ones side by side at 100.00%, and goes back to the list.",
        width: 1280,
        height: 800,
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
        alt: "An animated diagram follows one release: Cursor's nightly channel moves from 3.29.12 to 3.29.14, the hourly Update AUR Nightly Package workflow checks, updates the PKGBUILD, commits it and publishes it, the AUR's cursor-nightly-bin by augusdogus changes from 3.29.12-1 to 3.29.14-1 with Last Updated 2026-11-07 07:11, and yay -Sua, which found nothing to do on the run before, then lists cursor-nightly-bin 3.29.12-1 -> 3.29.14-1.",
        width: 1280,
        height: 800,
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
        alt: "In the media compositor example app on Android, the preview crop is switched to 1:1, a caption is dragged from the bottom to the top of a photo of a border collie, Export is tapped, and the exported square image appears below with the caption burned in.",
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
        alt: "A waterfall clip is recorded by holding the record button, then on the playback screen the caption Hidden falls is typed, dragged to the lower third and saved while the status steps through rasterizing the video and saving it to the camera roll, before closing back to the camera.",
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
        alt: "On a COSMIC desktop with three Files windows open, the dock's Files popup shows previews of the Hikes, Recipes and Garden windows, and the Garden preview is dragged from last place to first and then back to last.",
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
    media: [
      {
        kind: "video",
        src: "/work/discord-mov/desktop.mp4",
        poster: "/work/discord-mov/desktop-poster.webp",
        alt: 'Sam Carter, already live in a Discord voice channel, mentions Recorder, which replies "Recording your stream.", joins muted and starts watching, while samcarter_2026-02-21T03-42-07-318Z.mkv appears in a recordings folder in GNOME Files and grows to 1.3 MB until Sam stops streaming and Recorder leaves.',
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
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
        alt: "In the Nimbus web app on a desktop browser, the Trip photos folder is opened, Alpine meadow.jpg is uploaded with New and Upload file while its progress bar fills to 100%, then the new photo is previewed, closed, and the view returns to My Drive.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/nimbus/phone.mp4",
        poster: "/work/nimbus/phone-poster.webp",
        alt: "In the Nimbus web app on a phone, the Trip photos folder is opened, Alpine meadow.jpg is uploaded from the New drawer while a progress bar fills across the top, then the new photo is previewed, closed, and the view returns to My Drive.",
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
        alt: 'On a recreated Windows 11 desktop, Windows Terminal shows the caffeine tray banner, hovering the tray icon shows the tooltip "Caffeine - Keeping awake", a right-click opens the Simulate F15 Now and Exit menu, and clicking Simulate F15 Now shows an F15 key press.',
        width: 1280,
        height: 800,
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
        alt: "The handle augie.gg is typed into the example app's Bluesky Handle field, Sign in with Bluesky is clicked, and the app shows the signed-in profile card for augie (@augie.gg) with avatar, banner and DID before Sign Out returns to the empty form.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/atproto-better-auth/phone.mp4",
        poster: "/work/atproto-better-auth/phone-poster.webp",
        alt: "On a phone, augie.gg is typed into the Bluesky Handle field, Sign in with Bluesky is tapped, and the profile card for augie (@augie.gg) with avatar, banner and DID appears before Sign Out is tapped.",
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
        alt: "A diagram shows docker compose up -d starting the hytale-server container, which downloads the Hytale server files, prepares its folders and launches HytaleServer.jar, then opens UDP port 5520 as three players, Sam, Emma and Jake, connect, with the hytale-data, hytale-game and hytale-downloader volumes attached.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "hytale-plugin-template",
    href: "https://github.com/AugusDogus/hytale-plugin-template",
    date: "2026-01-13",
    blurb: "A development template for creating Hytale server plugins.",
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
        alt: "In VS Code the popup's trpc.openNewTab.mutate call autocompletes and shows the { url: string } input type from background.ts, then the Chrome extension popup sends example.com over chrome.runtime.Port, the service worker rejects it as an invalid URL and the error returns to the popup, and https://example.com is accepted and opened in a new tab.",
        width: 1280,
        height: 800,
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
        alt: "In GNOME quick settings, the Neewer Lights tile is clicked, shows Toggling... and then On, and a second click turns it back to Off.",
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
        src: "/work/opentab/desktop.mp4",
        poster: "/work/opentab/desktop-poster.webp",
        alt: "On a Windows desktop, opentab's Send to your devices item in Chrome's right-click menu sends the imputnet/helium GitHub page to a mirrored Pixel 8 Pro, where opening the opentab notification loads it, and the phone shares helium.computer to opentab and the page opens in Chrome.",
        width: 1460,
        height: 1016,
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
        alt: "A terminal shows an index.ts that imports printf, gets and puts from libc.so, then runs it with bun, enters the name Augie and prints Hello, Augie.",
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
        alt: "A terminal shows a short script that calls ytpl with a playlist ID, then runs it with Bun and prints the playlist title and its first four videos with their durations.",
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
        alt: "A terminal shows a short script that calls ytsr, then runs it with Bun to search YouTube for sourdough starter and prints five videos with their durations.",
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
        alt: "A TypeScript file in a text editor uses capy-bun to open a native GTK window titled Capy + Bun with a My Button button, and each of three clicks on that button prints Button clicked! in the terminal running it with Bun.",
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
        alt: "In a terminal, adb devices lists nothing, then adb-autoconnect discovers one wireless ADB target over mDNS, connects to it, and adb devices lists it as a device.",
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
        kind: "video",
        src: "/work/whisp/phone.mp4",
        poster: "/work/whisp/phone-poster.webp",
        alt: "On whisp's Friends list, miso's new whisp opens full screen and closes, a long press on miso opens the Discord profile sheet, and tapping refresh loads miso's next whisp.",
        width: 592,
        height: 1280,
        frame: "phone",
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
        alt: "The template's starter page in a desktop window titled Electrobun React App, where Count is clicked up to 3, Reset sets it back to 0, and the page scrolls down to the Tech Stack and Get Started links and back.",
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
        alt: 'The merged GitHub pull request #83 for electrobun, titled "fix(win): resolve WebView2 window resize deadlock on worker threads", shows its nativeWrapper.cpp diff adding a dispatch_async method and changing the WebView2 resize call from dispatch_sync to dispatch_async.',
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
      "A small, fast region screenshot overlay for Windows (C/Win32/GDI), macOS (Objective-C/Cocoa) and Linux Wayland/COSMIC (C/GTK4 with layer-shell, plus a COSMIC panel applet).",
    labels: ["wip"],
    media: [
      {
        kind: "video",
        src: "/work/screenshot/desktop.mp4",
        poster: "/work/screenshot/desktop-poster.webp",
        alt: "On a Windows 11 desktop, clicking the screenshot tray icon dims the screen, a region is dragged over a kingfisher photo with its size shown beside it, moved, and resized from a corner handle, then Enter copies it and closes the overlay.",
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
        src: "/work/junkyardindex/desktop.mp4",
        poster: "/work/junkyardindex/desktop-poster.webp",
        alt: "On the Junkyard Index home page map of 213 salvage yards, “Honda Civic” is typed and searched, 5,292 matching vehicles appear as cards with yard photos, yard names, VINs and cities, and the logo leads back to the map.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/junkyardindex/phone.mp4",
        poster: "/work/junkyardindex/phone-poster.webp",
        alt: "The same search on a phone: “Honda Civic” is typed above the yard map, 5,292 vehicles appear with the first card’s yard photo, yard, VIN and city, and the logo returns to the map.",
        width: 592,
        height: 1280,
        frame: "phone",
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
        alt: "The Lighthouse Metrics dashboard shows three weeks of desktop and mobile Performance and First Contentful Paint history for https://example.com: the cursor drops onto a dip on 2025-07-05 (desktop 83, mobile 54), slides to 2025-07-08 where the scores recover (96 and 90), opens the Blog tab while its charts draw in, and returns to Home.",
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
        alt: "In a moo game in room FERN, a player fills four emoji slots for round 3 and clicks Submit Guess, the page switches to You Won!, and the guess history shows the third row scoring 4 bulls and 0 cows.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/moo/phone.mp4",
        poster: "/work/moo/phone-poster.webp",
        alt: "On a phone in the same moo room, the opponent taps four emoji and submits a round 3 guess, waits for the round to advance, and sees You Lost at the moment the desktop player's winning guess lands.",
        width: 592,
        height: 1280,
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
        src: "/work/multiplex/desktop.mp4",
        poster: "/work/multiplex/desktop-poster.webp",
        alt: "In the Multiplex web app, Augie waits in the Watch Together lobby for Futurama, The White Hole, until Jake shows as In lobby, then the player opens and starts the episode by itself, and Augie clicks Pause on the Futurama logo.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/multiplex/phone.mp4",
        poster: "/work/multiplex/phone-poster.webp",
        alt: "On Sam's phone, Jake joins the Futurama lobby, the episode starts by itself in the sideways mobile player, and a notice says Augie paused playback as the picture stops on the Futurama logo.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
      {
        kind: "video",
        src: "/work/multiplex/gamecube.mp4",
        poster: "/work/multiplex/gamecube-poster.webp",
        alt: "On the Multiplex GameCube client, Jake opens the details for Futurama, The White Hole, goes back Home, joins the room from Watch Together, and the episode plays until Augie pauses it on the Futurama logo.",
        width: 1280,
        height: 960,
        frame: "tv",
        // Evan-Amos, public domain: commons.wikimedia.org/wiki/File:GameCube-Set.jpg
        console: {
          src: "/work/multiplex/gamecube-console.webp",
          alt: "A Nintendo GameCube with its controller plugged in.",
          width: 720,
          height: 395,
        },
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
        kind: "video",
        src: "/work/awesome-windows/desktop.mp4",
        poster: "/work/awesome-windows/desktop-poster.webp",
        alt: "A graphic of the awesome-windows list shows the icons of 20 listed Windows apps in a grid while a card steps through the README entries for Microsoft PowerToys, Windhawk and five of its mods, LittleBigMouse and WinRAR.",
        width: 1280,
        height: 800,
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
        alt: "A terminal runs the same gen.ts, which calls generateApi with silent: true, against swagger-typescript-api 13.0.23, which still prints five log lines, and then against 13.0.24, which prints nothing.",
        width: 1920,
        height: 1200,
        frame: "desktop",
      },
      {
        kind: "image",
        src: "/work/swagger-typescript-api/phone.webp",
        alt: "The merged pull request's Files changed tab on a phone, showing src/index.ts adding a consola import and lines that set consola.level from config.debug and config.silent.",
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
        alt: "In the repo's Super Mario Bros test frame, bun-opencv matches a coin template to all 19 coins and then a Mario template to Mario, with a box scored 1.00 on each match, while the terminal under the short find.ts script prints matches: 19 and matches: 1.",
        width: 1280,
        height: 800,
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
        alt: "In Tunarr's FFmpeg settings, Japanese and Spanish are added after English in the Audio Language Preferences field and the settings are saved.",
        width: 1280,
        height: 800,
        frame: "desktop",
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
        alt: "In Deadlock Mod Manager on Windows, the sort menu is switched from Most Viewed to Most Liked, a loading skeleton shows, the re-sorted grid of GameBanana mods is scrolled down a row and back, and the sort is switched back to Most Viewed.",
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
    media: [
      {
        kind: "video",
        src: "/work/username-colors/phone.mp4",
        poster: "/work/username-colors/phone-poster.webp",
        alt: "In a Discord chat on a phone, Jake's name is amber and Emma's is green; on the Username Colors settings page Jake's entry is tapped, the hue bar is dragged from amber to blue and Select is tapped, and back in the chat every one of Jake's names is blue.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
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
        alt: "A Create T3 App page runs in an Electron window beside the terminal running bun run dev, each click on Ping Electron prints pong from the Electron main process, and a post titled Hi from Electron is submitted, logged by the dev server as tRPC calls and shown as the most recent post.",
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
    media: [
      {
        kind: "video",
        src: "/work/plex-rich-presence-cli/desktop.mp4",
        poster: "/work/plex-rich-presence-cli/desktop-poster.webp",
        alt: "An episode of Superman, Billion Dollar Limited (1942), plays in Plex Web while a Discord profile card for Jake shows Watching Superman, Streaming on Plex, Season 1 • Episode 3 with the Plex icon, and the activity clears when the player is closed.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
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
        alt: "Two Discord link previews of the same MySpeed link side by side: before, a small embed with the MySpeed logo as its thumbnail, and after, a large embed with the MySpeed card showing 487.36 Mbps download, 42.18 Mbps upload and a 12 ms ping.",
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
        src: "/work/timer/desktop.mp4",
        poster: "/work/timer/desktop-poster.webp",
        alt: "A diagram of the microphone level during a string of six gunshots marks each peak that rises above the dashed background level line with its split time, from 1.508 to 4.960 seconds, while a large stopwatch counts up above the label Listening for shots.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/timer/phone.mp4",
        poster: "/work/timer/phone-poster.webp",
        alt: "On the timer app's Home tab, Start is tapped, the stopwatch runs and six split times appear under Splits #2 below an earlier string in Splits #1, then Stop is tapped.",
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
        alt: "A merged GitHub pull request to oven-sh/bun, titled feat: make curl install script run the windows installer (if run through cygwin), shows the src/cli/install.sh diff in dark mode where the lines telling Windows users to install bun with Windows Subsystem for Linux and exit are replaced by a PowerShell call to bun's Windows installer.",
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
        kind: "video",
        src: "/work/apex-calendar/desktop.mp4",
        poster: "/work/apex-calendar/desktop-poster.webp",
        alt: "In a Discord channel, Jake runs /refresh and the Apex Calendar bot edits its April 2025 calendar post to add Pro League and Alienware Collegiate Clash events.",
        width: 1280,
        height: 800,
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
        alt: "On santahat.gg, a Santa hat over the default Discord avatar is shrunk with a corner handle, dragged onto the head and tilted with the rotate handle, and the square and round previews below update.",
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
    media: [
      {
        kind: "video",
        src: "/work/apex-status-bot/desktop.mp4",
        poster: "/work/apex-status-bot/desktop-poster.webp",
        alt: "In a Discord member list, Emma starts playing Apex Legends and moves up into the Playing Apex group with Jake, then Jake and Emma drop back to Online as each stops playing, and Jake moves back up on launching Apex again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "minecraft-status-bot",
    href: "https://github.com/AugusDogus/minecraft-status-bot",
    date: "2020-02-04",
    blurb: "A Discord bot that displays a server’s current player count.",
    media: [
      {
        kind: "video",
        src: "/work/minecraft-status-bot/desktop.mp4",
        poster: "/work/minecraft-status-bot/desktop-poster.webp",
        alt: "In a new Discord channel, Nick runs /players, the bot's reply shows Sending command and then an embed listing the three players online out of 20, while its member list status reads Watching 3 / 20 online.",
        width: 1280,
        height: 800,
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
        alt: 'In a Discord channel, Augie sends !uwu after Jonah\'s message "Hello friends, good morning!" and the uwu bot reposts it as "Hewwo fwiends, good myownying! uwu", then answers Jonah\'s uwu with uwu.',
        width: 1280,
        height: 800,
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
    media: [
      {
        kind: "video",
        src: "/work/docker-haloce-sapp/desktop.mp4",
        poster: "/work/docker-haloce-sapp/desktop-poster.webp",
        alt: "A diagram shows docker-compose up -d creating the haloceded container, which checks the /game volume for haloceded.exe, downloads SAPP v10.1 into it, copies a default init.txt and starts the Halo CE dedicated server under Wine and Xvfb as its log prints each step, then opens UDP ports 2302 and 2303 to players.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "jwt-pwa-boilerplate",
    href: "https://github.com/AugusDogus/jwt-pwa-boilerplate",
    date: "2019-03-25",
    blurb: "A PWA example app for exercising express-jwt-boilerplate.",
    media: [
      {
        kind: "video",
        src: "/work/jwt-pwa-boilerplate/phone.mp4",
        poster: "/work/jwt-pwa-boilerplate/phone-poster.webp",
        alt: "On a phone, a password is typed for sam@example.com on the Login form, Register is tapped, the Home page shows the members-only message, sam@example.com and a Healthy badge, and Logout returns to the Login page.",
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
        alt: "A terminal registers sam@example.com with the Express API using curl, then logs in and gets back a signed JWT.",
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
    media: [
      {
        kind: "video",
        src: "/work/plexguide-node-http-server/desktop.mp4",
        poster: "/work/plexguide-node-http-server/desktop-poster.webp",
        alt: "A browser reloads example.com:8080, and plexguide-node-http-server, which runs node-http-server on port 8080 beside Plex Media Server on a PlexGuide server, answers the requests for index.html and lib/basic.css with 200 OK, so the browser shows the node-http-server example page.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },

  // 2018
  {
    title: "cordova-plugin-fcm",
    href: "https://github.com/AugusDogus/cordova-plugin-fcm",
    date: "2018-07-31",
    blurb:
      "A fork of fechanique/cordova-plugin-fcm, Google FCM push notifications for Cordova.",
    fork: true,
    media: [
      {
        kind: "video",
        src: "/work/cordova-plugin-fcm/desktop.mp4",
        poster: "/work/cordova-plugin-fcm/desktop-poster.webp",
        alt: "An Android phone shows an Out for delivery push notification from a Cordova app called Parcels, and tapping it opens Parcel 1042 while the app's FCMPlugin.onNotification handler logs wasTapped true; a second push that arrives with the app open takes the handler's else branch and marks the parcel Delivered.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "Re-Spite-Proxy",
    href: "https://github.com/AugusDogus/Re-Spite-Proxy",
    date: "2018-07-18",
    blurb:
      "A TCP proxy for intercepting packets to and from the game Re:Spite.",
    media: [
      {
        kind: "video",
        src: "/work/re-spite-proxy/desktop.mp4",
        poster: "/work/re-spite-proxy/desktop-poster.webp",
        alt: "Packets move between the Re:Spite client, Re-Spite Proxy on 127.0.0.1:8768 and the game server at game.re-spite.com, while the proxy's Windows console prints each received chunk with every byte shifted down by one, such as MESSAGE02??? hey everyone! in green and PLAYER_MESSAGE03??? Sam: hi Augie! in yellow.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
  {
    title: "disc-golf-scorekeeper",
    href: "https://github.com/AugusDogus/disc-golf-scorekeeper",
    date: "2018-05-12",
    blurb: "Just another disc golf scorekeeper.",
    media: [
      {
        kind: "video",
        src: "/work/disc-golf-scorekeeper/phone.mp4",
        poster: "/work/disc-golf-scorekeeper/phone-poster.webp",
        alt: "On an Android phone, a password is typed into the Disc Golf Scorekeeper sign-in card for augie@example.com, then a recreated Riverside Park scorecard takes plus and minus taps for a birdie by Augie and a bogey by Sam on hole 4 and a birdie by Jake on hole 5, each total against par updating, and the leaderboard shows Augie at -2, Jake at even and Sam at +1 before signing out.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
    ],
  },
  {
    title: "gc-rom-dl",
    href: "https://github.com/AugusDogus/gc-rom-dl",
    date: "2018-04-14",
    blurb: "A GameCube ROM downloader.",
    media: [
      {
        kind: "video",
        src: "/work/gc-rom-dl/desktop.mp4",
        poster: "/work/gc-rom-dl/desktop-poster.webp",
        alt: 'The GameCube ROM Downloader window shows search results for "brine" with made-up game titles, the pointer clicks Brine Rush to open its cover with a red Not Downloaded ribbon, then clicks the cloud download icon, and the ribbon turns orange Downloading with the toast "Attempting to download Brine_Rush_(USA).7z.." and then green Downloaded with the toast "Downloaded ~/Downloads/GC ROMS/Brine_Rush_(USA).7z" before a click outside closes it.',
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
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
        alt: "A terminal runs install-hama-and-ass.sh from /opt/plex-anime-support, then lists Hama.bundle in Plex Media Server/Plug-ins and Absolute Series Scanner.py in Plex Media Server/Scanners/Series.",
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
        alt: "A curl command calls Yang's /api endpoint eight times and each response is a JSON object with a generated name.",
        width: 1920,
        height: 1200,
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
        kind: "video",
        src: "/work/chivskape/desktop.mp4",
        poster: "/work/chivskape/desktop-poster.webp",
        alt: "In two Chivskape windows side by side, right-clicks in the left window send its player out and back, then right-clicks in the right window do the same for the other player, and each window shows the other's run as it happens.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
];
