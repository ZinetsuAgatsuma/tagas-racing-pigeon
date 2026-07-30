import crypto from 'crypto';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import { Player, Loft, RacingEvent, EventRegistration, AuditLog, AppNotification } from '../types';

dotenv.config({ path: '.env' });
dotenv.config();

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let connectionPromise: Promise<Db | null> | null = null;

function getMongoConfig() {
  return {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'pigeon-racing'
  };
}

// Lazy initialization of MongoDB client to prevent crashing on startup
async function getMongoDb(): Promise<Db | null> {
  const { uri, dbName } = getMongoConfig();

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Configure it in .env.');
  }
  if (mongoDb) {
    return mongoDb;
  }
  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        console.log('Connecting to MongoDB database...');
        mongoClient = new MongoClient(uri);
        await mongoClient.connect();
        mongoDb = mongoClient.db(dbName);
        console.log(`Successfully connected to MongoDB database: ${dbName}`);
      } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        throw new Error('MongoDB connection failed. Check MONGODB_URI and network access.');
      }
      return mongoDb;
    })();
  }
  return connectionPromise;
}

// Helper to hash passwords using native Node crypto
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Distance calculation using the Haversine Formula
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return parseFloat((R * c).toFixed(2)); // Distance in meters
}

/** Philippines has no DST; race times are always Asia/Manila (UTC+8). */
export const RACE_TIMEZONE_OFFSET = '+08:00';

/**
 * Parse event race date + release time as an absolute Asia/Manila datetime.
 * Avoids server-local timezone bugs (e.g. Vercel UTC) that made elapsed time ~0.02 min.
 */
export function parseRaceReleaseDateTime(raceDate: string | Date, releaseTime: string): Date {
  let datePart: string;
  if (raceDate instanceof Date) {
    datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(raceDate);
  } else {
    const raw = String(raceDate).trim();
    const isoDate = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!isoDate) {
      throw new Error(`Invalid race date: ${raceDate}`);
    }
    datePart = isoDate[1];
  }

  const timeMatch = String(releaseTime).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!timeMatch) {
    throw new Error(`Invalid release time: ${releaseTime}`);
  }

  const hours = timeMatch[1].padStart(2, '0');
  const minutes = timeMatch[2];
  const seconds = (timeMatch[3] || '00').padStart(2, '0');

  const releaseDateTime = new Date(
    `${datePart}T${hours}:${minutes}:${seconds}${RACE_TIMEZONE_OFFSET}`
  );

  if (Number.isNaN(releaseDateTime.getTime())) {
    throw new Error(`Could not parse release datetime from ${datePart} ${releaseTime}`);
  }

  return releaseDateTime;
}

/** Elapsed flight time in minutes from release to clock. */
export function calculateElapsedMinutes(releaseDateTime: Date, clockTime: Date): number {
  const elapsedMs = clockTime.getTime() - releaseDateTime.getTime();
  if (elapsedMs <= 0) {
    throw new Error('Clocking failed. Clock time is before the official release time.');
  }
  return elapsedMs / 60000;
}

// Interfaces for our database schema
export interface DatabaseSchema {
  players: Player[];
  lofts: Loft[];
  events: RacingEvent[];
  registrations: EventRegistration[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

const getInitialSeedData = (): DatabaseSchema => ({
  players: [],
  lofts: [],
  events: [],
  registrations: [],
  auditLogs: [],
  notifications: []
});

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = getInitialSeedData();
  }

  // Load from db.json if exists
  private load() {
    // MongoDB-only mode: file persistence disabled.
  }

  // Save to db.json
  public save() {
    // MongoDB-only mode: file persistence disabled.
  }

