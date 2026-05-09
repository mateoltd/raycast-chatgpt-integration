import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import {
  getOAuthApiKey,
  type OAuthCredentials,
} from "@mariozechner/pi-ai/oauth";
import { credentialsPath, PROVIDER_ID } from "./paths.js";
import { ensureAppDir } from "./config.js";

const execFileAsync = promisify(execFile);
const SERVICE = "raycast-chatgpt-provider";
const ACCOUNT = "openai-codex";

export type StoredCredentials = OAuthCredentials & {
  type: "oauth";
  provider: "openai-codex";
  email?: string;
};

function serialize(credentials: StoredCredentials): string {
  return JSON.stringify(credentials);
}

function parse(raw: string): StoredCredentials {
  const parsed = JSON.parse(raw) as StoredCredentials;
  if (
    !parsed ||
    parsed.type !== "oauth" ||
    parsed.provider !== "openai-codex"
  ) {
    throw new Error(
      "Stored credentials are not OpenAI Codex OAuth credentials.",
    );
  }
  return parsed;
}

async function readFromMacKeychain(): Promise<StoredCredentials | null> {
  if (process.platform !== "darwin") {
    return null;
  }
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s",
      SERVICE,
      "-a",
      ACCOUNT,
      "-w",
    ]);
    return parse(stdout.trim());
  } catch {
    return null;
  }
}

async function writeToMacKeychain(
  credentials: StoredCredentials,
): Promise<boolean> {
  if (process.platform !== "darwin") {
    return false;
  }
  try {
    await execFileAsync("security", [
      "add-generic-password",
      "-U",
      "-s",
      SERVICE,
      "-a",
      ACCOUNT,
      "-w",
      serialize(credentials),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function readFromFile(): Promise<StoredCredentials | null> {
  try {
    return parse(await fs.readFile(credentialsPath(), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeToFile(credentials: StoredCredentials): Promise<void> {
  await ensureAppDir();
  await fs.writeFile(credentialsPath(), serialize(credentials), {
    mode: 0o600,
  });
}

export async function readCredentials(): Promise<StoredCredentials | null> {
  return (await readFromMacKeychain()) ?? (await readFromFile());
}

export async function writeCredentials(
  credentials: StoredCredentials,
): Promise<void> {
  if (!(await writeToMacKeychain(credentials))) {
    await writeToFile(credentials);
  }
}

export async function removeCredentials(): Promise<void> {
  if (process.platform === "darwin") {
    await execFileAsync("security", [
      "delete-generic-password",
      "-s",
      SERVICE,
      "-a",
      ACCOUNT,
    ]).catch(() => undefined);
  }
  await fs.rm(credentialsPath(), { force: true });
}

export async function resolveAccessToken(): Promise<string> {
  const credentials = await readCredentials();
  if (!credentials) {
    throw new Error(
      "Not signed in. Run the Raycast command: Sign In with ChatGPT.",
    );
  }
  if (Date.now() < credentials.expires && credentials.access) {
    return credentials.access;
  }
  const refreshed = await getOAuthApiKey("openai-codex", {
    "openai-codex": credentials,
  });
  if (!refreshed) {
    throw new Error("OpenAI OAuth token refresh failed.");
  }
  await writeCredentials({
    ...credentials,
    ...refreshed.newCredentials,
    type: "oauth",
    provider: "openai-codex",
  });
  return refreshed.apiKey;
}

export function redactedCredentialSummary(
  credentials: StoredCredentials | null,
): string {
  if (!credentials) {
    return "Not signed in";
  }
  const expires = Number.isFinite(credentials.expires)
    ? new Date(credentials.expires).toLocaleString()
    : "unknown";
  return `${credentials.email ?? PROVIDER_ID} expires ${expires}`;
}
