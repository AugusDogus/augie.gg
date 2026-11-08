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
        alt: "In the Cube Farm office game, the player hires two employees as the isometric office grows from three cubicles to five, then buys the Office equipment upgrade, whose button greys out at $90.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/cubefarm/phone.mp4",
        poster: "/work/cubefarm/phone-poster.webp",
        alt: "On a phone, the player taps Hire employee twice as the cube farm grows from three cubicles to five, then taps Improve to raise Office equipment to level 1.",
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
        alt: "In Augie's Contacts Exchange address book, the People list that is waiting on Jonah's link reloads to show Jonah Reyes as a new contact next to Alex Morgan, Jamie Chen and Nina Patel, then Jonah's card opens with jonah@example.com and (202) 555-0147 and is closed again.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/contacts/phone.mp4",
        poster: "/work/contacts/phone-poster.webp",
        alt: "On a phone, Jonah fills in a first and last name, jonah@example.com and (202) 555-0147 on the 'Share your details with Augie' form, scrolls down, taps Send to Augie, and the page says Sent to Augie.",
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
        alt: "teams-rs, with made-up demo data, sends a message in a group chat, opens the morning standup from the work week calendar, joins it through the pre-join screen with camera and microphone off, and sends a thumbs-up reaction in the call.",
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
        kind: "image",
        src: "/work/fairth/desktop.webp",
        alt: "The Fairth owner app's setup page reports that automatic Android setup is complete and lists the Android, Google apps, and Magisk and Zygisk steps as passed.",
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
        alt: "In a terminal, Cursor Agent rejects a cursor_login request with an Invalid params error, the t3-cursor-agent shim answers the same request with an empty success result, and its account probe returns the API key's email, person@example.com.",
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
        alt: "A terminal replays a captured USB trace of the Goodix reader and lists its TLS handshake, config upload and encrypted image transfer, ending with 22 frames and 0 validation failures.",
        width: 1920,
        height: 1200,
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
        alt: "A terminal runs a headless Ghidra import of the Multiplex GameCube client with the fork's GameCube loader, which skips the symbol map dialog, and prints one decompiled function that reads the console type.",
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
        alt: "A cursor clicks the center of a blank 9 by 9 Minesweeper board to open a numbered area, right-clicks to flag a mine, opens a second area, flags another mine, reveals the last safe cell to clear the field, then starts a new game.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/minesweeper/phone.mp4",
        poster: "/work/minesweeper/phone-poster.webp",
        alt: "On a phone, a tap on the center of a blank 9 by 9 Minesweeper board opens a numbered area, a long press flags a mine, another tap opens a second area, a second long press flags another mine, a last tap clears the field, and Start New Game resets the board.",
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
        alt: "A terminal prints two PowerPC instructions from the original game, the matching decompiled C function, and a count of 28 of 10459 functions matched.",
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
        alt: "A terminal runs the updater for the nightly channel, which updates the cursor-nightly-bin PKGBUILD to Cursor 3.28.7, and a diff shows pkgver changing from 3.2.11 to 3.28.7.",
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
        alt: "A terminal runs caffeine with a 2 second interval, and it prints its banner followed by a timestamped Simulated F15 key press line every two seconds.",
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
        alt: "In the example app, the handle mira.example.com is typed and Sign in with Bluesky is clicked, the button shows Connecting..., the page reloads with a spinner, a sample Bluesky profile card appears with the banner, avatar, handle, DID and a Sign Out button, and Sign Out returns to the empty sign-in form.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/atproto-better-auth/phone.mp4",
        poster: "/work/atproto-better-auth/phone-poster.webp",
        alt: "On a phone, the handle mira.example.com is typed and Sign in with Bluesky is tapped, the page reloads with a spinner, a sample Bluesky profile card appears with the handle and DID, and tapping Sign Out returns to the empty sign-in form.",
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
        alt: "A popup script calls a background procedure through chromeLink and prints its reply, Hello, Augie! (from background.ts).",
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
        kind: "image",
        src: "/work/capy-bun/desktop.webp",
        alt: "A native GTK window titled Capy + Bun, created from TypeScript through Bun's FFI, shows a Hello, World! label, a text field holding the name Augie and a Say hello button.",
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
        alt: "The Lighthouse Metrics dashboard shows PageSpeed Insights runs of augie.gg: the cursor hovers the Performance chart's desktop and mobile scores on the Home tab, switches to the Resume tab, hovers its chart and returns to Home.",
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
        src: "/work/multiplex/desktop.mp4",
        poster: "/work/multiplex/desktop-poster.webp",
        alt: "In the Multiplex web app, Augie waits in the Watch Together lobby for Futurama, The White Hole, until Priya shows as In lobby, then the player opens and starts the episode by itself, and Augie clicks Pause on the Futurama logo.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
      {
        kind: "video",
        src: "/work/multiplex/phone.mp4",
        poster: "/work/multiplex/phone-poster.webp",
        alt: "On Sam's phone, Priya joins the Futurama lobby, the episode starts by itself in the sideways mobile player, and a notice says Augie paused playback as the picture stops on the Futurama logo.",
        width: 592,
        height: 1280,
        frame: "phone",
      },
      {
        kind: "video",
        src: "/work/multiplex/gamecube.mp4",
        poster: "/work/multiplex/gamecube-poster.webp",
        alt: "On the Multiplex GameCube client, Priya opens the details for Futurama, The White Hole, goes back Home, joins the room from Watch Together, and the episode plays until Augie pauses it on the Futurama logo.",
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
        kind: "image",
        src: "/work/awesome-windows/desktop.webp",
        alt: "The awesome-windows README on GitHub lists NanaZip, LightShot, LittleBigMouse, WizTree and RustDesk, each with a short description.",
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
        alt: "A terminal shows a generateApi call with silent: true, runs it with no log output, and lists the generated Api.ts.",
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
        alt: "A terminal shows a short bun-opencv script, then runs its template match and draws the scene with a box around each of the three yellow stars it found.",
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
        alt: "The Create T3 App page runs in an Electron window that says Is Electron Yes, the pointer hovers Ping Electron, the page scrolls down, a post titled Lunch with Augie is typed and submitted and shows as the most recent post, and the page scrolls back to the top.",
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
        alt: "The timer app calibrates its background and shot levels in Settings, then on the Home tab the stopwatch runs and six split times appear under Splits #1 before it is stopped.",
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
        kind: "video",
        src: "/work/apex-calendar/desktop.mp4",
        poster: "/work/apex-calendar/desktop-poster.webp",
        alt: "In a Discord channel, Priya runs /refresh and the Apex Calendar bot edits its April 2025 calendar post to add Pro League and Alienware Collegiate Clash events.",
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
        alt: "In a new Discord channel, Priya runs /players, the bot's reply shows Sending command and then an embed listing the three players online out of 20, while its member list status reads Watching 3 / 20 online.",
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
        alt: 'In a Discord channel, Priya sends !uwu after Jonah\'s message "Hello friends, good morning!" and the uwu bot reposts it as "Hewwo fwiends, good myownying! uwu", then answers Jonah\'s uwu with uwu.',
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
        alt: "A terminal runs install-hama-and-ass.sh, which clones the HAMA agent into the Plex Plug-ins folder and puts Absolute Series Scanner.py in Scanners/Series.",
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
        alt: "A right-click in the left Chivskape window sends that player on a run and back, then a right-click in the right window moves the other player, and each window mirrors the other's run.",
        width: 1280,
        height: 800,
        frame: "desktop",
      },
    ],
  },
];
