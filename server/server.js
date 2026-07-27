/* Kings & Peasants — multiplayer server (Phase 2)
   Server-authoritative rooms over WebSocket. The server holds the only true game
   state, applies every action through the shared engine, drives the bots, enforces
   move clocks, and sends each player a personalized state with OTHER hands redacted.

   Deploy: any Node 18+ host (Railway). Listens on process.env.PORT (default 8080).
*/
"use strict";
const http = require("http");
const { WebSocketServer } = require("ws");
const E = require("./engine.cjs");

const PORT = process.env.PORT || 8080;
const BOT_DELAY = { fast: 850, normal: 1500, slow: 2400 };
const MOVE_CLOCK_MS = 15000;      // human with legal plays
const FORCED_PASS_MS = 5000;      // human with no legal play
const HUMAN_TAX_MS = 30000;       // human taxation decision before auto-resolve
const REVOLT_MS = 20000;          // human revolution decision before auto-decline
const ROUND_BREAK_MS = 8000;      // pause on the standings sheet between rounds
const EMPTY_ROOM_TTL = 5 * 60 * 1000;

const rooms = new Map();          // code -> room
const socketsMeta = new Map();    // ws -> { playerId, name, code }

const code4 = () => { let c = ""; const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; for (let i = 0; i < 4; i++) c += A[(Math.random() * A.length) | 0]; return rooms.has(c) ? code4() : c; };
const now = () => Date.now();

function makeRoom(hostProfile, settings) {
  const code = code4();
  const room = {
    code,
    status: "open",                 // open | playing
    host: hostProfile.id,
    players: [{ id: hostProfile.id, name: hostProfile.name, avatar: hostProfile.avatar || null, bot: false, royal: hostProfile.royal || "majesty" }],
    settings: { rounds: Math.max(1, Math.min(12, settings?.rounds || 3)), botSpeed: BOT_DELAY[settings?.botSpeed] ? settings.botSpeed : "fast" },
    st: null,
    sockets: new Map(),             // playerId -> ws
    timers: {},                     // named timeouts
    emptySince: null,
  };
  rooms.set(code, room);
  return room;
}

function clearTimers(room) { for (const k of Object.keys(room.timers)) { clearTimeout(room.timers[k]); delete room.timers[k]; } }
function later(room, key, ms, fn) { clearTimeout(room.timers[key]); room.timers[key] = setTimeout(() => { delete room.timers[key]; try { fn(); } catch (e) { console.error("timer", key, e); } }, ms); }

function lobbyView(room) {
  return { code: room.code, status: room.status, host: room.host, settings: room.settings,
    players: room.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, bot: !!p.bot, diff: p.diff, royal: p.royal })) };
}

function redactedState(room, forPlayerId) {
  const st = room.st; if (!st) return null;
  const out = JSON.parse(JSON.stringify(st));
  st.players.forEach((p, idx) => {
    if (p.id !== forPlayerId && out.hands && out.hands[idx]) out.hands[idx] = out.hands[idx].map(() => 0);
  });
  return out;
}

function send(ws, msg) { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); } catch {} }
function broadcastLobby(room) { for (const ws of room.sockets.values()) send(ws, { t: "lobby", lobby: lobbyView(room) }); }
function broadcastState(room) {
  for (const [pid, ws] of room.sockets) send(ws, { t: "state", st: redactedState(room, pid) });
}

/* ---------------- game driving: bots, clocks, taxation, revolts ---------------- */

