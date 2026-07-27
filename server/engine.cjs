/* Kings & Peasants — game engine (extracted verbatim from the client source).
   Server and client share these exact rules; regenerate with the build script
   rather than editing by hand. CommonJS for plain Node. */
"use strict";

/* ============================================================ utils */
const uid = () => Math.random().toString(36).slice(2, 10);
const LETTERS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const makeCode = () => Array.from({ length: 4 }, () => LETTERS[(Math.random() * LETTERS.length) | 0]).join("");
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [x[i], x[j]] = [x[j], x[i]]; } return x; };
const buildDeck = () => { const d = []; for (let r = 1; r <= 12; r++) for (let i = 0; i < r; i++) d.push(r); d.push(13, 13); return d; }; // 80 cards incl. 2 Jesters (wild; rank 13 alone)

const RANK_NAMES = { 1: "Majesty", 2: "Regent", 3: "Bishop", 4: "Duke", 5: "Knight", 6: "Squire", 7: "Merchant", 8: "Blacksmith", 9: "Cook", 10: "Shepherd", 11: "Stonecutter", 12: "Peasant", 13: "Jester" };
// Phone detection, evaluated at call time: needs BOTH the Vibration API and a touch-style
// pointer. Desktop Chrome exposes navigator.vibrate but is not a phone; iPhones are touch
// but lack the API (vibration silently unsupported there) — this correctly excludes both.
const isPhone = () => {
  try {
    return typeof navigator !== "undefined" && "vibrate" in navigator &&
      typeof window !== "undefined" &&
      (("ontouchstart" in window) || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));
  } catch { return false; }
};

const DIFFS = [
  { id: "squire", label: "Squire", desc: "Plays loosely — a forgiving table." },
  { id: "knight", label: "Knight", desc: "Sheds high cards with purpose." },
  { id: "royal", label: "Royal", desc: "Hoards low ranks, strikes late." },
];
const PIP_ART = { 1: "👑", 2: "⚜️", 3: "⛪", 4: "🏰", 5: "⚔️", 6: "🛡️", 7: "💰", 8: "🔨", 9: "🍗", 10: "🐑", 11: "⛏️", 12: "🌾" };
const BOT_SPEEDS = [
  { id: "fast", label: "Fast", desc: "Snappy turns — the pace you know." },
  { id: "normal", label: "Normal", desc: "A relaxed beat between plays." },
  { id: "slow", label: "Slow", desc: "Deliberate, easy-to-follow turns." },
];
const BOT_DELAY = { local: { fast: 850, normal: 1500, slow: 2400 }, online: { fast: 1200, normal: 1800, slow: 2600 } };
const BOT_NAMES = ["Aldric", "Berta", "Cedric", "Duna", "Edmund", "Fira", "Godwin", "Hilda", "Ivo", "Jutta", "Kort", "Lise"];

const groupHand = (hand) => { const g = {}; for (const r of hand) g[r] = (g[r] || 0) + 1; return g; };
const sortHand = (hand) => [...hand].sort((a, b) => a - b);

// Court title for a seat given seat count (used from round 2 on; round 1 everyone is a merchant)
function seatTitle(seatIdx, n, round) {
  if (round <= 1) return "";
  if (seatIdx === 0) return "King";
  if (seatIdx === n - 1) return "Peasant";
  if (n >= 4 && seatIdx === 1) return "Prince";
  if (n >= 4 && seatIdx === n - 2) return "Commoner";
  return "Courtier";
}
const seatCrown = (t) => ["King","Queen","Majesty"].includes(t) ? "👑" : ["Prince","Princess","Heir"].includes(t) ? "🎩" : t === "Peasant" ? "🪣" : t === "Commoner" ? "🧹" : "";

