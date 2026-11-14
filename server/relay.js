// Minimal signaling relay for Vidra: forwards JSON messages between clients in the same room.
// It never sees audio or video (that goes peer to peer). Run: npm i ws && node server/relay.js
// Then build the app with EXPO_PUBLIC_SIGNALING_URL=ws://your-host:8787
const { WebSocketServer } = require('ws');

const port = Number(process.env.PORT || 8787);
const rooms = new Map();
const wss = new WebSocketServer({ port });

wss.on('connection', (ws, req) => {
  const room = new URL(req.url, 'http://x').searchParams.get('room') || '';
  if (!/^[a-z-]{3,40}$/.test(room)) return ws.close(1008, 'bad room');
  if (!rooms.has(room)) rooms.set(room, new Set());
  const peers = rooms.get(room);
  if (peers.size >= 8) return ws.close(1013, 'room full');
  peers.add(ws);
  ws.on('message', (data) => {
    if (data.length > 64 * 1024) return;
    for (const p of peers) if (p !== ws && p.readyState === 1) p.send(data.toString());
  });
  ws.on('close', () => {
    peers.delete(ws);
    if (!peers.size) rooms.delete(room);
  });
});

console.log(`Vidra relay listening on :${port}`);