function schedule(room) {
  clearTimers(room);
  const st = room.st; if (!st) return;

  if (st.phase === "roundEnd") {
    if (st.round < st.settings.rounds) later(room, "round", ROUND_BREAK_MS, () => advanceRound(room));
    return;
  }
  if (st.phase === "matchEnd") { room.status = "open"; broadcastLobby(room); return; }

  if (st.phase === "revolt" && st.revolt) {
    const chooser = st.players[st.revolt.pIdx];
    if (chooser.bot) {
      // bots decline unless the revolution is Greater (they sit as the Peasant)
      const greater = st.revolt.greater === true;
      later(room, "revolt", 900, () => { room.st = E.resolveRevolt(room.st, greater); afterChange(room); });
    } else {
      later(room, "revolt", REVOLT_MS, () => { room.st = E.resolveRevolt(room.st, false); afterChange(room); });
    }
    return;
  }

  if (st.phase === "tax" && st.tax) {
    const payIdx = st.tax.findIndex((e) => !e.taken);
    if (payIdx >= 0) {
      const giver = st.players[st.tax[payIdx].giver];
      const ms = giver.bot ? 1300 : HUMAN_TAX_MS;
      later(room, "tax", ms, () => {
        const cur = room.st; if (!cur || cur.phase !== "tax") return;
        const i = cur.tax.findIndex((e) => !e.taken); if (i < 0) return;
        room.st = E.resolveTaxPayment(cur, i, cur.hands[cur.tax[i].giver].slice(0, cur.tax[i].k));
        afterChange(room);
      });
      return;
    }
    const retIdx = st.tax.findIndex((e) => e.taken && !e.returned);
    if (retIdx >= 0) {
      const taker = st.players[st.tax[retIdx].taker];
      const ms = taker.bot ? 1300 : HUMAN_TAX_MS;
      later(room, "tax", ms, () => {
        const cur = room.st; if (!cur || cur.phase !== "tax") return;
        const i = cur.tax.findIndex((e) => e.taken && !e.returned); if (i < 0) return;
        room.st = E.resolveTaxReturn(cur, i, E.botTaxPick(cur.hands[cur.tax[i].taker], cur.tax[i].k));
        afterChange(room);
      });
    }
    return;
  }

  if (st.phase === "play") {
    const pIdx = st.seatOrder[st.turn];
    const p = st.players[pIdx];
    if (p.bot) {
      later(room, "bot", BOT_DELAY[st.settings.botSpeed] || 850, () => {
        const cur = room.st; if (!cur || cur.phase !== "play") return;
        room.st = E.applyAction(cur, E.botChoose(cur, p.diff || "knight"));
        afterChange(room);
      });
    } else {
      const noPlay = E.legalPlays(st.hands[pIdx], st.trick, st.round === 1).length === 0;
      later(room, "clock", noPlay ? FORCED_PASS_MS : MOVE_CLOCK_MS, () => {
        const cur = room.st; if (!cur || cur.phase !== "play") return;
        if (cur.seatOrder[cur.turn] !== pIdx) return;
        room.st = E.applyAction(cur, { type: "pass" });
        afterChange(room);
      });
    }
  }
}

function advanceRound(room) { if (!room.st) return; room.st = E.startRound(room.st); afterChange(room); }
function afterChange(room) { broadcastState(room); schedule(room); }

/* ---------------- message handling ---------------- */