// player-chosen royal identity: 'majesty' (default) | 'king' | 'queen'
function royalName(player, base) {
  const r = (player && player.royal) || "majesty";
  if (base === "King") return r === "queen" ? "Queen" : r === "king" ? "King" : "Majesty";
  if (base === "Prince") return r === "queen" ? "Princess" : r === "king" ? "Prince" : "Heir";
  return base;
}

// Seats ride the felt's border on a racetrack path — bottom-center is YOU, and the walk
// proceeds clockwise (bottom-left, up the left edge, across the top, down the right).
// Edge-riding means no seat can ever reach the center where the trick sits.
function tableSeatPos(rel, count) {
  const L = 12, R = 88, T = 12, B = 85;
  const segs = [
    { len: 50 - L, at: (u) => [50 - u, B] },       // bottom-center -> bottom-left
    { len: B - T,  at: (u) => [L, B - u] },        // up the left edge
    { len: R - L,  at: (u) => [L + u, T] },        // across the top
    { len: B - T,  at: (u) => [R, T + u] },        // down the right edge
    { len: R - 50, at: (u) => [R - u, B] },        // bottom-right -> back to center
  ];
  const P = segs.reduce((s, g) => s + g.len, 0);
  let d = ((rel / count) * P) % P;
  for (const g of segs) {
    if (d <= g.len) { const [x, y] = g.at(d); return { x, y }; }
    d -= g.len;
  }
  return { x: 50, y: B };
}

function rankTier(placeIdx, n) {
  const t = n <= 1 ? 0 : placeIdx / (n - 1);
  return t <= 0.001 ? 1 : t >= 0.999 ? 5 : t < 0.4 ? 2 : t <= 0.6 ? 3 : 4;
}

function handStrength(hand) {
  if (!hand || !hand.length) return null;
  const g = groupHand(hand); const jok = g[13] || 0;
  let sum = 0, nat = 0;
  for (const c of hand) if (c !== 13) { sum += 13 - c; nat++; }
  let v = nat ? sum / nat : 2;
  v += jok * 1.2;
  for (const r in g) if (+r !== 13 && g[r] >= 3) v += 0.6;
  if (v >= 8) return { label: "Royal", stars: 5 };
  if (v >= 6.8) return { label: "Strong", stars: 4 };
  if (v >= 5.6) return { label: "Fair", stars: 3 };
  if (v >= 4.4) return { label: "Poor", stars: 2 };
  return { label: "Dire", stars: 1 };
}

/* ============================================================ engine
   Match state shape (serializable):
   { code?, mode, players:[{id,name,avatar,bot,diff}], seatOrder:[playerIdx...],
     settings:{rounds}, round, phase:'play'|'roundEnd'|'matchEnd',
     hands:{playerIdx:[ranks]}, turn:seatPos, trick:{rank,count,byIdx}|null,
     lastPlaySeat, passSet:[seatPos], finished:[playerIdx...], scores:{playerIdx:pts},
     leaderNote, taxReport, log:[str], version, roundResults:[[playerIdx...]] }
*/
function makeMatch(players, settings, mode, code) {
  const scores = {}; players.forEach((_, i) => (scores[i] = 0));
  const st = {
    code: code || null, mode, players, settings: { rounds: settings.rounds || 3, botSpeed: settings.botSpeed || "fast" },
    round: 0, phase: "roundEnd", seatOrder: players.map((_, i) => i),
    hands: {}, turn: 0, trick: null, lastPlaySeat: null, passSet: [], finished: [],
    scores, taxReport: null, tax: null, lastTax: null, taxPrenote: null, leaderNote: "", log: [], version: 0, roundResults: [],
  };
  return startRound(st);
}

