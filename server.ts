import 'dotenv/config';
import express from 'express';
import { db, hashPassword, calculateHaversineDistance } from './src/server/db';
import { Player, Loft, RacingEvent, EventRegistration, AuditLog, AppNotification } from './src/types';

function normalizeClockingCode(value: string): string {
  return value.trim().toUpperCase();
}

export async function createApiApp() {
  const app = express();

  // Body parser
  app.use(express.json());

  // Simple Request Logging / Debug
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Helper for creating audit log entries
  async function logAction(userId: string, username: string, action: string, details: string) {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      details
    };
    await db.addAuditLog(log);
  }

  // Helper for triggering system notifications
  async function triggerNotification(title: string, message: string, type: 'info' | 'success' | 'warning' | 'error') {
    const notification: AppNotification = {
      id: `NTF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      title,
      message,
      type,
      read: false
    };
    await db.addNotification(notification);
  }

  // --- API ROUTES ---

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required.' });
        return;
      }

      // Check default Administrator
      if (username.toLowerCase() === 'admin' && password === 'adminpassword') {
        const user = {
          id: 'admin-user',
          username: 'admin',
          fullName: 'System Administrator',
          role: 'Administrator' as const
        };
        await logAction(user.id, user.username, 'USER_LOGIN', 'Administrator logged in successfully.');
        res.json({ token: 'mock-admin-jwt', user });
        return;
      }

      // Check players
      const players = await db.getPlayers();
      const player = players.find(p => p.username.toLowerCase() === username.toLowerCase());

      if (player) {
        const hashed = hashPassword(password);
        if (player.passwordHash === hashed) {
          if (player.status === 'Inactive') {
            res.status(403).json({ error: 'Your account is inactive. Please contact the administrator.' });
            return;
          }

          const user = {
            id: player.id,
            username: player.username,
            fullName: player.fullName,
            role: 'Player' as const,
            playerId: player.id
          };

          await logAction(player.id, player.username, 'USER_LOGIN', `Player "${player.fullName}" logged in successfully.`);
          res.json({ token: `mock-player-jwt-${player.id}`, user });
          return;
        }
      }

      res.status(401).json({ error: 'Invalid username or password.' });
    } catch (error: any) {
      console.error('Error in login endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Players Management
  app.get('/api/players', async (req, res) => {
    try {
      const players = await db.getPlayers();
      res.json(players);
    } catch (error: any) {
      console.error('Error in GET players:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/players', async (req, res) => {
    try {
      const { fullName, address, contactNumber, email, username, password, status } = req.body;

      if (!fullName || !username || !password) {
        res.status(400).json({ error: 'Full name, username, and password are required.' });
        return;
      }

      // Check duplicate username
      const players = await db.getPlayers();
      const existing = players.find(p => p.username.toLowerCase() === username.toLowerCase());
      if (existing || username.toLowerCase() === 'admin') {
        res.status(400).json({ error: 'Username is already taken.' });
        return;
      }

      const newPlayer: Player = {
        id: `PLR-${String(players.length + 1).padStart(3, '0')}`,
        fullName,
        address: address || '',
        contactNumber: contactNumber || '',
        email: email || '',
        username,
        passwordHash: hashPassword(password),
        status: status || 'Active',
        createdAt: new Date().toISOString()
      };

      await db.addPlayer(newPlayer);
      await logAction('admin-user', 'admin', 'PLAYER_CREATE', `Created player "${fullName}" (${newPlayer.id}).`);
      await triggerNotification('Player Added', `New player "${fullName}" was successfully registered.`, 'success');
      res.status(211).json(newPlayer);
    } catch (error: any) {
      console.error('Error in POST players:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/players/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, address, contactNumber, email, username, password, status } = req.body;

      const players = await db.getPlayers();
      const existing = players.find(p => p.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Player not found.' });
        return;
      }

      if (username && username.toLowerCase() !== existing.username.toLowerCase()) {
        const duplicate = players.find(p => p.username.toLowerCase() === username.toLowerCase());
        if (duplicate || username.toLowerCase() === 'admin') {
          res.status(400).json({ error: 'Username is already taken.' });
          return;
        }
      }

      const updatedData: Partial<Player> = {
        fullName: fullName || existing.fullName,
        address: address !== undefined ? address : existing.address,
        contactNumber: contactNumber !== undefined ? contactNumber : existing.contactNumber,
        email: email !== undefined ? email : existing.email,
        username: username || existing.username,
        status: status || existing.status,
      };

      if (password) {
        updatedData.passwordHash = hashPassword(password);
      }

      await db.updatePlayer(id, updatedData);
      await logAction('admin-user', 'admin', 'PLAYER_UPDATE', `Updated player "${updatedData.fullName}" details.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in PUT players:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/players/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const players = await db.getPlayers();
      const existing = players.find(p => p.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Player not found.' });
        return;
      }

      await db.deletePlayer(id);
      await logAction('admin-user', 'admin', 'PLAYER_DELETE', `Deleted player "${existing.fullName}" (${id}).`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE players:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Lofts Management
  app.get('/api/lofts', async (req, res) => {
    try {
      const lofts = await db.getLofts();
      res.json(lofts);
    } catch (error: any) {
      console.error('Error in GET lofts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/lofts', async (req, res) => {
    try {
      const { loftName, ownerId, address, latitude, longitude } = req.body;

      if (!loftName || !ownerId || latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'Loft name, owner, latitude, and longitude are required.' });
        return;
      }

      const players = await db.getPlayers();
      const owner = players.find(p => p.id === ownerId);
      if (!owner) {
        res.status(404).json({ error: 'Owner player not found.' });
        return;
      }

      const lofts = await db.getLofts();
      const newLoft: Loft = {
        id: `LFT-${String(lofts.length + 1).padStart(3, '0')}`,
        loftName,
        loftCode: `LFT-${String(lofts.length + 1).padStart(3, '0')}`,
        ownerId,
        ownerName: owner.fullName,
        address: address || '',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        createdAt: new Date().toISOString()
      };

      await db.addLoft(newLoft);
      await logAction('admin-user', 'admin', 'LOFT_CREATE', `Registered loft "${loftName}" for ${owner.fullName}.`);
      res.status(211).json(newLoft);
    } catch (error: any) {
      console.error('Error in POST lofts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/lofts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { loftName, ownerId, address, latitude, longitude } = req.body;

      const lofts = await db.getLofts();
      const existing = lofts.find(l => l.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Loft not found.' });
        return;
      }

      let ownerName = existing.ownerName;
      if (ownerId && ownerId !== existing.ownerId) {
        const players = await db.getPlayers();
        const owner = players.find(p => p.id === ownerId);
        if (!owner) {
          res.status(404).json({ error: 'New owner player not found.' });
          return;
        }
        ownerName = owner.fullName;
      }

      const updatedData: Partial<Loft> = {
        loftName: loftName || existing.loftName,
        ownerId: ownerId || existing.ownerId,
        ownerName,
        address: address !== undefined ? address : existing.address,
        latitude: latitude !== undefined ? parseFloat(latitude) : existing.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : existing.longitude,
      };

      await db.updateLoft(id, updatedData);
      await logAction('admin-user', 'admin', 'LOFT_UPDATE', `Updated loft "${updatedData.loftName}" details.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in PUT lofts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/lofts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const lofts = await db.getLofts();
      const existing = lofts.find(l => l.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Loft not found.' });
        return;
      }

      await db.deleteLoft(id);
      await logAction('admin-user', 'admin', 'LOFT_DELETE', `Deleted loft "${existing.loftName}" (${id}).`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE lofts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Events Management
  app.get('/api/events', async (req, res) => {
    try {
      const events = await db.getEvents();
      res.json(events);
    } catch (error: any) {
      console.error('Error in GET events:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/events', async (req, res) => {
    try {
      const { eventName, raceDate, releasePointName, province, municipality, latitude, longitude, releaseTime, status } = req.body;

      if (!eventName || !raceDate || !releasePointName || latitude === undefined || longitude === undefined || !releaseTime) {
        res.status(400).json({ error: 'Event name, race date, release point, coordinates, and release time are required.' });
        return;
      }

      const events = await db.getEvents();
      const newEvent: RacingEvent = {
        id: `EVT-${String(events.length + 1).padStart(3, '0')}`,
        eventName,
        eventCode: `EVT-2026-${String(events.length + 1).padStart(3, '0')}`,
        raceDate,
        releasePointName,
        province: province || '',
        municipality: municipality || '',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        releaseTime,
        status: status || 'Upcoming',
        createdAt: new Date().toISOString()
      };

      await db.addEvent(newEvent);
      await logAction('admin-user', 'admin', 'EVENT_CREATE', `Created racing event "${eventName}" (${newEvent.eventCode}).`);
      await triggerNotification('Event Created', `A new event "${eventName}" has been scheduled for ${raceDate}.`, 'info');
      res.status(211).json(newEvent);
    } catch (error: any) {
      console.error('Error in POST events:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.put('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { eventName, raceDate, releasePointName, province, municipality, latitude, longitude, releaseTime, status } = req.body;

      const events = await db.getEvents();
      const existing = events.find(e => e.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      const updatedData: Partial<RacingEvent> = {
        eventName: eventName || existing.eventName,
        raceDate: raceDate || existing.raceDate,
        releasePointName: releasePointName || existing.releasePointName,
        province: province !== undefined ? province : existing.province,
        municipality: municipality !== undefined ? municipality : existing.municipality,
        latitude: latitude !== undefined ? parseFloat(latitude) : existing.latitude,
        longitude: longitude !== undefined ? parseFloat(longitude) : existing.longitude,
        releaseTime: releaseTime || existing.releaseTime,
        status: status || existing.status
      };

      const statusChanged = status && status !== existing.status;

      await db.updateEvent(id, updatedData);
      await logAction('admin-user', 'admin', 'EVENT_UPDATE', `Updated event "${updatedData.eventName}" details.`);

      if (statusChanged) {
        await logAction('admin-user', 'admin', 'EVENT_STATUS_CHANGE', `Event "${updatedData.eventName}" status updated to ${status}.`);
        await triggerNotification('Event Status Updated', `Event "${updatedData.eventName}" is now ${status}.`, status === 'Finished' ? 'success' : 'info');
        
        // If finished, recalculate and finalize rankings
        if (status === 'Finished') {
          await db.updateRankings(id);
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in PUT events:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/events/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const events = await db.getEvents();
      const existing = events.find(e => e.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      await db.deleteEvent(id);
      await logAction('admin-user', 'admin', 'EVENT_DELETE', `Deleted event "${existing.eventName}" (${id}).`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE events:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Registrations / Code Generation
  app.get('/api/registrations', async (req, res) => {
    try {
      const registrations = await db.getRegistrations();
      res.json(registrations);
    } catch (error: any) {
      console.error('Error in GET registrations:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/registrations', async (req, res) => {
    try {
      const { eventId, playerId, loftId, ringNumber, clockingCode } = req.body;

      if (!eventId || !playerId || !loftId || !ringNumber || !clockingCode) {
        res.status(400).json({ error: 'Event ID, Player ID, Loft ID, Bird Ring Number, and 8-character clocking code are required.' });
        return;
      }

      const normalizedCode = normalizeClockingCode(clockingCode);
      if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
        res.status(400).json({ error: 'Clocking code must be exactly 8 alphanumeric characters (A-Z, 0-9).' });
        return;
      }

      // Validate Event, Player, Loft
      const events = await db.getEvents();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      const players = await db.getPlayers();
      const player = players.find(p => p.id === playerId);
      if (!player) {
        res.status(404).json({ error: 'Player not found.' });
        return;
      }

      const lofts = await db.getLofts();
      const loft = lofts.find(l => l.id === loftId);
      if (!loft) {
        res.status(404).json({ error: 'Loft not found.' });
        return;
      }

      // Allow multiple birds per loft/event, but prevent duplicate ring entries in the same event.
      const registrations = await db.getRegistrations();
      const duplicateRingInEvent = registrations.find(
        r => r.eventId === eventId && r.ringNumber.toUpperCase() === String(ringNumber).trim().toUpperCase()
      );
      if (duplicateRingInEvent) {
        res.status(400).json({ error: 'This ring number is already registered in the selected event.' });
        return;
      }

      const duplicateCodeInEvent = registrations.find(
        r => r.eventId === eventId && r.clockingCode.toUpperCase() === normalizedCode
      );
      if (duplicateCodeInEvent) {
        res.status(400).json({ error: 'This clocking code is already used in the selected event.' });
        return;
      }

      // Strict rule: active registrations cannot reuse the same full clocking code.
      const activeEventIds = new Set(events.filter(e => e.status !== 'Finished').map(e => e.id));
      const duplicateCodeInActiveRegs = registrations.find(
        r =>
          r.clockingCode.toUpperCase() === normalizedCode &&
          activeEventIds.has(r.eventId)
      );
      if (duplicateCodeInActiveRegs) {
        res.status(400).json({ error: 'This clocking code is already used in an active registration.' });
        return;
      }

      const newReg: EventRegistration = {
        id: `REG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        eventId,
        eventCode: event.eventCode,
        eventName: event.eventName,
        playerId,
        playerName: player.fullName,
        loftId,
        loftName: loft.loftName,
        loftLatitude: loft.latitude,
        loftLongitude: loft.longitude,
        clockingCode: normalizedCode,
        ringNumber,
        status: 'Waiting',
        clockTime: null,
        distance: null,
        elapsedTime: null,
        speed: null,
        rank: null,
        createdAt: new Date().toISOString()
      };

      await db.addRegistration(newReg);
      await logAction('admin-user', 'admin', 'PARTICIPANT_REGISTER', `Registered loft "${loft.loftName}" with Bird Ring #${ringNumber} for player "${player.fullName}" in "${event.eventName}". Assigned Code: ${normalizedCode}`);
      await triggerNotification('Registration Successful', `Loft "${loft.loftName}" (Ring #${ringNumber}) has registered for "${event.eventName}".`, 'success');

      res.status(211).json(newReg);
    } catch (error: any) {
      console.error('Error in POST registrations:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/registrations/import', async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      if (rows.length === 0) {
        res.status(400).json({ error: 'No rows found. Upload a valid Excel file with registration data.' });
        return;
      }

      const events = await db.getEvents();
      const players = await db.getPlayers();
      const lofts = await db.getLofts();
      const registrations = await db.getRegistrations();
      const activeEventIds = new Set(events.filter(e => e.status !== 'Finished').map(e => e.id));

      const stagedRegs: EventRegistration[] = [];
      const workingRegs = [...registrations];
      const errors: string[] = [];

      const getString = (value: any) => String(value ?? '').trim();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || {};
        const rowNumber = i + 2; // +2 because row 1 is usually the header

        const eventIdRaw = getString(row.eventId || row['Event ID'] || row.event_id);
        const eventCodeRaw = getString(row.eventCode || row['Event Code'] || row.event_code);
        const playerIdRaw = getString(row.playerId || row['Player ID'] || row.player_id);
        const usernameRaw = getString(row.username || row['Username'] || row.playerUsername || row.player_username);
        const loftIdRaw = getString(row.loftId || row['Loft ID'] || row.loft_id);
        const loftCodeRaw = getString(row.loftCode || row['Loft Code'] || row.loft_code);
        const ringNumberRaw = getString(row.ringNumber || row['Ring Number'] || row.ring_number);
        const clockingCodeRaw = getString(row.clockingCode || row['Clocking Code'] || row.clocking_code).toUpperCase();

        const event = eventIdRaw
          ? events.find(e => e.id === eventIdRaw)
          : events.find(e => e.eventCode.toUpperCase() === eventCodeRaw.toUpperCase());
        if (!event) {
          errors.push(`Row ${rowNumber}: Event not found. Provide valid eventId or eventCode.`);
          continue;
        }

        const player = playerIdRaw
          ? players.find(p => p.id === playerIdRaw)
          : players.find(p => p.username.toLowerCase() === usernameRaw.toLowerCase());
        if (!player) {
          errors.push(`Row ${rowNumber}: Player not found. Provide valid playerId or username.`);
          continue;
        }

        const loft = loftIdRaw
          ? lofts.find(l => l.id === loftIdRaw)
          : lofts.find(l => l.loftCode.toUpperCase() === loftCodeRaw.toUpperCase());
        if (!loft) {
          errors.push(`Row ${rowNumber}: Loft not found. Provide valid loftId or loftCode.`);
          continue;
        }

        if (loft.ownerId !== player.id) {
          errors.push(`Row ${rowNumber}: Loft does not belong to the selected player.`);
          continue;
        }

        if (!ringNumberRaw) {
          errors.push(`Row ${rowNumber}: Ring number is required.`);
          continue;
        }

        if (!/^[A-Z0-9]{8}$/.test(clockingCodeRaw)) {
          errors.push(`Row ${rowNumber}: Clocking code must be exactly 8 alphanumeric characters.`);
          continue;
        }

        const normalizedRingNumber = ringNumberRaw.toUpperCase();
        const duplicateRingInEvent = workingRegs.find(
          r => r.eventId === event.id && r.ringNumber.toUpperCase() === normalizedRingNumber
        );
        if (duplicateRingInEvent) {
          errors.push(`Row ${rowNumber}: Ring number is already registered in the selected event.`);
          continue;
        }

        const duplicateCodeInEvent = workingRegs.find(
          r => r.eventId === event.id && r.clockingCode.toUpperCase() === clockingCodeRaw
        );
        if (duplicateCodeInEvent) {
          errors.push(`Row ${rowNumber}: Clocking code is already used in the selected event.`);
          continue;
        }

        const duplicateCodeInActive = workingRegs.find(
          r => r.clockingCode.toUpperCase() === clockingCodeRaw && activeEventIds.has(r.eventId)
        );
        if (duplicateCodeInActive) {
          errors.push(`Row ${rowNumber}: Clocking code is already used in an active registration.`);
          continue;
        }

        const newReg: EventRegistration = {
          id: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}-${i}`,
          eventId: event.id,
          eventCode: event.eventCode,
          eventName: event.eventName,
          playerId: player.id,
          playerName: player.fullName,
          loftId: loft.id,
          loftName: loft.loftName,
          loftLatitude: loft.latitude,
          loftLongitude: loft.longitude,
          clockingCode: clockingCodeRaw,
          ringNumber: ringNumberRaw,
          status: 'Waiting',
          clockTime: null,
          distance: null,
          elapsedTime: null,
          speed: null,
          rank: null,
          createdAt: new Date().toISOString()
        };

        stagedRegs.push(newReg);
        workingRegs.push(newReg);
      }

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Import failed. Fix the rows below and upload again.',
          details: errors
        });
        return;
      }

      for (const reg of stagedRegs) {
        await db.addRegistration(reg);
      }

      await logAction(
        'admin-user',
        'admin',
        'PARTICIPANT_IMPORT',
        `Imported ${stagedRegs.length} participant registration(s) via Excel.`
      );

      await triggerNotification(
        'Registration Import Completed',
        `${stagedRegs.length} participant registration(s) were imported via Excel.`,
        'success'
      );

      res.json({ success: true, importedCount: stagedRegs.length });
    } catch (error: any) {
      console.error('Error in POST registrations/import:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.delete('/api/registrations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const registrations = await db.getRegistrations();
      const existing = registrations.find(r => r.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Registration not found.' });
        return;
      }

      await db.deleteRegistration(id);
      await logAction('admin-user', 'admin', 'PARTICIPANT_UNREGISTER', `Removed registration for "${existing.playerName}" in "${existing.eventName}".`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE registrations:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Player clocking process
  app.post('/api/clock', async (req, res) => {
    try {
      const { clockingCode, playerId } = req.body;

      if (!clockingCode || !playerId) {
        res.status(400).json({ error: 'Clocking code and Player ID are required.' });
        return;
      }

      const normalizedClockingCode = String(clockingCode).trim().toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(normalizedClockingCode)) {
        res.status(400).json({ error: 'Clocking code must be exactly 8 alphanumeric characters.' });
        return;
      }

      // 1. Validate registration exists
      const registrations = await db.getRegistrations();
      const reg = registrations.find(r => r.clockingCode.toUpperCase() === normalizedClockingCode);
      if (!reg) {
        res.status(404).json({ error: 'Invalid clocking code. Code does not exist.' });
        return;
      }

      // 2. Validate belongs to logged in player
      if (reg.playerId !== playerId) {
        res.status(403).json({ error: 'Clocking failed. This clocking code belongs to another player.' });
        return;
      }

      // 3. Validate code has not already been clocked
      if (reg.status !== 'Waiting') {
        res.status(400).json({ error: 'Clocking failed. This code has already been clocked.' });
        return;
      }

      // 4. Validate event status is Ongoing
      const events = await db.getEvents();
      const event = events.find(e => e.id === reg.eventId);
      if (!event) {
        res.status(404).json({ error: 'Event details not found.' });
        return;
      }

      if (event.status !== 'Ongoing') {
        res.status(400).json({ error: `Clocking failed. The race event status is "${event.status}". Clocking is only allowed for Ongoing events.` });
        return;
      }

      // Success - clock the pigeon!
      const clockTime = new Date();
      const clockTimeISO = clockTime.toISOString();

      // Retrieve coordinates for Loft and Event Release Point
      const loftLat = reg.loftLatitude;
      const loftLng = reg.loftLongitude;
      const releaseLat = event.latitude;
      const releaseLng = event.longitude;

      // A. Distance in meters using Haversine
      const distanceMeters = calculateHaversineDistance(releaseLat, releaseLng, loftLat, loftLng);

      // B. Calculate Elapsed Time (minutes)
      const releaseDateTime = new Date(`${event.raceDate}T${event.releaseTime}`);
      
      let elapsedMs = clockTime.getTime() - releaseDateTime.getTime();
      if (elapsedMs <= 0) {
        elapsedMs = 1000; // 1 second minimum to avoid division issues
      }
      const elapsedMinutes = parseFloat((elapsedMs / 60000).toFixed(2));

      // C. Calculate Speed (meters / minute)
      const speedMetersPerMinute = parseFloat((distanceMeters / elapsedMinutes).toFixed(2));

      // Update registration data
      const updatedReg: Partial<EventRegistration> = {
        status: 'Clocked',
        clockTime: clockTimeISO,
        distance: distanceMeters,
        elapsedTime: elapsedMinutes,
        speed: speedMetersPerMinute
      };

      // Apply updates and recalculate rankings for this event
      await db.updateRegistration(reg.id, updatedReg);

      // Recalculate rankings immediately!
      await db.updateRankings(reg.eventId);

      // Refresh updated registration to read its assigned rank
      const reloadedRegs = await db.getRegistrations();
      const finalizedReg = reloadedRegs.find(r => r.id === reg.id)!;

      // Log the audit and notification
      await logAction(playerId, reg.playerName, 'PLAYER_CLOCKING', `Player clocked pigeon successfully for event "${event.eventName}". Distance: ${distanceMeters}m, Speed: ${speedMetersPerMinute} m/min, Rank: ${finalizedReg.rank}.`);
      await triggerNotification('Pigeon Clocked!', `${reg.playerName} clocked a pigeon in "${event.eventName}" with speed ${speedMetersPerMinute} m/min!`, 'success');

      res.json({
        success: true,
        data: finalizedReg,
        eventReleaseTime: event.releaseTime
      });
    } catch (error: any) {
      console.error('Error in clocking endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Admin verifies a clocked code
  app.post('/api/registrations/:id/verify', async (req, res) => {
    try {
      const { id } = req.params;
      const regs = await db.getRegistrations();
      const existing = regs.find(r => r.id === id);

      if (!existing) {
        res.status(404).json({ error: 'Registration not found.' });
        return;
      }

      if (existing.status !== 'Clocked') {
        res.status(400).json({ error: `Cannot verify. Current status is ${existing.status}.` });
        return;
      }

      await db.updateRegistration(id, { status: 'Verified' });
      
      await logAction('admin-user', 'admin', 'PARTICIPANT_VERIFY', `Admin verified clocking code ${existing.clockingCode} for ${existing.playerName}.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in verify endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Leaderboard for specific Event
  app.get('/api/leaderboard/:eventId', async (req, res) => {
    try {
      const { eventId } = req.params;
      const events = await db.getEvents();
      const event = events.find(e => e.id === eventId);
      if (!event) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }

      const registrations = await db.getRegistrations();
      const regs = registrations
        .filter(r => r.eventId === eventId && r.status !== 'Waiting')
        .sort((a, b) => (b.speed || 0) - (a.speed || 0));

      res.json({
        event,
        leaderboard: regs
      });
    } catch (error: any) {
      console.error('Error in leaderboard endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Audit Logs
  app.get('/api/audit-logs', async (req, res) => {
    try {
      const auditLogs = await db.getAuditLogs();
      res.json(auditLogs);
    } catch (error: any) {
      console.error('Error in GET audit-logs:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifications = await db.getNotifications();
      res.json(notifications);
    } catch (error: any) {
      console.error('Error in GET notifications:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.post('/api/notifications/read-all', async (req, res) => {
    try {
      await db.markNotificationsRead();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in read-all notifications:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Reports Summaries API
  app.get('/api/reports', async (req, res) => {
    try {
      const players = await db.getPlayers();
      const lofts = await db.getLofts();
      const events = await db.getEvents();
      const registrations = await db.getRegistrations();
      const auditLogs = await db.getAuditLogs();

      res.json({
        playersCount: players.length,
        loftsCount: lofts.length,
        eventsCount: events.length,
        registrationsCount: registrations.length,
        clockedCount: registrations.filter(r => r.status !== 'Waiting').length,
        players,
        lofts,
        events,
        registrations,
        auditLogs
      });
    } catch (error: any) {
      console.error('Error in reports endpoint:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  return app;
}

async function startServer() {
  const app = await createApiApp();
  const PORT = Number(process.env.PORT || 3000);
  const isBuiltRuntime = (process.argv[1] || '').includes('dist');
  const isProduction = process.env.NODE_ENV === 'production' || isBuiltRuntime;
  const path = await import('path');

  // --- VITE / STATIC FILE MIDDLEWARE ---

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pigeon Racing Clocking System running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
