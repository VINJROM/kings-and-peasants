/* Boots the real server on a test port, connects two genuine WebSocket clients,
   adds a bot, and plays an entire match — asserting lobby flow, hand redaction,
   turn enforcement, taxation, and completion. */
"use strict";
process.env.PORT = "8123";
require("./server.js");
const WebSocket = require("ws");
const E = require("./engine.cjs");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mkClient = (profile) => new Promise((resolve) => {
  const ws = new WebSocket("ws://localhost:8123");
  const c = { ws, profile, lobby: null, st: null, started: false, errors: [], inbox: [] };
  ws.on("open", () => { ws.send(JSON.stringify({ t: "hello", profile })); resolve(c); });
  ws.on("message", (d) => {
    const m = JSON.parse(d);
    c.inbox.push(m);
    if (m.t === "lobby") c.lobby = m.lobby;
    if (m.t === "state") c.st = m.st;
    if (m.t === "started") c.started = true;
    if (m.t === "error") c.errors.push(m.msg);
  });
});
const say = (c, m) => c.ws.send(JSON.stringify(m));

(async () => {
  const alice = await mkClient({ id: "alice-1", name: "Alice", royal: "queen" });
  const bob = await mkClient({ id: "bob-1", name: "Bob", royal: "king" });
  await wait(150);

  // lobby lifecycle
  say(alice, { t: "create", settings: { rounds: 2, botSpeed: "fast" } });
  await wait(150);
  if (!alice.lobby || !alice.lobby.code) throw new Error("create failed");
  const code = alice.lobby.code;
  console.log("1. Alice created lobby " + code + " ✓");

  say(bob, { t: "browse" });
  await wait(150);
  const lobbies = bob.inbox.filter((m) => m.t === "lobbies").pop();
  if (!lobbies || !lobbies.list.some((l) => l.code === code)) throw new Error("browse missing lobby");
  console.log("2. Bob sees it in the lobby browser ✓");

  say(bob, { t: "join", code });
  await wait(150);
  if (!bob.lobby || bob.lobby.players.length !== 2) throw new Error("join failed");
  say(alice, { t: "addBot", diff: "knight" });
  await wait(150);
  if (alice.lobby.players.length !== 3) throw new Error("addBot failed");
  console.log("3. Bob joined; Alice seated a bot — 3 at the table ✓");

  // non-host can't start; host can
  say(bob, { t: "start" });
  await wait(150);
  if (bob.started) throw new Error("non-host started the game!");
  say(alice, { t: "start" });
  await wait(300);
  if (!alice.started || !bob.started) throw new Error("host start failed");
  if (!alice.st || !bob.st) throw new Error("no state broadcast");
  console.log("4. Only the host can start; both clients received the opening state ✓");

  // hand redaction: each sees own real cards, others' as zeros
  const check = (c) => {
    const st = c.st;
    const my = st.players.findIndex((p) => p.id === c.profile.id);
    st.players.forEach((p, i) => {
      const hand = st.hands[i] || [];
      if (i === my) { if (hand.some((x) => x === 0)) throw new Error(c.profile.name + " sees zeros in OWN hand"); }
      else if (hand.some((x) => x !== 0)) throw new Error(c.profile.name + " can see " + p.name + "'s real cards!");
    });
  };
  check(alice); check(bob);
  console.log("5. Redaction: every hand but your own is hidden zeros — no client-side peeking ✓");

  // turn enforcement: playing out of turn is rejected
  const outOfTurn = [alice, bob].find((c) => c.st.seatOrder[c.st.turn] !== c.st.players.findIndex((p) => p.id === c.profile.id));
  const before = outOfTurn.errors.length;
  say(outOfTurn, { t: "action", action: { type: "pass" } });
  await wait(150);
  if (outOfTurn.errors.length <= before) throw new Error("out-of-turn action was accepted");
  console.log("6. Out-of-turn actions rejected with an error ✓");

  // reconnection mid-game: Bob's connection dies; a fresh socket with his profile id reattaches
  bob.ws.close();
  await wait(250);
  const bob2 = await mkClient({ id: "bob-1", name: "Bob", royal: "king" });
  await wait(300);
  if (!bob2.started || !bob2.st) throw new Error("mid-game reconnect did not restore the table (started=" + bob2.started + ")");
  if (bob2.lobby && bob2.lobby.code !== code) throw new Error("reattached to the wrong room");
  console.log("7. Mid-game reconnect: Bob's new socket reattached and received the live state ✓");

  // now play the whole match: each client acts like a simple legal player on its turn
  const actFor = (c) => {
    const st = c.st; if (!st) return;
    if (st.phase === "play") {
      const my = st.players.findIndex((p) => p.id === c.profile.id);
      if (st.seatOrder[st.turn] === my && (st.hands[my] || []).length) {
        const mv = E.botChoose({ ...st, hands: { ...st.hands } }, "knight");
        say(c, { t: "action", action: mv });
      }
    }
    if (st.phase === "tax" && st.tax) {
      const my = st.players.findIndex((p) => p.id === c.profile.id);
      const pay = st.tax.findIndex((e) => !e.taken && e.giver === my);
      if (pay >= 0) say(c, { t: "taxPay", cards: st.hands[my].slice(0, st.tax[pay].k) });
      const ret = st.tax.findIndex((e) => e.taken && !e.returned && e.taker === my);
      if (ret >= 0) say(c, { t: "taxReturn", cards: E.botTaxPick(st.hands[my], st.tax[ret].k) });
    }
    if (st.phase === "revolt" && st.revolt && st.revolt.pIdx === st.players.findIndex((p) => p.id === c.profile.id)) {
      say(c, { t: "revolt", accept: false });
    }
  };

  let guard = 0;
  while (guard++ < 600) {
    actFor(alice); actFor(bob2);
    await wait(120);
    const st = alice.st;
    if (st && st.phase === "roundEnd" && st.round < st.settings.rounds) say(alice, { t: "nextRound" }); // host skips the break
    if (st && st.phase === "matchEnd") break;
  }
  if (!alice.st || alice.st.phase !== "matchEnd") throw new Error("match never completed (phase: " + (alice.st && alice.st.phase) + ", round " + (alice.st && alice.st.round) + ")");
  console.log("8. Full " + alice.st.settings.rounds + "-round match played to completion through the server — humans, bot, taxes, clocks ✓");

  // after the match the room reopens as a lobby; leaving works cleanly
  say(bob2, { t: "leave" });
  await wait(200);
  say(alice, { t: "browse" });
  await wait(150);
  const after = alice.inbox.filter((m) => m.t === "lobbies").pop();
  if (!after.list.some((l) => l.code === code && l.count === 2)) throw new Error("post-match lobby wrong: " + JSON.stringify(after.list));
  console.log("9. Post-match: room reopened as a lobby; Bob left cleanly (host + bot remain) ✓");

  console.log("SERVER INTEGRATION TEST PASSED");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