function startRound(st) {
  const s = JSON.parse(JSON.stringify(st));
  s.round += 1; s.phase = "play"; s.trick = null; s.lastPlaySeat = null; s.passSet = []; s.finished = [];
  const n = s.players.length;
  // deal
  const deck = shuffle(buildDeck());
  const hands = {}; s.seatOrder.forEach((pIdx) => (hands[pIdx] = []));
  deck.forEach((card, i) => { hands[s.seatOrder[i % n]].push(card); });
  Object.keys(hands).forEach((k) => (hands[k] = sortHand(hands[k])));
  s.hands = hands;
  // Revolution check, then taxation, then opening lead.
  s.taxReport = null; s.revolt = null;
  if (s.round > 1) {
    let holderSeat = -1;
    s.seatOrder.forEach((pIdx, seat) => { if (s.hands[pIdx].filter((r) => r === 13).length === 2) holderSeat = seat; });
    if (holderSeat >= 0) {
      const holderIdx = s.seatOrder[holderSeat];
      const collector = holderSeat === 0 || (n >= 4 && holderSeat === 1); // tax collectors never revolt willingly
      if (s.players[holderIdx].bot) {
        if (collector) beginTaxation(s);
        else { doRevolution(s, holderSeat); beginPlay(s); }
      } else {
        s.phase = "revolt";
        s.revolt = { pIdx: holderIdx, seat: holderSeat };
        s.log = [`${s.players[holderIdx].name} was dealt both Jesters — revolution hangs in the air…`];
        s.version = (s.version || 0) + 1;
        return s;
      }
    } else {
      beginTaxation(s);
    }
  } else {
    beginPlay(s);
  }
  s.version = (s.version || 0) + 1;
  return s;
}

// Taxation: the taking is automatic (lowest cards, per law) and lands in the collector's hand
// immediately. Each collector then CHOOSES which of their cards to hand back. Bots pick their
// worst non-Jester cards; humans get a picker. Everyone reviews the full report before play.
function beginTaxation(s) {
  const n = s.seatOrder.length;
  s.tax = [];
  const setup = (takerSeat, giverSeat, k) =>
    s.tax.push({ taker: s.seatOrder[takerSeat], giver: s.seatOrder[giverSeat], k, taken: null, returned: null });
  setup(0, n - 1, 2);
  if (n >= 4) setup(1, n - 2, 1);
  s.phase = "tax"; // stage 1: peons pay their lowest cards; stage 2: rulers choose what to return
}

// Peasant pays: the cards offered must be exactly their k lowest (the law allows nothing else).
function resolveTaxPayment(st, taxIdx, cards) {
  const s = JSON.parse(JSON.stringify(st));
  if (s.phase !== "tax" || !s.tax || !s.tax[taxIdx] || s.tax[taxIdx].taken) return s;
  const e = s.tax[taxIdx];
  const hand = s.hands[e.giver];
  const due = hand.slice(0, e.k);
  const offered = [...(cards || [])].sort((a, b) => a - b);
  if (offered.length !== e.k || offered.some((v, i) => v !== due[i])) return s;
  s.hands[e.giver] = hand.slice(e.k);
  s.hands[e.taker] = sortHand([...s.hands[e.taker], ...due]);
  e.taken = due;
  s.version++;
  return s;
}

function botTaxPick(hand, k) {
  const nonJ = hand.filter((c) => c !== 13);
  let give = nonJ.slice(-k);                               // worst cards, but keep Jesters if possible
  if (give.length < k) give = [...give, ...hand.filter((c) => c === 13).slice(0, k - give.length)];
  return give;
}

function applyTaxReturn(s, e, cards) {
  if (!cards || cards.length !== e.k) return false;
  const h = [...s.hands[e.taker]];
  for (const c of cards) { const i = h.indexOf(c); if (i < 0) return false; h.splice(i, 1); }
  s.hands[e.taker] = h;
  s.hands[e.giver] = sortHand([...s.hands[e.giver], ...cards]);
  e.returned = [...cards].sort((a, b) => a - b);
  return true;
}

