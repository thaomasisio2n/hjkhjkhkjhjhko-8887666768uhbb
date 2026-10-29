// Response shapes shared by the API (what it returns) and the web app (what
// it expects). Dates travel as ISO strings.
import type { ChatRoom } from "./rules.js";

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  referralCode: string;
  balanceCents: number;
  totpEnabled: boolean;
  ghostMode: boolean;
  /** The published demo login: settings that affect other visitors are read-only. */
  shared: boolean;
  createdAt: string;
}

export interface WalletState {
  balanceCents: number;
  depositLimitCents: number | null;
  depositedTodayCents: number;
}

export interface ChatAuthor {
  id: string;
  displayName: string;
  avatar: string | null;
}

export interface ChatMessage {
  id: string;
  room: ChatRoom;
  body: string;
  createdAt: string;
  mine: boolean;
  /** null when the author is in ghost mode. */
  user: ChatAuthor | null;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface PublicConfig {
  registrationOpen: boolean;
  chatOpen: boolean;
}
