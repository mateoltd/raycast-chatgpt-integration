/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Proxy Port - Localhost port used by the OpenAI-compatible proxy. */
  "proxyPort": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `sign-in` command */
  export type SignIn = ExtensionPreferences & {}
  /** Preferences accessible in the `install-provider` command */
  export type InstallProvider = ExtensionPreferences & {}
  /** Preferences accessible in the `proxy-status` command */
  export type ProxyStatus = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `sign-in` command */
  export type SignIn = {}
  /** Arguments passed to the `install-provider` command */
  export type InstallProvider = {}
  /** Arguments passed to the `proxy-status` command */
  export type ProxyStatus = {}
}