function finishTaxation(s) {
  const notes = s.tax.map((e) =>
    `${s.players[e.taker].name} collected ${e.k} card${e.k > 1 ? "s" : ""} from ${s.players[e.giver].name} and returned ${e.k}.`);
  s.taxReport = [...(s.taxPrenote ? [s.taxPrenote] : []), ...notes];
  s.taxPrenote = null;
  s.lastTax = s.tax;
  s.tax = null;
  beginPlay(s);
}

function resolveTaxReturn(st, taxIdx, cards) {
  const s = JSON.parse(JSON.stringify(st));
  if (s.phase !== "tax" || !s.tax || !s.tax[taxIdx] || !s.tax[taxIdx].taken || s.tax[taxIdx].returned) return s;
  if (!applyTaxReturn(s, s.tax[taxIdx], cards)) return s;
  if (s.tax.every((e) => e.returned)) finishTaxation(s);
  s.version++;
  return s;
}

function doRevolution(s, seat) {
  const n = s.seatOrder.length;
  const name = s.players[s.seatOrder[seat]].name;
  if (seat === n - 1) { // the Peasant flips the whole court
    s.seatOrder = [...s.seatOrder].reverse();
    s.taxReport = [`⚔️ GREATER REVOLUTION! ${name} held both Jesters — the court is overturned: the peasants rule, and no taxes are paid.`];
  } else {
    s.taxReport = [`⚔️ REVOLUTION! ${name} held both Jesters — no taxes are paid this round.`];
  }
}

function resolveRevolt(st, declare) {
  const s = JSON.parse(JSON.stringify(st));
  if (s.phase !== "revolt" || !s.revolt) return s;
  if (declare) { doRevolution(s, s.revolt.seat); s.revolt = null; beginPlay(s); }
  else {
    s.taxPrenote = `${s.players[s.revolt.pIdx].name} holds their Jesters close — the taxes are paid.`;
    s.revolt = null;
    beginTaxation(s);
  }
  s.version++;
  return s;
}

function beginPlay(s) {
  s.phase = "play";
  if (s.round === 1) {
    let leadSeat = 0;
    s.seatOrder.forEach((pIdx, seat) => { if (s.hands[pIdx].includes(1)) leadSeat = seat; });
    const leadIdx = s.seatOrder[leadSeat];
    const i1 = s.hands[leadIdx].indexOf(1);
    if (i1 >= 0) s.hands[leadIdx].splice(i1, 1); // the 1 is discarded to open the game
    s.turn = leadSeat;
    s.leaderNote = `${s.players[leadIdx].name} was dealt the 1 — it is discarded, and they lead round one.`;
  } else {
    s.turn = 0;
    const ruler = s.players[s.seatOrder[0]];
    s.leaderNote = `${ruler.name}, the ${royalName(ruler, "King")}, leads.`;
  }
  s.log = [s.leaderNote];
}

const seatActive = (s, seat) => { const p = s.seatOrder[seat]; return s.hands[p] && s.hands[p].length > 0; };
function nextActiveSeat(s, from) {
  const n = s.seatOrder.length;
  for (let i = 1; i <= n; i++) { const seat = (from + i) % n; if (seatActive(s, seat)) return seat; }
  return from;
}
const activeCount = (s) => s.seatOrder.reduce((a, _, seat) => a + (seatActive(s, seat) ? 1 : 0), 0);

// Jesters (13) are wild when played WITH natural cards; alone they are a rank-13 set.
// A move is {rank, count, jokers} where jokers = wilds consumed (0 for pure-jester plays' naturals).
function legalPlays(hand, trick, sealOne = false) {
  const g = groupHand(hand); const jok = g[13] || 0; const out = [];
  if (!trick) {
    for (let r = 1; r <= 12; r++) {
      if (sealOne && r === 1) continue; // the 1 opened round one and stays sealed
      const nat = g[r] || 0; if (!nat) continue;
      for (let c = 1; c <= nat + jok; c++) out.push({ rank: r, count: c, jokers: Math.max(0, c - nat) });
    }
    for (let c = 1; c <= jok; c++) out.push({ rank: 13, count: c, jokers: 0 }); // lone jesters play as 13s
  } else {
    for (let r = 1; r < trick.rank; r++) {
      if (sealOne && r === 1) continue;
      const nat = g[r] || 0;
      if (nat >= 1 && nat + jok >= trick.count) out.push({ rank: r, count: trick.count, jokers: Math.max(0, trick.count - nat) });
    }
  }
  return out;
}