function handle(ws, msg) {
  const meta = socketsMeta.get(ws);
  if (msg.t === "hello") {
    const p = msg.profile || {};
    if (!p.id || typeof p.id !== "string") return send(ws, { t: "error", msg: "bad profile" });
    socketsMeta.set(ws, { playerId: p.id, name: String(p.name || "Traveler").slice(0, 24), avatar: typeof p.avatar === "string" && p.avatar.length < 40000 ? p.avatar : null, royal: ["majesty","king","queen"].includes(p.royal) ? p.royal : "majesty", code: meta?.code || null });
    // reattach to a room they were in (reconnect)
    for (const room of rooms.values()) {
      if (room.players.some((pl) => pl.id === p.id && !pl.bot)) {
        room.sockets.set(p.id, ws);
        socketsMeta.get(ws).code = room.code;
        send(ws, { t: "lobby", lobby: lobbyView(room) });
        if (room.status === "playing") { send(ws, { t: "started", code: room.code }); send(ws, { t: "state", st: redactedState(room, p.id) }); }
        return;
      }
    }
    return send(ws, { t: "hi" });
  }
  if (!meta || !meta.playerId) return send(ws, { t: "error", msg: "say hello first" });
  const profile = { id: meta.playerId, name: meta.name, avatar: meta.avatar, royal: meta.royal };

  if (msg.t === "browse") {
    const list = [...rooms.values()].filter((r) => r.status === "open")
      .map((r) => ({ code: r.code, count: r.players.length, rounds: r.settings.rounds, hostName: r.players.find((p) => p.id === r.host)?.name || "?" }));
    return send(ws, { t: "lobbies", list });
  }

  if (msg.t === "create") {
    leaveRoom(ws, meta);
    const room = makeRoom(profile, msg.settings);
    room.sockets.set(profile.id, ws); meta.code = room.code;
    return send(ws, { t: "lobby", lobby: lobbyView(room) });
  }

  if (msg.t === "join") {
    const room = rooms.get(String(msg.code || "").toUpperCase());
    if (!room) return send(ws, { t: "error", msg: "No lobby with that code." });
    const already = room.players.some((p) => p.id === profile.id && !p.bot);
    if (!already) {
      if (room.status !== "open") return send(ws, { t: "error", msg: "That table is mid-game." });
      if (room.players.length >= 10) return send(ws, { t: "error", msg: "That table is full." });
      leaveRoom(ws, meta);                       // leaving some OTHER room only
      room.players.push({ ...profile, bot: false });
    } else if (meta.code && meta.code !== room.code) {
      leaveRoom(ws, meta);                       // switching rooms: leave the old one
    }
    // members re-joining are a refresh/reattach — never a leave
    room.sockets.set(profile.id, ws); meta.code = room.code; room.emptySince = null;
    broadcastLobby(room);
    if (room.status === "playing") { send(ws, { t: "started", code: room.code }); send(ws, { t: "state", st: redactedState(room, profile.id) }); }
    return;
  }

  const room = meta.code ? rooms.get(meta.code) : null;
  if (!room) return send(ws, { t: "error", msg: "not in a room" });
  const isHost = room.host === profile.id;

  if (msg.t === "leave") { leaveRoom(ws, meta); return send(ws, { t: "left" }); }

  if (room.status === "open") {
    if (msg.t === "addBot" && isHost && room.players.length < 10) {
      const diff = ["squire","knight","royal"].includes(msg.diff) ? msg.diff : "knight";
      const names = ["Aldric","Berta","Cedric","Duna","Edda","Falko","Greta","Hobb","Ilsa","Jorun"];
      const name = names.find((n) => !room.players.some((p) => p.name === n)) || "Bot" + room.players.length;
      room.players.push({ id: "bot-" + Math.random().toString(36).slice(2, 8), name, avatar: null, bot: true, diff, royal: Math.random() < 0.5 ? "king" : "queen" });
      return broadcastLobby(room);
    }
    if (msg.t === "kick" && isHost) {
      const i = msg.idx | 0;
      if (i > 0 || (room.players[i] && room.players[i].bot)) {
        const gone = room.players.splice(i, 1)[0];
        if (gone && !gone.bot) { const s = room.sockets.get(gone.id); room.sockets.delete(gone.id); send(s, { t: "kicked" }); }
        return broadcastLobby(room);
      }
      return;
    }
    if (msg.t === "settings" && isHost) {
      const p = msg.patch || {};
      if (p.rounds) room.settings.rounds = Math.max(1, Math.min(12, p.rounds | 0));
      if (BOT_DELAY[p.botSpeed]) room.settings.botSpeed = p.botSpeed;
      return broadcastLobby(room);
    }
    if (msg.t === "start" && isHost) {
      if (room.players.length < 2) return send(ws, { t: "error", msg: "Need at least 2 players." });
      room.status = "playing";
      room.st = E.makeMatch(E.shuffle(room.players.map((p) => ({ ...p }))), room.settings, "online", room.code);
      for (const [pid, s] of room.sockets) send(s, { t: "started", code: room.code });
      afterChange(room);
      return;
    }
    return;
  }

  /* in-game messages */
  const st = room.st; if (!st) return;
  const myIdx = st.players.findIndex((p) => p.id === profile.id);
  if (myIdx < 0) return;

  if (msg.t === "action" && st.phase === "play") {
    if (st.seatOrder[st.turn] !== myIdx) return send(ws, { t: "error", msg: "Not your turn." });
    const a = msg.action || {};
    const action = a.type === "pass" ? { type: "pass" } : { type: "play", rank: a.rank | 0, count: a.count | 0 };
    const next = E.applyAction(st, action);
    if (next.version === st.version) return send(ws, { t: "error", msg: "Illegal play." });
    room.st = next; return afterChange(room);
  }
  if (msg.t === "revolt" && st.phase === "revolt" && st.revolt && st.revolt.pIdx === myIdx) {
    room.st = E.resolveRevolt(st, !!msg.accept); return afterChange(room);
  }
  if (msg.t === "taxPay" && st.phase === "tax") {
    const i = st.tax.findIndex((e) => !e.taken && e.giver === myIdx);
    if (i < 0) return;
    const next = E.resolveTaxPayment(st, i, Array.isArray(msg.cards) ? msg.cards : []);
    if (next.version === st.version) return send(ws, { t: "error", msg: "Those cards can't be paid." });
    room.st = next; return afterChange(room);
  }
  if (msg.t === "taxReturn" && st.phase === "tax") {
    const i = st.tax.findIndex((e) => e.taken && !e.returned && e.taker === myIdx);
    if (i < 0) return;
    const next = E.resolveTaxReturn(st, i, Array.isArray(msg.cards) ? msg.cards : []);
    if (next.version === st.version) return send(ws, { t: "error", msg: "Those cards can't be returned." });
    room.st = next; return afterChange(room);
  }
  if (msg.t === "nextRound" && st.phase === "roundEnd" && isHost) {
    clearTimeout(room.timers.round); delete room.timers.round;
    return advanceRound(room);
  }
}

