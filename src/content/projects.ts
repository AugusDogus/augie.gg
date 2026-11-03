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
  },
  {
    title: "cubefarm",
    href: "https://cubefarm.vercel.app",
    date: "2026-10-04",
    blurb:
      "An incremental office game where employees, workflows, and company choices grow a corporation.",
  },
  {
    title: "contacts",
    href: "https://contacts.exchange",
    date: "2026-10-03",
    blurb:
      "An address book where invitees fill in their own details for Google Contacts or vCard export.",
  },
  {
    title: "mixpsi",
    href: "https://mixpsi.vercel.app",
    date: "2026-09-28",
    blurb:
      "A nitrox blending calculator for planning scuba gas mixes by partial pressure and final pressure.",
  },
  {
    title: "root",
    href: "https://github.com/AugusDogus/root",
    date: "2026-09-26",
    blurb:
      "An experimental Root launcher and mod for private six-player games with Steam friends on Windows and Linux.",
  },
  {
    title: "Valheim mods",
    href: "https://thunderstore.io/c/valheim/p/AugusDogus/",
    date: "2026-09-11",
    blurb:
      "Seven Valheim client and server mods, including [Buildheim](https://github.com/AugusDogus/Buildheim), [ComfortView](https://github.com/AugusDogus/ComfortView), and [Soundheim](https://github.com/AugusDogus/Soundheim).",
    labels: ["active"],
  },
  {
    title: "DashSplit",
    href: "https://dashsplit.vercel.app",
    date: "2026-08-30",
    blurb:
      "A fully static bill splitter for DoorDash and Uber Eats receipts, with in-browser OCR and share links that carry the order.",
  },
  {
    title: "teams-rs",
    date: "2026-08-26",
    blurb: "A native Linux Microsoft Teams client, written in Rust.",
    labels: ["wip"],
    private: true,
    featured: 5,
    highlight:
      "Built on GPUI, the GPU-accelerated UI framework behind the Zed editor.",
  },
  {
    title: "pomodoro",
    href: "https://github.com/AugusDogus/pomodoro",
    date: "2026-08-23",
    blurb:
      "A calm, offline-first to-do list and Pomodoro timer built with Astro, React, Convex, and Automerge.",
  },
  {
    title: "marketplace",
    href: "https://github.com/AugusDogus/marketplace",
    date: "2026-08-23",
    blurb:
      "A focused Expo Android client for browsing Facebook Marketplace, with local saves and saved-search notifications.",
  },
  {
    title: "grand-buffet",
    href: "https://grandbuffet.vercel.app",
    date: "2026-08-20",
    blurb: "A fast Astro website for Grand Buffet in Pace, Florida.",
  },
  {
    title: "fairth",
    href: "https://github.com/AugusDogus/fairth",
    date: "2026-08-19",
    blurb:
      "A self-hosted Google Photos backup bridge that sends media from an Expo companion to a private containerized Android appliance.",
  },
  {
    title: "pingdotgg/t3code",
    href: "https://github.com/pingdotgg/t3code/pull/7421",
    date: "2026-08-18",
    blurb:
      "Fixed missing GNOME and KDE launcher icons in the in-repo AUR packages by installing the AppImage's hicolor icon set.",
    labels: ["oss"],
    notable: 1,
    contributionName: "T3 Code",
  },
  {
    title: "Little Age",
    date: "2026-08-15",
    blurb:
      "A cozy, combat-free hamlet builder: gather resources, build, and watch villagers potter about.",
    private: true,
  },
  {
    title: "cursor-acp-auth-shim",
    href: "https://github.com/AugusDogus/cursor-acp-auth-shim",
    date: "2026-07-31",
    blurb:
      "A compatibility shim that lets T3 Code authenticate Cursor Agent with CURSOR_API_KEY, working around the null userEmail that API-key auth reports. Implemented in Rust, C, Go, and Bun, with benchmarks.",
    labels: ["active"],
  },
  {
    title: "t3code-nightly-docker",
    href: "https://github.com/AugusDogus/t3code-nightly-docker",
    date: "2026-07-24",
    blurb:
      "Publishes smoke-tested Docker images of each T3 Code nightly, built for long-running hosting on an Unraid server.",
  },
  {
    title: "Goodix fingerprint reader driver",
    date: "2026-07-13",
    blurb: "Reverse engineering the protocol to get it working on Linux.",
    labels: ["wip"],
    private: true,
  },
  {
    title: "kenwood-rj45-usb-ptt",
    href: "https://github.com/AugusDogus/kenwood-rj45-usb-ptt",
    date: "2026-06-26",
    blurb:
      "A PCB and planned RP2040 firmware that turns a Kenwood-style handheld microphone into USB audio plus an F13 push-to-talk key.",
    labels: ["wip"],
  },
  {
    title: "gnome-dock",
    href: "https://github.com/AugusDogus/gnome-dock",
    date: "2026-05-30",
    blurb:
      "A floating bottom dock for GNOME Shell with frosted squircle visuals.",
  },
  {
    title: "eml.md",
    href: "https://github.com/AugusDogus/eml.md",
    date: "2026-05-15",
    blurb: "Private, local conversion of .eml email files to markdown.",
  },
  {
    title: "maria-rcks/t3code-aur",
    href: "https://github.com/maria-rcks/t3code-aur/pull/9",
    date: "2026-05-03",
    blurb: "Fixed the nightly launcher icon.",
    labels: ["oss"],
  },
  {
    title: "firefly",
    href: "https://github.com/AugusDogus/firefly",
    date: "2026-04-28",
    blurb:
      "A mobile-first turn flow chart and player aid for Firefly: The Game.",
  },
  {
    title: "Ghidra-GameCube-Loader",
    href: "https://github.com/AugusDogus/Ghidra-GameCube-Loader",
    date: "2026-03-27",
    blurb:
      "A fork of Cuyler36/Ghidra-GameCube-Loader adding headless support: non-interactive options, symbol map loading, and REL module address validation, so decompilation can be scripted.",
    fork: true,
  },
  {
    title: "superflight",
    href: "https://superflightgame.vercel.app",
    date: "2026-03-23",
    blurb:
      "A realtime multiplayer browser game built with Vite and PartyKit. Repo is private; the build is public.",
  },
  {
    title: "minesweeper",
    href: "https://github.com/AugusDogus/minesweeper",
    date: "2026-03-21",
    blurb: "Guessing wrong, instant regret simulator.",
    labels: ["wip"],
  },
  {
    title: "tak2",
    href: "https://github.com/AugusDogus/tak2",
    date: "2026-03-20",
    blurb: "A decompilation of Tak 2: The Staff of Dreams.",
    labels: ["wip"],
  },
  {
    title: "aur-cursor-bin-updater",
    href: "https://github.com/AugusDogus/aur-cursor-bin-updater",
    date: "2026-03-20",
    blurb:
      "Tracks Cursor's early access and nightly Linux builds and publishes matching AUR packages.",
    labels: ["active"],
  },
  {
    title: "react-native-media-compositor",
    href: "https://github.com/AugusDogus/react-native-media-compositor",
    date: "2026-03-16",
    blurb:
      "A Nitro-based React Native module for burning styled text overlays into local images and videos.",
    labels: ["wip"],
  },
  {
    title: "vercel-labs/portless",
    notable: 3,
    contributionName: "Portless",
    href: "https://github.com/vercel-labs/portless/pull/122",
    date: "2026-03-16",
    blurb: "Documented the Windows requirements.",
    labels: ["oss"],
  },
  {
    title: "frameburn",
    href: "https://github.com/AugusDogus/frameburn",
    date: "2026-03-15",
    blurb:
      "A Bun monorepo for native caption burn-in on React Native: an Expo dev client plus a NitroModule that rasterizes captions into images and video on iOS and Android.",
  },
  {
    title: "cosmic-applets",
    href: "https://github.com/AugusDogus/cosmic-applets",
    date: "2026-03-09",
    blurb:
      "A fork of pop-os/cosmic-applets adding live window previews, drag-to-reorder, and persisted window ordering to the COSMIC dock, plus cross-monitor minimize and screencopy session cleanup.",
    fork: true,
  },
  {
    title: "discord.mov",
    href: "https://github.com/AugusDogus/discord.mov",
    date: "2026-02-20",
    blurb:
      'A Discord "Go Live" recorder built on discord.js-selfbot-v13 and FFmpeg.',
  },
  {
    title: "nimbus",
    date: "2026-02-03",
    blurb: "A self-hosted Google Drive replacement.",
    labels: ["wip"],
    private: true,
  },
  {
    title: "caffeine",
    href: "https://github.com/AugusDogus/caffeine",
    date: "2026-01-28",
    blurb:
      "Keeps Windows awake by simulating keyboard activity, in TypeScript.",
  },
  {
    title: "atproto-better-auth",
    href: "https://github.com/AugusDogus/atproto-better-auth",
    date: "2026-01-24",
    blurb: "A better-auth plugin for authenticating with ATProto and Bluesky.",
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
  },
  {
    title: "neweer-tray",
    href: "https://github.com/AugusDogus/neweer-tray",
    date: "2025-12-18",
    blurb:
      "Toggles my Neewer studio lights from the tray. 50KB, no vendor software, talks to the USB dongle directly.",
  },
  {
    title: "opentab.sh",
    href: "https://opentab.sh",
    date: "2025-12-16",
    blurb: "Send tabs between your browser and your phone instantly.",
    labels: ["active"],
    featured: 4,
    highlight:
      "iOS, Android, and a browser extension share one tRPC API. Tabs arrive live over server-sent events.",
  },
  {
    title: "hyperimport",
    href: "https://github.com/AugusDogus/hyperimport",
    date: "2025-11-22",
    blurb:
      "A fork of tr1ckydev/hyperimport, which imports C, Rust, and Zig files from TypeScript. Adds Windows support; the upstream PR is still open.",
    fork: true,
  },
  {
    title: "ytpl",
    href: "https://github.com/AugusDogus/ytpl",
    date: "2025-11-08",
    blurb:
      "A fork of distubejs/ytpl, an anonymous YouTube playlist resolver, modernized to TypeScript with Bun and Zod.",
    fork: true,
  },
  {
    title: "ytsr",
    href: "https://github.com/AugusDogus/ytsr",
    date: "2025-11-01",
    blurb:
      "A fork of distubejs/ytsr, for anonymous YouTube search requests, modernized to TypeScript with Bun and Zod. Fixed playlist parsing against YouTube’s lockupViewModel format and connection pooling.",
    fork: true,
  },
  {
    title: "capy-bun",
    href: "https://github.com/AugusDogus/capy-bun",
    date: "2025-11-07",
    blurb:
      "TypeScript bindings for the Capy UI framework using Bun's FFI, for native cross-platform desktop apps.",
  },
  {
    title: "adb-autoconnect",
    href: "https://github.com/AugusDogus/adb-autoconnect",
    date: "2025-10-01",
    blurb:
      "Discovers and connects to wireless ADB devices over mDNS service discovery.",
  },
  {
    title: "whisp.chat",
    href: "https://whisp.chat",
    date: "2025-09-30",
    blurb: "Ephemeral photos, videos, and messages for your closest friends.",
    labels: ["active"],
    featured: 3,
    highlight:
      "End-to-end encrypted with MLS (RFC 9420) via OpenMLS in Rust, bridged to React Native.",
  },
  {
    title: "create-electrobun-react",
    href: "https://github.com/AugusDogus/create-electrobun-react",
    date: "2025-09-05",
    blurb:
      "A starter template for desktop apps built with Electrobun and React.",
  },
  {
    title: "blackboardsh/electrobun",
    href: "https://github.com/blackboardsh/electrobun",
    date: "2025-09-04",
    blurb:
      "Fixed a WebView2 deadlock on window resize from worker threads ([#83](https://github.com/blackboardsh/electrobun/pull/83)) and Windows tar extraction failures under MSYS and Git Bash ([#76](https://github.com/blackboardsh/electrobun/pull/76)).",
    labels: ["oss"],
  },
  {
    title: "screenshot",
    href: "https://github.com/AugusDogus/screenshot",
    date: "2025-08-19",
    blurb:
      "A small, fast region screenshot overlay for Windows (C/Win32/GDI) and macOS (Objective-C/Cocoa).",
    labels: ["wip"],
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
      "Inventory refreshed daily, with saved searches and new-vehicle alerts by email or Discord.",
  },
  {
    title: "metrics",
    href: "https://github.com/AugusDogus/metrics",
    date: "2025-07-17",
    blurb:
      "A dashboard for monitoring and visualizing Google Lighthouse performance metrics.",
  },
  {
    title: "moo",
    href: "https://github.com/AugusDogus/moo",
    date: "2025-07-04",
    blurb:
      "A cottage-core deduction game where you crack four-emoji codes with bulls and cows feedback.",
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
      "Native GameCube and Wii clients in C stream H.264 over HLS, with TLS 1.2 and playback synced to web viewers.",
  },
  {
    title: "awesome-windows",
    href: "https://github.com/AugusDogus/awesome-windows",
    date: "2025-04-02",
    blurb: "A curated list of the best applications and tools for Windows.",
  },
  {
    title: "acacode/swagger-typescript-api",
    href: "https://github.com/acacode/swagger-typescript-api/pull/1046",
    date: "2025-02-12",
    blurb:
      "Made debug and silent logging configuration apply in both CLI and library modes.",
    labels: ["oss"],
  },
  {
    title: "pact",
    href: "https://github.com/AugusDogus/pact",
    date: "2025-01-18",
    blurb: "A Unity game made for a game jam.",
    labels: ["archived"],
  },
  {
    title: "bun-opencv",
    href: "https://github.com/AugusDogus/bun-opencv",
    date: "2025-01-03",
    blurb:
      "OpenCV bindings for Bun, exposing a native TypeScript interface. Published to npm as @augusdogus/bun-opencv.",
  },
  {
    title: "chrisbenincasa/tunarr",
    href: "https://github.com/chrisbenincasa/tunarr/pull/1039",
    date: "2025-01-03",
    blurb:
      "Contributed FFmpeg audio language preferences, adopted upstream with [credit in the changelog and release](https://github.com/chrisbenincasa/tunarr/pull/1039#issuecomment-2600977338).",
    labels: ["oss"],
  },

  // 2024
  {
    title: "dmm",
    href: "https://github.com/AugusDogus/dmm",
    date: "2024-11-08",
    blurb: "A mod manager for Deadlock.",
    labels: ["archived"],
  },
  {
    title: "username-colors",
    href: "https://github.com/AugusDogus/username-colors",
    date: "2024-11-02",
    blurb:
      "A Vendetta plugin for recoloring usernames in Discord's mobile client.",
  },
  {
    title: "ct3a-electron",
    href: "https://github.com/AugusDogus/ct3a-electron",
    date: "2024-08-15",
    blurb: "A create-t3-app project rewired to run as an Electron desktop app.",
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
  },
  {
    title: "timer",
    href: "https://github.com/AugusDogus/timer",
    date: "2024-03-23",
    blurb:
      "A shot timer for mobile. Calibrates a background noise floor, then records split times whenever the mic picks up a peak above the threshold.",
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
  },

  // 2023
  {
    title: "apex-calendar",
    href: "https://dsc.gg/apex-calendar",
    date: "2023-04-11",
    blurb:
      "A Discord bot that posts and auto-updates a calendar of Oversight Esports events.",
  },

  // 2022
  {
    title: "ionic-team/capacitor-docs",
    href: "https://github.com/ionic-team/capacitor-docs/pull/122",
    date: "2022-12-22",
    blurb: "Fixed a broken link in the Electron tutorial.",
    labels: ["oss"],
  },
  {
    title: "santahat.gg",
    href: "https://github.com/AugusDogus/santahat.gg",
    date: "2022-08-20",
    blurb: "Slap a Santa hat on your Discord avatar.",
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
  },

  // 2019
  {
    title: "uwu-bot",
    href: "https://github.com/AugusDogus/uwu-bot",
    date: "2019-12-17",
    blurb: "OwO ipsum dowow sit amet, consectetuw adipiscing ewit.",
    labels: ["archived"],
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
  },
  {
    title: "express-jwt-boilerplate",
    href: "https://github.com/AugusDogus/express-jwt-boilerplate",
    date: "2019-03-24",
    blurb: "An Express and MongoDB starter with JWT authentication.",
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
      "Yet Another Name Generator, a REST API and frontend for short generated names, plus Mars, a RuneScape dashboard that consumed Yang's output to build account URIs.",
    labels: ["archived"],
  },

  // 2016
  {
    title: "Chivskape",
    href: "https://github.com/AugusDogus/Chivskape",
    date: "2016-12-15",
    blurb:
      "A multiplayer roguelike dungeon crawler in Unity, with a separate socket.io server handling replication.",
    labels: ["archived"],
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