// Apply an action for the seat whose turn it is. action: {type:'play',rank,count} | {type:'pass'}
function applyAction(st, action) {
  const s = JSON.parse(JSON.stringify(st));
  if (s.phase !== "play") return s;
  const n = s.seatOrder.length;
  const seat = s.turn; const pIdx = s.seatOrder[seat]; const name = s.players[pIdx].name;

  if (action.type === "play") {
    const legal = legalPlays(s.hands[pIdx], s.trick, s.round === 1).some((m) => m.rank === action.rank && m.count === action.count);
    if (!legal) return s;
    const g = groupHand(s.hands[pIdx]);
    const nat = Math.min(g[action.rank] || 0, action.count);
    const wilds = action.rank === 13 ? 0 : action.count - nat;
    let rmR = 0, rmJ = 0;
    s.hands[pIdx] = s.hands[pIdx].filter((r) => {
      if (r === action.rank && rmR < nat) { rmR++; return false; }
      if (r === 13 && rmJ < wilds) { rmJ++; return false; }
      return true;
    });
    s.trick = { rank: action.rank, count: action.count, byIdx: pIdx, jokers: wilds };
    s.lastPlaySeat = seat; // passes are NOT cleared: a pass benches you until the next lead
    s.log.push(action.rank === 13
      ? `${name} plays ${action.count} Jester${action.count > 1 ? "s" : ""} — a lone 13.`
      : `${name} plays ${action.count} × ${action.rank}${wilds ? ` (${wilds} wild)` : ""}.`);
    if (s.hands[pIdx].length === 0) {
      s.finished.push(pIdx);
      const place = s.finished.length;
      s.scores[pIdx] += n - (place - 1);
      s.log.push(`${name} goes out — ${ordinal(place)} place!`);
    }
  } else {
    s.passSet.push(seat);
    s.log.push(`${name} passes.`);
  }

  // round over?
  if (activeCount(s) <= 1) {
    const lastSeat = s.seatOrder.findIndex((_, seat2) => seatActive(s, seat2));
    if (lastSeat >= 0) {
      const lastIdx = s.seatOrder[lastSeat];
      s.finished.push(lastIdx);
      s.scores[lastIdx] += n - (s.finished.length - 1);
      s.log.push(`${s.players[lastIdx].name} is left holding cards — the Peasant.`);
    }
    s.roundResults.push([...s.finished]);
    s.seatOrder = [...s.finished];               // next round's seating: finish order
    s.phase = s.round >= s.settings.rounds ? "matchEnd" : "roundEnd";
    s.version++;
    return s;
  }

  // advance turn / resolve trick. Once you pass, you sit out until the next lead:
  // eligible = still holding cards AND not yet passed this trick.
  if (s.trick) {
    const ownerSeat = s.lastPlaySeat;
    const ownerActive = seatActive(s, ownerSeat);
    let next = -1;
    for (let i = 1; i <= n; i++) {
      const cand = (seat + i) % n;
      if (cand === ownerSeat) break;                         // scan returned to the owner: nobody left to act
      if (!seatActive(s, cand) || s.passSet.includes(cand)) continue;
      next = cand; break;
    }
    if (next === -1) {
      const winnerSeat = ownerActive ? ownerSeat : nextActiveSeat(s, ownerSeat);
      s.log.push(`${s.players[s.seatOrder[winnerSeat]].name} wins the trick and leads.`);
      s.trick = null; s.passSet = []; s.lastPlaySeat = null; // benched players are freed for the new lead
      s.turn = winnerSeat;
    } else {
      s.turn = next;
    }
  } else {
    s.turn = nextActiveSeat(s, seat);
  }
  if (s.log.length > 30) s.log = s.log.slice(-30);
  s.version++;
  return s;
}