function leaveRoom(ws, meta) {
  if (!meta || !meta.code) return;
  const room = rooms.get(meta.code);
  meta.code = null;
  if (!room) return;
  room.sockets.delete(meta.playerId);
  if (room.status === "open") {
    room.players = room.players.filter((p) => p.id !== meta.playerId);
    if (room.players.filter((p) => !p.bot).length === 0) { clearTimers(room); rooms.delete(room.code); return; }
    if (room.host === meta.playerId) room.host = (room.players.find((p) => !p.bot) || room.players[0]).id;
    broadcastLobby(room);
  } else {
    // mid-game: player stays seated; the move clock passes for them until they return
    if (room.sockets.size === 0) room.emptySince = now();
  }
}

/* ---------------- wire it up ---------------- */

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Kings & Peasants server — " + rooms.size + " room(s) at court.\n");
});
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  socketsMeta.set(ws, { playerId: null, code: null });
  ws.on("message", (data) => {
    let msg; try { msg = JSON.parse(data); } catch { return; }
    try { handle(ws, msg); } catch (e) { console.error("handle", e); send(ws, { t: "error", msg: "server error" }); }
  });
  ws.on("close", () => { const meta = socketsMeta.get(ws); if (meta && meta.code) { const room = rooms.get(meta.code); if (room) { room.sockets.delete(meta.playerId); if (room.status === "open") leaveRoom(ws, meta); else if (room.sockets.size === 0) room.emptySince = now(); } } socketsMeta.delete(ws); });
});

setInterval(() => {  // garbage-collect abandoned rooms
  for (const room of rooms.values()) {
    if (room.emptySince && now() - room.emptySince > EMPTY_ROOM_TTL) { clearTimers(room); rooms.delete(room.code); }
  }
}, 60000);

server.listen(PORT, () => console.log("Kings & Peasants server listening on :" + PORT));
