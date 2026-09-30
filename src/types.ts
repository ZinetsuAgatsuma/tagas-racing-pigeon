export type PlayerStatus = 'Pending' | 'Active' | 'Inactive';
export type EventStatus = 'Upcoming' | 'Ongoing' | 'Finished';
export type ClockingStatus = 'Waiting' | 'Clocked' | 'Verified';

export interface Player {
  id: string; // Player ID (e.g. PLR-001)
  fullName: string;
  address: string;
  contactNumber: string;
  email: string;
  username: string;
  passwordHash: string;
  status: PlayerStatus;
  loftName: string | null;
  registrationPhoto: string | null; // Live JPEG data URL stamped with GPS
  photoLatitude: number | null;
  photoLongitude: number | null;
  photoAccuracyMeters: number | null;
  photoTakenAt: string | null;
  createdAt: string;
}

export interface Loft {
  id: string;
  loftName: string;
  loftCode: string; // e.g. LFT-001
  ownerId: string; // Player ID
  ownerName: string; // Cached for easy listing
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface RacingEvent {
  id: string;
  eventName: string;
  eventCode: string; // e.g. EVT-2026-0001
  raceDate: string; // YYYY-MM-DD
  releasePointName: string;
  province: string;
  municipality: string;
  latitude: number;
  longitude: number;
  releaseTime: string; // "HH:MM:SS" (24h)
  status: EventStatus;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  eventCode: string;
  eventName: string;
  playerId: string;
  playerName: string;
  loftId: string;
  loftName: string;
  loftLatitude: number;
  loftLongitude: number;
  clockingCode: string; // Admin-assigned 8-character code (e.g. ABC12345)
  ringNumber: string; // Ring number of the bird/pigeon
  status: ClockingStatus;
  clockTime: string | null; // ISO Timestamp or "YYYY-MM-DD HH:MM:SS"
  distance: number | null; // meters
  elapsedTime: number | null; // minutes
  speed: number | null; // meters/minute
  rank: number | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  role: 'Administrator' | 'Player';
  playerId?: string; // If role is Player, references Player.id
}
