import { createServer } from 'node:http';
import { parse } from 'node:url';
import os from 'node:os';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const sessions = new Map();

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function generateSessionId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Lightweight API endpoint for network discovery
      if (parsedUrl.pathname === '/api/network-info') {
        const ips = getLocalIpAddresses();
        const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(
          JSON.stringify({
            ips,
            primaryIp,
            port,
            hostUrl: `http://${primaryIp}:${port}`,
          })
        );
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling request:', req.url, err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    // 1. Host creates room
    socket.on('room:create', () => {
      let sessionId = generateSessionId();
      while (sessions.has(sessionId)) {
        sessionId = generateSessionId();
      }

      const session = {
        sessionId,
        hostSocketId: socket.id,
        controllerSocketId: null,
        status: 'LOBBY',
        createdAt: Date.now(),
      };

      sessions.set(sessionId, session);
      socket.join(`room:${sessionId}`);
      socket.data.sessionId = sessionId;
      socket.data.role = 'host';

      const ips = getLocalIpAddresses();
      const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';

      socket.emit('room:created', {
        sessionId,
        serverIp: primaryIp,
        port,
        hostUrl: `http://${primaryIp}:${port}`,
      });
      console.log(`[Host] Created room ${sessionId} (Socket: ${socket.id})`);
    });

    // 2. Controller joins room
    socket.on('room:join', ({ sessionId }) => {
      const cleanId = (sessionId || '').toUpperCase().trim();
      const session = sessions.get(cleanId);

      if (!session) {
        socket.emit('room:error', { message: `Room "${cleanId}" not found or expired.` });
        return;
      }

      session.controllerSocketId = socket.id;
      socket.join(`room:${cleanId}`);
      socket.data.sessionId = cleanId;
      socket.data.role = 'controller';

      socket.emit('room:joined', { sessionId: cleanId });
      socket.to(`room:${cleanId}`).emit('controller:connected', { controllerId: socket.id });
      console.log(`[Controller] Joined room ${cleanId} (Socket: ${socket.id})`);
    });

    // 3. Aim motion streaming
    socket.on('motion:aim', (data) => {
      const sessionId = socket.data.sessionId || data.sessionId;
      if (sessionId) {
        socket.to(`room:${sessionId}`).emit('aim:update', data);
      }
    });

    // 4. Trigger fired
    socket.on('controller:trigger', (data) => {
      const sessionId = socket.data.sessionId || data.sessionId;
      if (sessionId) {
        socket.to(`room:${sessionId}`).emit('trigger:fired', data);
      }
    });

    // 5. Calibration completed
    socket.on('controller:calibrated', (data) => {
      const sessionId = socket.data.sessionId || data.sessionId;
      if (sessionId) {
        socket.to(`room:${sessionId}`).emit('controller:calibrated', data);
      }
    });

    // 6. Game commands (Start, Next Level, Restart, Sound toggle)
    socket.on('game:command', (data) => {
      const sessionId = socket.data.sessionId || data.sessionId;
      if (sessionId) {
        socket.to(`room:${sessionId}`).emit('game:sync', data);
      }
    });

    // 7. Disconnect handling
    socket.on('disconnect', () => {
      const { sessionId, role } = socket.data || {};
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        if (role === 'host') {
          io.to(`room:${sessionId}`).emit('host:disconnected');
          sessions.delete(sessionId);
          console.log(`[Host] Disconnected, cleaned room ${sessionId}`);
        } else if (role === 'controller') {
          session.controllerSocketId = null;
          io.to(`room:${sessionId}`).emit('controller:disconnected');
          console.log(`[Controller] Disconnected from room ${sessionId}`);
        }
      }
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log(`\n========================================`);
    console.log(`  Goose Hunter Server Running!`);
    console.log(`  > Local:    http://localhost:${port}`);
    if (ips.length > 0) {
      console.log(`  > Network:  http://${ips[0].address}:${port}`);
    }
    console.log(`========================================\n`);
  });
});