const ordinal = (n) => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || "th");

/* ============================================================ AI */
function botChoose(st, diff) {
  const seat = st.turn; const pIdx = st.seatOrder[seat];
  const hand = st.hands[pIdx]; const trick = st.trick;
  const moves = legalPlays(hand, trick, st.round === 1);
  if (moves.length === 0) return { type: "pass" }; // includes a leader stuck holding only the sealed 1
  const g = groupHand(hand);
  const handSize = hand.length;
  const natUsed = (m) => m.rank === 13 ? m.count : m.count - m.jokers;
  const breaks = (m) => natUsed(m) < (g[m.rank] || 0);   // leaves naturals of that rank behind

  // Any move that empties the whole hand (jokers glued to your last naturals) is an instant win — take it.
  const winNow = moves.find((m) => m.count === handSize);
  if (winNow) return { type: "play", rank: winNow.rank, count: winNow.count };

  if (diff === "squire") {
    if (trick && Math.random() < 0.28) return { type: "pass" };
    const pool0 = moves.filter((m) => m.rank !== 13);            // even a squire pairs jesters rather than tossing them alone
    const src0 = pool0.length ? pool0 : moves;
    const m = src0[(Math.random() * src0.length) | 0];
    return { type: "play", rank: m.rank, count: m.count };
  }

  const leadScore = (m) => {
    if (m.rank === 13) return handSize > 7 ? 12 + m.count : -20; // a lone jester is a last resort — wilds belong glued to sets
    let v = m.rank * 2 + m.count;
    if (!breaks(m)) v += 6;
    if (m.rank <= 3) v -= 10;
    v -= m.jokers * (handSize > 6 ? 8 : 2);                        // hoard wilds while the hand is fat
    return v;
  };

  if (diff === "knight") {
    if (!trick) {
      const pick = [...moves].sort((a, b) => leadScore(b) - leadScore(a))[0];
      return { type: "play", rank: pick.rank, count: pick.count };
    }
    const keep = moves.filter((m) => !breaks(m));
    const pool = keep.length ? keep : moves;
    const pick = [...pool].sort((a, b) => (b.rank - a.rank) || (a.jokers - b.jokers))[0];
    if (pick.rank <= 2 && handSize > 5 && Math.random() < 0.5) return { type: "pass" };
    return { type: "play", rank: pick.rank, count: pick.count };
  }

  // royal
  if (!trick) {
    const pick = [...moves].sort((a, b) => {
      if (handSize <= 4) return (a.rank - b.rank) || (b.count - a.count); // endgame: strength, and glue wilds on rather than stranding them
      return leadScore(b) - leadScore(a);                                   // else dump the worst big set
    })[0];
    return { type: "play", rank: pick.rank, count: pick.count };
  }
  let pool = moves.filter((m) => !breaks(m));
  if (!pool.length && handSize <= 4) pool = moves;
  pool = pool.filter((m) => (m.jokers === 0 || handSize <= 6) && (m.rank > 3 || handSize <= 5 || !breaks(m)));
  if (!pool.length) return { type: "pass" };
  const pick = [...pool].sort((a, b) => (b.rank - a.rank) || (a.jokers - b.jokers))[0];
  if (pick.rank <= 2 && handSize > 6) return { type: "pass" };
  return { type: "play", rank: pick.rank, count: pick.count };
}


module.exports = { makeMatch, startRound, legalPlays, applyAction, botChoose, botTaxPick,
  resolveTaxPayment, resolveTaxReturn, resolveRevolt, rankTier, shuffle };