  // Database Accessors
  public async getPlayers(): Promise<Player[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<Player>('players').find({}).toArray();
    }
    return this.data.players;
  }

  public async getLofts(): Promise<Loft[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<Loft>('lofts').find({}).toArray();
    }
    return this.data.lofts;
  }

  public async getEvents(): Promise<RacingEvent[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<RacingEvent>('events').find({}).toArray();
    }
    return this.data.events;
  }

  public async getRegistrations(): Promise<EventRegistration[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<EventRegistration>('registrations').find({}).toArray();
    }
    return this.data.registrations;
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<AuditLog>('auditLogs').find({}).sort({ timestamp: -1 }).toArray();
    }
    return this.data.auditLogs;
  }

  public async getNotifications(): Promise<AppNotification[]> {
    const mongo = await getMongoDb();
    if (mongo) {
      return await mongo.collection<AppNotification>('notifications').find({}).sort({ timestamp: -1 }).toArray();
    }
    return this.data.notifications;
  }

  // Insert/Update methods
  public async addPlayer(player: Player): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Player>('players').insertOne(player);
    } else {
      this.data.players.push(player);
      this.save();
    }
  }

  public async updatePlayer(id: string, updated: Partial<Player>): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Player>('players').updateOne({ id }, { $set: updated });
    } else {
      this.data.players = this.data.players.map(p => p.id === id ? { ...p, ...updated } : p);
      this.save();
    }
  }

  public async deletePlayer(id: string): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Player>('players').deleteOne({ id });
      await mongo.collection<Loft>('lofts').deleteMany({ ownerId: id });
      await mongo.collection<EventRegistration>('registrations').deleteMany({ playerId: id });
    } else {
      this.data.players = this.data.players.filter(p => p.id !== id);
      this.data.lofts = this.data.lofts.filter(l => l.ownerId !== id);
      this.data.registrations = this.data.registrations.filter(r => r.playerId !== id);
      this.save();
    }
  }

  public async addLoft(loft: Loft): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Loft>('lofts').insertOne(loft);
    } else {
      this.data.lofts.push(loft);
      this.save();
    }
  }

  public async updateLoft(id: string, updated: Partial<Loft>): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Loft>('lofts').updateOne({ id }, { $set: updated });
      const updateDoc: any = {};
      if (updated.loftName) updateDoc.loftName = updated.loftName;
      if (updated.latitude !== undefined) updateDoc.loftLatitude = updated.latitude;
      if (updated.longitude !== undefined) updateDoc.loftLongitude = updated.longitude;
      
      if (Object.keys(updateDoc).length > 0) {
        await mongo.collection<EventRegistration>('registrations').updateMany({ loftId: id }, { $set: updateDoc });
      }
    } else {
      this.data.lofts = this.data.lofts.map(l => l.id === id ? { ...l, ...updated } : l);
      this.data.registrations = this.data.registrations.map(r => {
        if (r.loftId === id) {
          return {
            ...r,
            loftName: updated.loftName || r.loftName,
            loftLatitude: updated.latitude !== undefined ? updated.latitude : r.loftLatitude,
            loftLongitude: updated.longitude !== undefined ? updated.longitude : r.loftLongitude
          };
        }
        return r;
      });
      this.save();
    }
  }

  public async deleteLoft(id: string): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<Loft>('lofts').deleteOne({ id });
      await mongo.collection<EventRegistration>('registrations').deleteMany({ loftId: id });
    } else {
      this.data.lofts = this.data.lofts.filter(l => l.id !== id);
      this.data.registrations = this.data.registrations.filter(r => r.loftId !== id);
      this.save();
    }
  }

  public async addEvent(event: RacingEvent): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<RacingEvent>('events').insertOne(event);
    } else {
      this.data.events.push(event);
      this.save();
    }
  }

  public async updateEvent(id: string, updated: Partial<RacingEvent>): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<RacingEvent>('events').updateOne({ id }, { $set: updated });
      if (updated.eventName || updated.eventCode) {
        const updateDoc: any = {};
        if (updated.eventName) updateDoc.eventName = updated.eventName;
        if (updated.eventCode) updateDoc.eventCode = updated.eventCode;
        await mongo.collection<EventRegistration>('registrations').updateMany({ eventId: id }, { $set: updateDoc });
      }
    } else {
      this.data.events = this.data.events.map(e => e.id === id ? { ...e, ...updated } : e);
      if (updated.eventName || updated.eventCode) {
        this.data.registrations = this.data.registrations.map(r => {
          if (r.eventId === id) {
            return {
              ...r,
              eventName: updated.eventName || r.eventName,
              eventCode: updated.eventCode || r.eventCode
            };
          }
          return r;
        });
      }
      this.save();
    }
  }

  public async deleteEvent(id: string): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<RacingEvent>('events').deleteOne({ id });
      await mongo.collection<EventRegistration>('registrations').deleteMany({ eventId: id });
    } else {
      this.data.events = this.data.events.filter(e => e.id !== id);
      this.data.registrations = this.data.registrations.filter(r => r.eventId !== id);
      this.save();
    }
  }

  public async addRegistration(registration: EventRegistration): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<EventRegistration>('registrations').insertOne(registration);
    } else {
      this.data.registrations.push(registration);
      this.save();
    }
  }

  public async updateRegistration(id: string, updated: Partial<EventRegistration>): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<EventRegistration>('registrations').updateOne({ id }, { $set: updated });
    } else {
      this.data.registrations = this.data.registrations.map(r => r.id === id ? { ...r, ...updated } : r);
      this.save();
    }
  }

  public async deleteRegistration(id: string): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<EventRegistration>('registrations').deleteOne({ id });
    } else {
      this.data.registrations = this.data.registrations.filter(r => r.id !== id);
      this.save();
    }
  }

  public async addAuditLog(log: AuditLog): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<AuditLog>('auditLogs').insertOne(log);
    } else {
      this.data.auditLogs.unshift(log);
      this.save();
    }
  }

  public async addNotification(notification: AppNotification): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<AppNotification>('notifications').insertOne(notification);
    } else {
      this.data.notifications.unshift(notification);
      this.save();
    }
  }

  public async markNotificationsRead(): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      await mongo.collection<AppNotification>('notifications').updateMany({}, { $set: { read: true } });
    } else {
      this.data.notifications = this.data.notifications.map(n => ({ ...n, read: true }));
      this.save();
    }
  }

  public async updateRankings(eventId: string): Promise<void> {
    const mongo = await getMongoDb();
    if (mongo) {
      const eventRegs = await mongo.collection<EventRegistration>('registrations').find({ eventId }).toArray();
      
      const clocked = eventRegs.filter(r => r.status === 'Clocked' || r.status === 'Verified');
      const waiting = eventRegs.filter(r => r.status === 'Waiting');

      clocked.sort((a, b) => (b.speed || 0) - (a.speed || 0));

      for (let i = 0; i < clocked.length; i++) {
        await mongo.collection<EventRegistration>('registrations').updateOne({ id: clocked[i].id }, { $set: { rank: i + 1 } });
      }

      for (let i = 0; i < waiting.length; i++) {
        await mongo.collection<EventRegistration>('registrations').updateOne({ id: waiting[i].id }, { $set: { rank: null } });
      }
    } else {
      const event = this.data.events.find(e => e.id === eventId);
      if (!event) return;

      const eventRegs = this.data.registrations.filter(r => r.eventId === eventId);
      const clocked = eventRegs.filter(r => r.status === 'Clocked' || r.status === 'Verified');
      const waiting = eventRegs.filter(r => r.status === 'Waiting');

      clocked.sort((a, b) => (b.speed || 0) - (a.speed || 0));

      clocked.forEach((r, idx) => {
        r.rank = idx + 1;
      });

      waiting.forEach(r => {
        r.rank = null;
      });

      const otherRegs = this.data.registrations.filter(r => r.eventId !== eventId);
      this.data.registrations = [...otherRegs, ...clocked, ...waiting];
      this.save();
    }
  }
}

// Export a single database instance
export const db = new Database();
