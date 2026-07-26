import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   GREAT DALMUDI — a court of cards for 2–10 players
   Local play vs AI (3 difficulties) or online lobbies via
   shared storage. Rounds default to 4 (set in lobby).
   ============================================================ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Pirata+One&family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&family=Alegreya+Sans:wght@400;500;700;800&display=swap');

:root{
  --night:#171210; --night2:#221a15; --felt:#2b3d31; --felt-edge:#1e2c23;
  --parch:#f2e6c9; --parch-dim:#e0d2af; --gilt:#c9a24b; --gilt-soft:#8a7340;
  --wine:#8a3033; --smoke:#a79a82; --ink:#2a2119; --good:#7ba05b;
  --disp:'Pirata One', 'Georgia', serif;
  --body:'Alegreya', 'Georgia', serif;
  --util:'Alegreya Sans', 'Trebuchet MS', sans-serif;
}
*{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
html,body,#root{height:100%;}
body{margin:0; background:var(--night); color:var(--parch); font-family:var(--body);}
.app{min-height:100vh; min-height:100dvh; display:flex; flex-direction:column;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(201,162,75,.10), transparent 60%),
    radial-gradient(900px 500px at 50% 110%, rgba(138,48,51,.12), transparent 60%),
    var(--night);}
button{font-family:var(--util); cursor:pointer; border:none;}
button:disabled{opacity:.45; cursor:not-allowed;}
button:focus-visible, input:focus-visible, select:focus-visible{outline:2px solid var(--gilt); outline-offset:2px;}
input,select{font-family:var(--util);}
@media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important;} }

/* ---------- shared chrome ---------- */
.wrap{width:100%; max-width:760px; margin:0 auto; padding:16px; flex:1; display:flex; flex-direction:column;}
.crest{ text-align:center; margin:26px 0 8px;}
.crest .rule{display:flex; align-items:center; gap:10px; justify-content:center; color:var(--gilt); font-size:12px;}
.crest .rule::before,.crest .rule::after{content:""; height:1px; width:64px; background:linear-gradient(90deg,transparent,var(--gilt-soft));}
.crest .rule::after{background:linear-gradient(90deg,var(--gilt-soft),transparent);}
.crest h1{font-family:var(--disp); font-weight:400; font-size:clamp(40px,11vw,64px); letter-spacing:.02em;
  margin:2px 0 0; color:var(--parch); text-shadow:0 2px 0 rgba(0,0,0,.5);}
.crest h1 em{font-style:normal; color:var(--gilt);}
.tagline{font-family:var(--util); text-transform:uppercase; letter-spacing:.22em; font-size:11px; color:var(--smoke); margin-top:4px;}

.btn{display:block; width:100%; text-align:left; background:var(--night2); color:var(--parch);
  border:1px solid rgba(201,162,75,.28); border-radius:10px; padding:14px 16px; margin-top:12px;
  transition:transform .08s ease, border-color .15s ease;}
.btn:active{transform:scale(.985);}
.btn:hover{border-color:var(--gilt);}
.btn .t{font-size:17px; font-weight:700; letter-spacing:.02em;}
.btn .d{font-family:var(--body); font-size:13.5px; color:var(--smoke); margin-top:2px;}
.btn.primary{background:linear-gradient(180deg,#3a2c1c,#2c2115); border-color:var(--gilt);}
.btn.small{width:auto; display:inline-block; padding:9px 14px; margin-top:0;}
.btn.gold{background:linear-gradient(180deg,var(--gilt),#a5813a); color:#241b10; border-color:#e5c87e;}
.btn.gold .t{color:#241b10;}
.btn.danger{border-color:rgba(138,48,51,.7);}
.row{display:flex; gap:10px; align-items:center;}
.grow{flex:1;}
.topbar{display:flex; align-items:center; gap:10px; padding:10px 14px; font-family:var(--util);}
.topbar .back{background:none; color:var(--gilt); font-size:14px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:6px 4px;}
.topbar .title{font-family:var(--disp); font-size:22px; letter-spacing:.03em;}
.sect{font-family:var(--util); text-transform:uppercase; letter-spacing:.2em; font-size:11px; color:var(--gilt);
  margin:22px 0 8px; display:flex; align-items:center; gap:10px;}
.sect::after{content:""; flex:1; height:1px; background:rgba(201,162,75,.25);}
.card-panel{background:var(--night2); border:1px solid rgba(201,162,75,.2); border-radius:12px; padding:14px;}
.profile-open{border:none; transition:background .15s ease, border-color .15s ease, box-shadow .15s ease;}
.profile-open:hover{background:#1a140f; border-color:rgba(201,162,75,.4); box-shadow:0 0 0 1px rgba(201,162,75,.15) inset;}
.profile-open:active{background:#16110c; border-color:rgba(201,162,75,.55);}
.hint{font-size:13px; color:var(--smoke); line-height:1.45;}
.field label{display:block; font-family:var(--util); font-size:12px; text-transform:uppercase; letter-spacing:.14em; color:var(--smoke); margin:14px 0 6px;}
.field input[type=text], .field select{width:100%; background:#120e0b; color:var(--parch); border:1px solid rgba(201,162,75,.3);
  border-radius:8px; padding:11px 12px; font-size:16px;}
.stepper{display:flex; align-items:center; gap:0; border:1px solid rgba(201,162,75,.35); border-radius:8px; overflow:hidden; width:max-content;}
.stepper button{width:44px; height:44px; background:#120e0b; color:var(--gilt); font-size:22px; font-weight:700;}
.stepper .val{min-width:56px; text-align:center; font-family:var(--util); font-size:18px; font-weight:800;}
.pillrow{display:flex; gap:8px; flex-wrap:wrap;}
.pill{padding:9px 14px; border-radius:999px; border:1px solid rgba(201,162,75,.35); background:#120e0b; color:var(--parch);
  font-size:14px; font-weight:700;}
.pill.on{background:var(--gilt); color:#241b10; border-color:#e5c87e;}
.avatar{width:44px; height:44px; border-radius:50%; background:#3a2f22 center/cover no-repeat; border:2px solid var(--gilt-soft);
  display:flex; align-items:center; justify-content:center; font-family:var(--disp); font-size:20px; color:var(--gilt); flex:none; overflow:hidden;}
.avatar.lg{width:72px; height:72px; font-size:32px;}
.avatar img{width:100%; height:100%; object-fit:cover;}
.toast{position:fixed; left:50%; bottom:24px; transform:translateX(-50%); background:#000c; color:var(--parch);
  border:1px solid var(--gilt-soft); padding:10px 16px; border-radius:10px; font-family:var(--util); font-size:14px; z-index:90;
  max-width:90vw; text-align:center;}

/* ---------- playing cards ---------- */
.pcard{position:relative; width:58px; height:82px; border-radius:7px; background:linear-gradient(160deg,var(--parch),var(--parch-dim));
  color:var(--ink); border:1px solid #b7a67f; box-shadow:0 2px 5px rgba(0,0,0,.45), inset 0 0 0 2px rgba(42,33,25,.12); flex:none;}
.pcard .num{position:absolute; top:3px; left:6px; font-family:var(--disp); font-size:22px; line-height:1;}
.pcard .num.br{top:auto; left:auto; bottom:3px; right:6px; transform:rotate(180deg);}
.pcard .who{position:absolute; left:0; right:0; bottom:17px; text-align:center; font-family:var(--util); font-weight:700;
  font-size:7.5px; letter-spacing:.04em; text-transform:uppercase; color:#6b5b41;}
.pcard .pips{position:absolute; inset:21px 5px 25px; display:flex; flex-wrap:wrap; align-content:center; justify-content:center; gap:1px;}
.pcard .pip{width:7px; height:7px; border-radius:50%; background:var(--wine);}
.pcard .pipart{font-size:9.5px; line-height:1.15; filter:sepia(.35) saturate(.8) contrast(.95);}
.pcard .pipart.solo{font-size:15px;}
.pcard.mini .pipart.solo{font-size:14px;}
.pcard.r1 .pip{background:var(--gilt);}
.pcard.r13{background:linear-gradient(160deg,#f0e0ba,#dcc68e); border-color:#a3823f;}
.pcard.r13 .num{color:var(--wine);}
.pcard .star{font-size:26px; color:var(--wine); line-height:1; text-shadow:0 1px 0 rgba(255,255,255,.4);}
.pcard.mini .star{font-size:20px;}
.pcard.locked{filter:grayscale(.6) brightness(.82);}
.pcard .lockb{position:absolute; top:2px; right:3px; font-size:10px; z-index:1;}
.strength{color:var(--gilt); letter-spacing:.05em;}
.pcard.sel{transform:translateY(-14px); box-shadow:0 8px 14px rgba(0,0,0,.5), 0 0 0 2px var(--gilt);}
.pcard.mini{width:40px; height:57px;}
.pcard.mini .num{font-size:16px; top:2px; left:4px;}
.pcard.mini .num.br{display:none;}
.pcard.mini .who{display:none;}
.pcard.mini .pips{inset:16px 4px 5px;}
.pcard.mini .pip{width:5px; height:5px;}
.cardback{width:40px; height:57px; border-radius:6px; flex:none;
  background:repeating-linear-gradient(45deg,#5d2326,#5d2326 4px,#6f2b2e 4px,#6f2b2e 8px);
  border:1px solid #3c181a; box-shadow:inset 0 0 0 2px rgba(201,162,75,.35), 0 1px 3px rgba(0,0,0,.5);}

/* ---------- game table ---------- */
.game{display:flex; flex-direction:column; min-height:100vh; min-height:100dvh;}
.gamehead{display:flex; align-items:center; justify-content:space-between; padding:10px 14px; font-family:var(--util); font-size:12px;
  text-transform:uppercase; letter-spacing:.14em; color:var(--smoke); border-bottom:1px solid rgba(201,162,75,.15);}
.gamehead b{color:var(--gilt);}
.seats{display:flex; flex-wrap:wrap; gap:8px; padding:10px 12px; justify-content:center;}
.seat{width:104px; background:var(--night2); border:1px solid rgba(201,162,75,.18); border-radius:10px; padding:8px 6px 7px;
  text-align:center; position:relative; transition:border-color .2s, box-shadow .2s;}
.seat.turn{border-color:var(--gilt); box-shadow:0 0 0 1px var(--gilt), 0 0 18px rgba(201,162,75,.25);}
.seat.out{opacity:.55;}
.seat .nm{font-family:var(--util); font-weight:700; font-size:12.5px; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.seat .laststar{color:var(--gilt); text-shadow:0 0 6px rgba(201,162,75,.6);}
.seat .ttl{font-family:var(--util); font-size:9.5px; text-transform:uppercase; letter-spacing:.08em; color:var(--gilt); min-height:12px;}
.seat .cnt{font-family:var(--util); font-size:11px; color:var(--smoke); margin-top:2px;}
.seat .crown{position:absolute; top:-9px; left:50%; transform:translateX(-50%); font-size:15px; filter:drop-shadow(0 1px 1px #000);}
.seat .passtag{position:absolute; top:-8px; right:-4px; background:var(--wine); color:var(--parch); font-family:var(--util);
  font-size:9px; font-weight:800; letter-spacing:.08em; padding:2px 6px; border-radius:999px; text-transform:uppercase;}
.seat .finmedal{position:absolute; top:-8px; left:-4px; background:var(--gilt); color:#241b10; font-family:var(--util);
  font-size:10px; font-weight:800; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center;}
.felt{flex:1; margin:4px 12px; min-height:340px; border-radius:18px; background:radial-gradient(ellipse at 50% 40%, #35493b, var(--felt) 55%, var(--felt-edge));
  border:1px solid #14201a; box-shadow:inset 0 0 40px rgba(0,0,0,.5); padding:8px 5px; position:relative;
  display:grid; grid-template-columns:auto minmax(0,1fr) auto; grid-template-rows:auto minmax(0,1fr) auto; gap:4px;}
.trow{grid-column:1/4; grid-row:1; display:flex; justify-content:space-evenly; align-items:flex-start; flex-wrap:wrap; gap:4px; min-width:0;}
.brow{grid-column:1/4; grid-row:3; display:flex; justify-content:center; gap:4px;}
.lcol{grid-column:1; grid-row:2; display:flex; flex-direction:column; justify-content:space-evenly; gap:4px;}
.rcol{grid-column:3; grid-row:2; display:flex; flex-direction:column; justify-content:space-evenly; gap:4px;}
.ccell{grid-column:2; grid-row:2; display:flex; align-items:center; justify-content:center; min-width:0; min-height:150px;}
.felt .lead{font-family:var(--util); text-transform:uppercase; letter-spacing:.18em; font-size:11px; color:rgba(242,230,201,.65); margin-bottom:10px;}
.felt .trickcards{display:flex; gap:4px; flex-wrap:wrap; justify-content:center; max-width:100%;}
.felt .trickcards.dense{gap:0; flex-wrap:nowrap;}
.felt .trickcards.dense .pcard{margin-left:-32px;}
.felt .trickcards.dense .pcard:first-child{margin-left:0;}
.felt .beat{margin-top:10px; font-family:var(--util); font-size:12px; color:rgba(242,230,201,.75);}
.felt .logline{margin-top:10px; text-align:center; font-family:var(--body); font-style:italic;
  font-size:12px; color:rgba(242,230,201,.6); max-width:220px;}
.centerstack{display:flex; flex-direction:column; align-items:center; max-width:100%;}
.seat.round{position:relative; width:74px; padding:5px 4px; flex:none;}
.seat.round .avatar{width:34px; height:34px; font-size:15px; border-width:1.5px;}
.seat.round .nm{font-size:10.5px; margin-top:2px;}
.seat.round .ttl{font-size:7.5px; min-height:9px;}
.seat.round .cnt{font-size:9px; margin-top:1px; line-height:1.25;}
.seat.round .crown{font-size:12px; top:-8px;}
.seat.round .finmedal{width:15px; height:15px; font-size:9px;}
.seat.round .passtag{font-size:8px; padding:1px 5px; top:-6px;}
@media (max-width:400px){
  .seat.round{width:62px; padding:4px 3px;}
  .seat.round .avatar{width:29px; height:29px; font-size:13px;}
  .seat.round .nm{font-size:9px;}
  .seat.round .ttl{font-size:7px;}
  .seat.round .cnt{font-size:8px;}
  .felt .lead{font-size:10px; letter-spacing:.14em;}
  .felt .beat{font-size:11px;}
  .felt .logline{font-size:11px;}
}
.handzone{padding:8px 12px calc(14px + env(safe-area-inset-bottom));}
.handlabel{display:flex; justify-content:space-between; align-items:baseline; font-family:var(--util); font-size:11px;
  text-transform:uppercase; letter-spacing:.16em; color:var(--smoke); padding:2px 4px 6px;}
.hand{display:flex; gap:2px; overflow-x:auto; padding:16px 6px 8px; scrollbar-width:thin;}
.hand .grp{display:flex; flex:none;}
.hand .grp + .grp{margin-left:8px;}
.hand .pcard{margin-left:-34px; transition:transform .12s ease, box-shadow .12s ease;}
.hand .grp .pcard:first-child{margin-left:0;}
.actions{display:flex; gap:10px; margin-top:6px;}
.actions .btn{margin-top:0; text-align:center;}
.actions .playbtn{flex:2;}
.actions .passbtn{flex:1; text-align:center;}
.countpick{display:flex; align-items:center; gap:8px; justify-content:center; font-family:var(--util); font-size:13px; color:var(--smoke); margin-top:8px;}
.countpick .pill{padding:7px 13px;}

/* ---------- overlays ---------- */
.overlay{position:fixed; inset:0; background:rgba(10,7,5,.82); display:flex; align-items:center; justify-content:center; z-index:60; padding:18px;}
.sheet{background:var(--night2); border:1px solid var(--gilt-soft); border-radius:14px; padding:20px; width:100%; max-width:440px;
  max-height:86vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.6);}
.sheet h2{font-family:var(--disp); font-weight:400; font-size:30px; margin:0 0 4px; color:var(--gilt); text-align:center;}
.sheet .sub{text-align:center; font-family:var(--util); text-transform:uppercase; letter-spacing:.18em; font-size:11px; color:var(--smoke); margin-bottom:14px;}
.standings{width:100%; border-collapse:collapse; font-family:var(--util); font-size:14px;}
.standings td{padding:8px 6px; border-bottom:1px solid rgba(201,162,75,.14);}
.standings th{font-family:var(--util); text-transform:uppercase; letter-spacing:.16em; font-size:10px; color:var(--smoke); text-align:left; padding:4px 6px 6px; border-bottom:1px solid rgba(201,162,75,.35);}
.standings th.pts{text-align:right; color:var(--gilt);}
.standings tr:last-child td{border-bottom:none;}
.standings .pts{text-align:right; font-weight:800; color:var(--gilt);}
.standings .place{color:var(--smoke); width:30px;}
.taxnote{margin-top:12px; background:#120e0b; border:1px dashed var(--gilt-soft); border-radius:10px; padding:10px 12px;
  font-size:13px; color:var(--smoke); line-height:1.5;}
.lobbyrowitem{display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid rgba(201,162,75,.12);}
.lobbyrowitem:last-child{border-bottom:none;}
.codechip{font-family:var(--util); font-weight:800; letter-spacing:.3em; font-size:22px; color:var(--gilt);
  background:#120e0b; border:1px dashed var(--gilt-soft); border-radius:10px; padding:10px 14px; text-align:center;}
.spin{display:inline-block; width:14px; height:14px; border:2px solid var(--gilt-soft); border-top-color:var(--gilt);
  border-radius:50%; animation:sp 1s linear infinite; vertical-align:-2px;}
@keyframes sp{to{transform:rotate(360deg);}}
`;

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

/* ============================================================ storage */
async function sGet(key, shared = false) {
  try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function sSet(key, val, shared = false) {
  try { await window.storage.set(key, JSON.stringify(val), shared); return true; } catch { return false; }
}
async function sDel(key, shared = false) { try { await window.storage.delete(key, shared); } catch {} }
async function sList(prefix, shared = false) {
  try { const r = await window.storage.list(prefix, shared); return r ? r.keys : []; } catch { return []; }
}

/* ============================================================ small components */
function Avatar({ p, lg }) {
  return (
    <div className={"avatar" + (lg ? " lg" : "")} aria-hidden="true">
      {p?.avatar ? <img src={p.avatar} alt="" /> : (p?.name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

function PCard({ rank, mini, sel, locked, onClick }) {
  return (
    <div className={`pcard r${rank}${mini ? " mini" : ""}${sel ? " sel" : ""}${locked ? " locked" : ""}`} onClick={onClick}
      role={onClick ? "button" : undefined} aria-label={`${RANK_NAMES[rank]} — rank ${rank}`}>
      {locked && <div className="lockb">🔒</div>}
      <div className="num">{rank === 13 ? "J" : rank}</div>
      <div className="pips">
        {rank === 13 ? <span className="star">🃏</span>
          : mini ? <span className="pipart solo">{PIP_ART[rank]}</span>
          : Array.from({ length: rank }, (_, i) => <span key={i} className="pipart">{PIP_ART[rank]}</span>)}
      </div>
      <div className="who">{RANK_NAMES[rank]}</div>
      <div className="num br">{rank}</div>
    </div>
  );
}

function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null; }

function useToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef(null);
  const show = useCallback((m, ms = 2600) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), ms); }, []);
  return [msg, show];
}

/* ============================================================ profile settings */
function SettingsSheet({ profile, onSave, onClose }) {
  const [name, setName] = useState(profile.name || "");
  const [avatar, setAvatar] = useState(profile.avatar || null);
  const [royal, setRoyal] = useState(profile.royal || "majesty");
  const fileRef = useRef(null);

  // ---- crop editor: drag to position, slide to zoom ----
  const S = 220;                                   // circular viewport size
  const [edit, setEdit] = useState(null);          // {src, iw, ih}
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  const layout = (z, ed = edit) => {
    if (!ed) return null;
    const sc = (S / Math.min(ed.iw, ed.ih)) * z;   // cover the circle at zoom 1
    return { sc, dw: ed.iw * sc, dh: ed.ih * sc };
  };
  const clampOff = (o, z) => {
    const L = layout(z); if (!L) return o;
    return { x: Math.min(0, Math.max(S - L.dw, o.x)), y: Math.min(0, Math.max(S - L.dh, o.y)) };
  };

  const pickImage = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";                           // allow re-picking the same file
    if (!f) return;
    const reader = new FileReader();               // data URLs work in the sandbox (blob: URLs don't)
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let iw = img.width, ih = img.height, srcUrl = reader.result;
        const maxSide = 900;                       // downscale huge photos for a smooth editor
        if (Math.max(iw, ih) > maxSide) {
          const k = maxSide / Math.max(iw, ih);
          const c = document.createElement("canvas");
          c.width = Math.round(iw * k); c.height = Math.round(ih * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          srcUrl = c.toDataURL("image/jpeg", 0.9); iw = c.width; ih = c.height;
        }
        const base = S / Math.min(iw, ih);
        setEdit({ src: srcUrl, iw, ih });
        setZoom(1);
        setOff({ x: (S - iw * base) / 2, y: (S - ih * base) / 2 });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  const onZoom = (z) => {
    const L0 = layout(zoom), L1 = layout(z);
    if (!L0 || !L1) return;
    const cx = (S / 2 - off.x) / L0.sc, cy = (S / 2 - off.y) / L0.sc; // keep the center anchored
    setZoom(z);
    setOff(clampOff({ x: S / 2 - cx * L1.sc, y: S / 2 - cy * L1.sc }, z));
  };

  const pd = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y };
    if (e.currentTarget.setPointerCapture) try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  };
  const pm = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setOff(clampOff({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }, zoom));
  };
  const pu = () => { drag.current = null; };

  const applyCrop = () => {
    const L = layout(zoom);
    const img = new Image();
    img.onload = () => {
      const OUT = 128, k = OUT / S;
      const c = document.createElement("canvas"); c.width = OUT; c.height = OUT;
      c.getContext("2d").drawImage(img, off.x * k, off.y * k, L.dw * k, L.dh * k);
      setAvatar(c.toDataURL("image/jpeg", 0.85));
      setEdit(null);
    };
    img.src = edit.src;
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Your Standing</h2>
        <div className="sub">Name & portrait at court</div>

        {edit ? (
          <>
            <div
              style={{ width: S, height: S, margin: "0 auto", borderRadius: "50%", overflow: "hidden",
                border: "2px solid var(--gilt-soft)", position: "relative", touchAction: "none",
                cursor: "grab", background: "#000" }}
              onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerCancel={pu}>
              <img src={edit.src} alt="" draggable={false}
                style={{ position: "absolute", left: off.x, top: off.y,
                  width: layout(zoom).dw, height: layout(zoom).dh,
                  maxWidth: "none", userSelect: "none", pointerEvents: "none" }} />
            </div>
            <div className="hint" style={{ textAlign: "center", marginTop: 8 }}>Drag to position · slide to zoom</div>
            <input type="range" min="1" max="3" step="0.01" value={zoom} aria-label="Zoom portrait"
              onChange={(e) => onZoom(+e.target.value)}
              style={{ width: "100%", marginTop: 8, accentColor: "var(--gilt)" }} />
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn gold grow" style={{ textAlign: "center" }} onClick={applyCrop}><span className="t">Select</span></button>
              <button className="btn" style={{ textAlign: "center" }} onClick={() => setEdit(null)}><span className="t">Cancel</span></button>
            </div>
          </>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "center", marginBottom: 6 }}>
              <Avatar p={{ name, avatar }} lg />
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 8 }}>
              <button className="btn small" onClick={() => fileRef.current && fileRef.current.click()}><span className="t">{avatar ? "New portrait" : "Upload portrait"}</span></button>
              {avatar && <button className="btn small danger" onClick={() => setAvatar(null)}><span className="t">Remove</span></button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImage} />
            <div className="field">
              <label>Royal title (shown when you take the throne)</label>
              <div className="pillrow">
                {[["majesty", "Majesty"], ["king", "King"], ["queen", "Queen"]].map(([v, l]) => (
                  <button key={v} className={"pill" + (royal === v ? " on" : "")} onClick={() => setRoyal(v)}>{l}</button>
                ))}
              </div>
              <div className="hint" style={{ marginTop: 6 }}>
                {royal === "queen" ? "First place crowns you Queen; second makes you the Princess."
                  : royal === "king" ? "First place crowns you King; second makes you the Prince."
                  : "First place crowns you Majesty; second makes you the Heir."}
              </div>
            </div>
            <div className="field">
              <label htmlFor="pname">Display name</label>
              <input id="pname" type="text" maxLength={16} value={name} placeholder="e.g. Wren of the Mill"
                onChange={(e) => setName(e.target.value)} />
            </div>
            <button className="btn gold" style={{ textAlign: "center", marginTop: 18 }}
              onClick={() => onSave({ ...profile, name: name.trim() || "Traveler", avatar, royal })}>
              <span className="t">Save</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AudioSheet({ audio, onAudio, trackName, paused, onPauseToggle, onSkip, onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Audio Settings</h2>
        <div className="sub">music & effects</div>

        <div className="card-panel" style={{ textAlign: "center", marginBottom: 14 }}>
          <div className="hint" style={{ letterSpacing: ".14em", textTransform: "uppercase", fontSize: 10 }}>Now playing</div>
          <div style={{ fontFamily: "var(--util)", fontWeight: 800, marginTop: 4 }}>
            🎵 {trackName || "—"}{paused ? " · paused" : audio.muted ? " · muted" : ""}
          </div>
          <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 12 }}>
            <button className="btn small" onClick={onPauseToggle}><span className="t">{paused ? "▶ Play" : "⏸ Pause"}</span></button>
            <button className="btn small" onClick={onSkip}><span className="t">⏭ Skip</span></button>

          </div>
        </div>

        <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>🎵 Music volume</span><span>{Math.round(audio.music * 100)}%{audio.muted ? " (muted)" : ""}</span>
        </div>
        <input type="range" min="0" max="100" value={Math.round(audio.music * 100)} aria-label="Music volume"
          onChange={(ev) => onAudio({ music: +ev.target.value / 100 })}
          style={{ width: "100%", accentColor: "var(--gilt)", marginBottom: 12 }} />

        <div className="hint" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>🔔 Effects volume</span><span>{Math.round(audio.sfx * 100)}%</span>
        </div>
        <input type="range" min="0" max="100" value={Math.round(audio.sfx * 100)} aria-label="Effects volume"
          onChange={(ev) => onAudio({ sfx: +ev.target.value / 100 })}
          style={{ width: "100%", accentColor: "var(--gilt)" }} />

        {isPhone() && (
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
            <span className="hint">📳 Vibrate on your turn</span>
            <button className="btn small" aria-label="Toggle turn vibration"
              onClick={() => onAudio({ haptics: audio.haptics === false })}>
              <span className="t">{audio.haptics !== false ? "On" : "Off"}</span>
            </button>
          </div>
        )}

        <button className="btn gold" style={{ textAlign: "center", marginTop: 18 }} onClick={onClose}><span className="t">Done</span></button>
      </div>
    </div>
  );
}

function RulesSheet({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h2>The Law of the Court</h2>
        <div className="sub">how to play</div>
        <div className="card-panel hint">
          Ranks run <b>1–12</b> — one 1, twelve 12s — and <b>low beats high</b>. Lead any set of one rank. The next player must play the <b>same number of cards of a strictly lower rank</b>, or pass — and a pass benches you until that trick is won.
          Win the trick, lead again. First to empty their hand takes the crown — <b>King or Queen</b>, as they prefer; last is the <b>Peasant</b>.
          Each new round, the Peasant must formally <b>pay their two lowest cards</b> up to the Majesty (the Commoner pays one to the Heir) — nothing else may be offered — and each ruler <b>chooses</b> which cards to hand back in trade. Round one begins with whoever is dealt the lone <b>1</b>: that card is <b>discarded</b> on the spot and its holder leads, one card ahead. The full deck is reshuffled fresh every round, so the 1 rejoins play from round 2. Two <b>Jesters</b> roam the deck — wild alongside any set, but played alone they count as a lowly <b>13</b>. Draw <b>both</b> Jesters and you may declare <b>Revolution</b> — no taxes that round; if the Peasant declares, the whole court flips.
        </div>
        <button className="btn gold" style={{ textAlign: "center", marginTop: 18 }} onClick={onClose}><span className="t">Done</span></button>
      </div>
    </div>
  );
}

/* ============================================================ home */
function Home({ profile, onNav, onOpenSettings, onOpenAudio }) {
  return (
    <div className="wrap">
      <div className="topbar" style={{ paddingLeft: 0 }}>
        <span className="grow" />
        <button className="btn small" aria-label="Audio settings" onClick={onOpenAudio}><span className="t">🎵</span></button>
      </div>
      <div className="crest">
        <div className="rule">✦ ✦ ✦</div>
        <h1>Kings & <em>Peasants</em></h1>
        <div className="tagline">Shed your cards · claim the throne</div>
      </div>

      <div className="row card-panel profile-open" style={{ marginTop: 20, cursor: "pointer" }}
        role="button" tabIndex={0} aria-label="Open Your Standing"
        onClick={onOpenSettings}
        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onOpenSettings(); } }}>
        <Avatar p={profile} />
        <div className="grow">
          <div style={{ fontFamily: "var(--util)", fontWeight: 700 }}>{profile.name}</div>
          <div className="hint">Your name & portrait at court</div>
        </div>
      </div>

      <div className="sect">Take a seat</div>
      <button className="btn primary" onClick={() => onNav("ai")}>
        <span className="t">⚔️ Play against AI</span>
        <div className="d">2–10 seats · Squire, Knight or Royal opponents</div>
      </button>
      <button className="btn" onClick={() => onNav("browse")}>
        <span className="t">🏰 Join a lobby</span>
        <div className="d">Enter a code or browse open tables with real players</div>
      </button>
      <button className="btn" onClick={() => onNav("create")}>
        <span className="t">📜 Create a lobby</span>
        <div className="d">Host friends, add bots, set the number of rounds</div>
      </button>

      <div className="sect">The law of the court</div>
      <div className="card-panel hint">
        Ranks run <b>1–12</b> — one 1, twelve 12s — and <b>low beats high</b>. Lead any set of one rank. The next player must play the <b>same number of cards of a strictly lower rank</b>, or pass — and a pass benches you until that trick is won.
        Win the trick, lead again. First to empty their hand takes the crown — <b>King or Queen</b>, as they prefer; last is the <b>Peasant</b>.
        Each new round, the Peasant must formally <b>pay their two lowest cards</b> up to the Majesty (the Commoner pays one to the Heir) — nothing else may be offered — and each ruler <b>chooses</b> which cards to hand back in trade. Round one begins with whoever is dealt the lone <b>1</b>: that card is <b>discarded</b> on the spot and its holder leads, one card ahead. The full deck is reshuffled fresh every round, so the 1 rejoins play from round 2. Two <b>Jesters</b> roam the deck — wild alongside any set, but played alone they count as a lowly <b>13</b>. Draw <b>both</b> Jesters and you may declare <b>Revolution</b> — no taxes that round; if the Peasant declares, the whole court flips.
      </div>
    </div>
  );
}

/* ============================================================ AI setup */
function AISetup({ profile, onBack, onStart, onOpenAudio }) {
  const [bots, setBots] = useState(3);
  const [diff, setDiff] = useState("knight");
  const [rounds, setRounds] = useState(3);
  const [speed, setSpeed] = useState("fast");
  return (
    <div className="wrap">
      <div className="topbar" style={{ paddingLeft: 0 }}>
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="title grow" style={{ textAlign: "center" }}>Against the Machine Court</div>
        <button className="btn small" aria-label="Audio settings" onClick={onOpenAudio}><span className="t">🎵</span></button>
      </div>

      <div className="field"><label>Opponents ({bots} bot{bots > 1 ? "s" : ""} + you = {bots + 1} players)</label>
        <div className="stepper">
          <button aria-label="fewer bots" onClick={() => setBots(Math.max(1, bots - 1))}>−</button>
          <div className="val">{bots}</div>
          <button aria-label="more bots" onClick={() => setBots(Math.min(9, bots + 1))}>+</button>
        </div>
      </div>

      <div className="field"><label>Difficulty</label>
        <div className="pillrow">
          {DIFFS.map((d) => (
            <button key={d.id} className={"pill" + (diff === d.id ? " on" : "")} onClick={() => setDiff(d.id)}>{d.label}</button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>{DIFFS.find((d) => d.id === diff).desc}</div>
      </div>

      <div className="field"><label>Bot speed</label>
        <div className="pillrow">
          {BOT_SPEEDS.map((s) => (
            <button key={s.id} className={"pill" + (speed === s.id ? " on" : "")} onClick={() => setSpeed(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 8 }}>{BOT_SPEEDS.find((s) => s.id === speed).desc}</div>
      </div>

      <div className="field"><label>Rounds</label>
        <div className="stepper">
          <button aria-label="fewer rounds" onClick={() => setRounds(Math.max(1, rounds - 1))}>−</button>
          <div className="val">{rounds}</div>
          <button aria-label="more rounds" onClick={() => setRounds(Math.min(12, rounds + 1))}>+</button>
        </div>
      </div>

      <button className="btn gold" style={{ textAlign: "center", marginTop: 26 }} onClick={() => {
        const names = shuffle(BOT_NAMES).slice(0, bots);
        const players = [
          { id: profile.id, name: profile.name, avatar: profile.avatar, bot: false, royal: profile.royal || "majesty" },
          ...names.map((n) => ({ id: uid(), name: n, avatar: null, bot: true, diff, royal: Math.random() < 0.5 ? "king" : "queen" })),
        ];
        onStart(makeMatch(shuffle(players), { rounds, botSpeed: speed }, "local", null));
      }}>
        <span className="t">Deal the cards</span>
      </button>
    </div>
  );
}

/* ============================================================ lobby: create / browse / room */
const lobbyKey = (code) => `kp-lobby:${code}`;
const gameKey = (code) => `kp-game:${code}`;

function CreateLobby({ profile, onBack, onEnter, onOpenAudio }) {
  const [busy, setBusy] = useState(false);
  const [toast, showToast] = useToast();
  const create = async () => {
    setBusy(true);
    const code = makeCode();
    const lobby = {
      code, hostId: profile.id, status: "open", created: Date.now(),
      settings: { rounds: 3, botSpeed: "fast" },
      players: [{ id: profile.id, name: profile.name, avatar: profile.avatar, bot: false, royal: profile.royal || "majesty" }],
    };
    const ok = await sSet(lobbyKey(code), lobby, true);
    setBusy(false);
    if (ok) onEnter(code); else showToast("Couldn't create the lobby. Try again.");
  };
  return (
    <div className="wrap">
      <div className="topbar" style={{ paddingLeft: 0 }}>
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="title grow" style={{ textAlign: "center" }}>Found a Table</div>
        <button className="btn small" aria-label="Audio settings" onClick={onOpenAudio}><span className="t">🎵</span></button>
      </div>
      <div className="card-panel hint" style={{ marginTop: 8 }}>
        A four-letter code will be minted for your table. Share it with friends, add bots to fill empty chairs,
        and set the rounds before you deal. Lobbies are visible to anyone browsing open tables.
      </div>
      <button className="btn gold" style={{ textAlign: "center", marginTop: 18 }} disabled={busy} onClick={create}>
        <span className="t">{busy ? "Minting code…" : "Create lobby"}</span>
      </button>
      <Toast msg={toast} />
    </div>
  );
}

function BrowseLobbies({ profile, onBack, onEnter, onOpenAudio }) {
  const [lobbies, setLobbies] = useState(null);
  const [code, setCode] = useState("");
  const [toast, showToast] = useToast();

  const refresh = useCallback(async () => {
    const keys = await sList("kp-lobby:", true);
    const items = [];
    for (const k of keys.slice(0, 25)) {
      const l = await sGet(k, true);
      if (l && l.status === "open" && Date.now() - l.created < 1000 * 60 * 60 * 6) items.push(l);
    }
    items.sort((a, b) => b.created - a.created);
    setLobbies(items);
  }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 4000); return () => clearInterval(t); }, [refresh]);

  const join = async (c) => {
    const l = await sGet(lobbyKey(c), true);
    if (!l) return showToast(`No lobby found with code ${c}.`);
    if (l.status !== "open") return showToast("That match has already begun.");
    if (l.players.length >= 10) return showToast("That table is full (10 players).");
    if (!l.players.some((p) => p.id === profile.id)) {
      l.players.push({ id: profile.id, name: profile.name, avatar: profile.avatar, bot: false, royal: profile.royal || "majesty" });
      await sSet(lobbyKey(c), l, true);
    }
    onEnter(c);
  };

  return (
    <div className="wrap">
      <div className="topbar" style={{ paddingLeft: 0 }}>
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="title grow" style={{ textAlign: "center" }}>Open Tables</div>
        <button className="btn small" aria-label="Audio settings" onClick={onOpenAudio}><span className="t">🎵</span></button>
      </div>

      <div className="field"><label>Join by code</label>
        <div className="row">
          <input type="text" maxLength={4} value={code} placeholder="ABCD" style={{ letterSpacing: ".3em", textTransform: "uppercase" }}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
          <button className="btn small gold" disabled={code.length !== 4} onClick={() => join(code)}><span className="t">Join</span></button>
        </div>
      </div>

      <div className="sect">Browse</div>
      <div className="card-panel">
        {lobbies === null && <div className="hint"><span className="spin" /> Searching the realm…</div>}
        {lobbies && lobbies.length === 0 && <div className="hint">No open tables right now. Create one and invite your friends — or raise a court of bots.</div>}
        {lobbies && lobbies.map((l) => {
          const host = l.players.find((p) => p.id === l.hostId) || l.players[0];
          return (
            <div key={l.code} className="lobbyrowitem">
              <Avatar p={host} />
              <div className="grow">
                <div style={{ fontFamily: "var(--util)", fontWeight: 700 }}>{host ? host.name : "Unknown"}'s table</div>
                <div className="hint">{l.players.length}/10 seated · {l.settings.rounds} rounds · code {l.code}</div>
              </div>
              <button className="btn small" onClick={() => join(l.code)}><span className="t">Join</span></button>
            </div>
          );
        })}
      </div>
      <Toast msg={toast} />
    </div>
  );
}

function LobbyRoom({ profile, code, onBack, onGameStart }) {
  const [lobby, setLobby] = useState(null);
  const [toast, showToast] = useToast();
  const isHost = lobby && lobby.hostId === profile.id;

  const pull = useCallback(async () => {
    const l = await sGet(lobbyKey(code), true);
    if (!l) { showToast("The lobby was closed."); onBack(); return; }
    setLobby(l);
    if (l.status === "playing") onGameStart(code);
  }, [code, onBack, onGameStart, showToast]);
  useEffect(() => { pull(); const t = setInterval(pull, 1800); return () => clearInterval(t); }, [pull]);

  const push = async (mut) => {
    const l = await sGet(lobbyKey(code), true); if (!l) return;
    mut(l); await sSet(lobbyKey(code), l, true); setLobby({ ...l });
  };

  const addBot = (diff) => push((l) => {
    if (l.players.length >= 10) return;
    const used = l.players.map((p) => p.name);
    const name = BOT_NAMES.find((n) => !used.includes(n)) || "Bot " + ((Math.random() * 90 + 10) | 0);
    l.players.push({ id: uid(), name, avatar: null, bot: true, diff, royal: Math.random() < 0.5 ? "king" : "queen" });
  });
  const removePlayer = (id) => push((l) => { l.players = l.players.filter((p) => p.id !== id); });
  const setRounds = (r) => push((l) => { l.settings.rounds = r; });
  const setSpeed = (v) => push((l) => { l.settings.botSpeed = v; });

  const leave = async () => {
    if (isHost) { await sDel(lobbyKey(code), true); }
    else { await push((l) => { l.players = l.players.filter((p) => p.id !== profile.id); }); }
    onBack();
  };

  const start = async () => {
    const l = await sGet(lobbyKey(code), true); if (!l) return;
    if (l.players.length < 2) return showToast("You need at least 2 players.");
    const match = makeMatch(shuffle(l.players), l.settings, "online", code);
    await sSet(gameKey(code), match, true);
    l.status = "playing";
    await sSet(lobbyKey(code), l, true);
    onGameStart(code);
  };

  if (!lobby) return <div className="wrap"><div className="hint" style={{ marginTop: 40, textAlign: "center" }}><span className="spin" /> Entering the hall…</div></div>;

  return (
    <div className="wrap">
      <div className="topbar" style={{ paddingLeft: 0 }}>
        <button className="back" onClick={leave}>‹ Leave</button>
        <div className="title grow" style={{ textAlign: "center" }}>{isHost ? "Your Table" : "Waiting Hall"}</div>
        <span style={{ width: 52 }} />
      </div>

      <div className="codechip" aria-label={`Lobby code ${code}`}>{code}</div>
      <div className="hint" style={{ textAlign: "center", marginTop: 6 }}>Share this code so others can join. All data here is visible to players in the lobby.</div>

      <div className="sect">Seated ({lobby.players.length}/10)</div>
      <div className="card-panel">
        {lobby.players.map((p) => (
          <div key={p.id} className="lobbyrowitem">
            <Avatar p={p} />
            <div className="grow">
              <div style={{ fontFamily: "var(--util)", fontWeight: 700 }}>
                {p.name} {p.id === lobby.hostId && <span style={{ color: "var(--gilt)" }}>· host</span>} {p.id === profile.id && <span style={{ color: "var(--smoke)" }}>· you</span>}
              </div>
              <div className="hint">{p.bot ? `Bot — ${DIFFS.find((d) => d.id === p.diff)?.label || "Knight"}` : "Player"}</div>
            </div>
            {isHost && p.id !== profile.id && (
              <button className="btn small danger" onClick={() => removePlayer(p.id)} aria-label={`Remove ${p.name}`}><span className="t">✕</span></button>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <>
          <div className="sect">Add bots</div>
          <div className="pillrow">
            {DIFFS.map((d) => (
              <button key={d.id} className="pill" onClick={() => addBot(d.id)} disabled={lobby.players.length >= 10}>+ {d.label}</button>
            ))}
          </div>

          <div className="field"><label>Rounds</label>
            <div className="stepper">
              <button aria-label="fewer rounds" onClick={() => setRounds(Math.max(1, lobby.settings.rounds - 1))}>−</button>
              <div className="val">{lobby.settings.rounds}</div>
              <button aria-label="more rounds" onClick={() => setRounds(Math.min(12, lobby.settings.rounds + 1))}>+</button>
            </div>
          </div>

          <div className="field"><label>Bot speed</label>
            <div className="pillrow">
              {BOT_SPEEDS.map((s) => (
                <button key={s.id} className={"pill" + ((lobby.settings.botSpeed || "fast") === s.id ? " on" : "")} onClick={() => setSpeed(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>

          <button className="btn gold" style={{ textAlign: "center", marginTop: 22 }} disabled={lobby.players.length < 2} onClick={start}>
            <span className="t">Begin the match</span>
          </button>
        </>
      )}
      {!isHost && <div className="hint" style={{ textAlign: "center", marginTop: 22 }}><span className="spin" /> Waiting for the host to begin…</div>}
      <Toast msg={toast} />
    </div>
  );
}

/* ============================================================ court flute (synth voice) */
// A flute-like voice: near-sine tone + quiet octave overtone, soft breathy attack, light vibrato.
// bend < 1 lets a note droop for laments.
function fluteNote(ctx, f, t, dur, vol, bend = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.07, dur * 0.35));
  g.gain.setValueAtTime(Math.max(0.0002, vol), t + dur * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(ctx.destination);
  const o1 = ctx.createOscillator(); o1.type = "sine";
  const o2 = ctx.createOscillator(); o2.type = "sine";
  const oct = ctx.createGain(); oct.gain.value = 0.22;
  o1.frequency.setValueAtTime(f, t);
  o2.frequency.setValueAtTime(f * 2, t);
  if (bend !== 1) {
    o1.frequency.exponentialRampToValueAtTime(f * bend, t + dur);
    o2.frequency.exponentialRampToValueAtTime(f * 2 * bend, t + dur);
  }
  const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
  const depth = ctx.createGain(); depth.gain.value = f * 0.007;
  lfo.connect(depth); depth.connect(o1.frequency); depth.connect(o2.frequency);
  o1.connect(g); o2.connect(oct); oct.connect(g);
  o1.start(t); o2.start(t); lfo.start(t);
  o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}

/* ============================================================ taxation UI */
function MiniRow({ cards }) {
  return <div className="row" style={{ gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
    {cards.map((c, i) => <PCard key={i} rank={c} mini />)}
  </div>;
}

function PeasantPayer({ st, entryIdx, onConfirm }) {
  const e = st.tax[entryIdx];
  const hand = st.hands[e.giver];                        // sorted, lowest first
  const due = hand.slice(0, e.k);
  const dueCnt = {}; due.forEach((v) => (dueCnt[v] = (dueCnt[v] || 0) + 1));
  const groups = groupHand(hand);
  const ranks = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const [selCnt, setSelCnt] = useState({});
  const total = Object.values(selCnt).reduce((a, b) => a + b, 0);
  const tap = (r, i) => {
    const allowed = dueCnt[r] || 0;
    if (i >= allowed) return;                            // greyed-out card
    const cur = selCnt[r] || 0;
    if (i < cur) setSelCnt({ ...selCnt, [r]: cur - 1 });
    else if (cur < allowed && total < e.k) setSelCnt({ ...selCnt, [r]: cur + 1 });
  };
  const chosen = [];
  for (const r of ranks) for (let i = 0; i < (selCnt[r] || 0); i++) chosen.push(r);
  const nm = (v) => (v === 13 ? "Jester" : v);
  return (
    <div className="overlay">
      <div className="sheet">
        <h2>Pay Your Taxes</h2>
        <div className="sub">owed to {st.players[e.taker].name}</div>
        <div className="hint" style={{ textAlign: "center", marginBottom: 8 }}>
          The law claims your <b>{e.k} lowest card{e.k > 1 ? "s" : ""}</b>. Nothing else may be offered — the rest of your hand is sealed.
        </div>
        <div className="row" style={{ gap: 4, flexWrap: "wrap", justifyContent: "center", padding: "10px 0 16px" }}>
          {ranks.flatMap((r) => Array.from({ length: groups[r] }, (_, i) => {
            const payable = i < (dueCnt[r] || 0);
            return <PCard key={r + "-" + i} rank={r} mini locked={!payable}
              sel={i < (selCnt[r] || 0)} onClick={payable ? () => tap(r, i) : undefined} />;
          }))}
        </div>
        <button className="btn gold" style={{ textAlign: "center" }} disabled={total !== e.k}
          onClick={() => onConfirm(chosen)}>
          <span className="t">{total === e.k ? `Pay ${chosen.map(nm).join(" & ")} to ${st.players[e.taker].name}` : `Select ${e.k - total} more`}</span>
        </button>
      </div>
    </div>
  );
}

function TaxChooser({ st, entryIdx, onConfirm }) {
  const e = st.tax[entryIdx];
  const hand = st.hands[e.taker];
  const groups = groupHand(hand);
  const ranks = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const [selCnt, setSelCnt] = useState({});
  const total = Object.values(selCnt).reduce((a, b) => a + b, 0);
  const tap = (r, i) => {
    const c = selCnt[r] || 0;
    if (i < c) setSelCnt({ ...selCnt, [r]: c - 1 });
    else if (total < e.k) setSelCnt({ ...selCnt, [r]: c + 1 });
  };
  const chosen = [];
  for (const r of ranks) for (let i = 0; i < (selCnt[r] || 0); i++) chosen.push(r);
  return (
    <div className="overlay">
      <div className="sheet">
        <h2>Collect Your Taxes</h2>
        <div className="sub">received from {st.players[e.giver].name}</div>
        <MiniRow cards={e.taken} />
        <div className="hint" style={{ textAlign: "center", margin: "12px 0 8px" }}>
          These {e.k === 1 ? "is" : "are"} now yours. Choose <b>{e.k} card{e.k > 1 ? "s" : ""}</b> from your hand to send back
          — any card{e.k > 1 ? "s" : ""}, including what you just received.
        </div>
        <div className="row" style={{ gap: 4, flexWrap: "wrap", justifyContent: "center", padding: "10px 0 16px" }}>
          {ranks.flatMap((r) => Array.from({ length: groups[r] }, (_, i) => (
            <PCard key={r + "-" + i} rank={r} mini sel={i < (selCnt[r] || 0)} onClick={() => tap(r, i)} />
          )))}
        </div>
        <button className="btn gold" style={{ textAlign: "center" }} disabled={total !== e.k}
          onClick={() => onConfirm(chosen)}>
          <span className="t">{total === e.k ? `Send back ${chosen.map((c) => c === 13 ? "Jester" : c).join(" & ")}` : `Choose ${e.k - total} more`}</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================ game table (local + online) */
export function GameTable({ profile, mode, initial, code, sfxVol = 1, haptics = true, onOpenAudio, onExit }) {
  const [st, setSt] = useState(initial || null);
  const stRef = useRef(st); stRef.current = st;
  const [sel, setSel] = useState(null); // {rank, count}
  const [toast, showToast] = useToast();
  const botTimer = useRef(null);
  const lastBotVer = useRef(-1);

  const online = mode === "online";
  const [taxSeen, setTaxSeen] = useState(0);
  const [fast, setFast] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showRules, setShowRules] = useState(false);
  useEffect(() => { setFast(false); }, [st && st.round]);   // each new deal starts at normal speed
  const audioCtxRef = useRef(null);
  const ensureCtx = () => {
    if (!audioCtxRef.current) { try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    return audioCtxRef.current;
  };
  useEffect(() => {
    const prime = () => { const c = ensureCtx(); if (c && c.state === "suspended") { try { c.resume(); } catch {} } };
    window.addEventListener("pointerdown", prime);
    return () => window.removeEventListener("pointerdown", prime);
  }, []);
  const chime = useCallback(() => {
    const ctx = ensureCtx(); if (!ctx || sfxVol <= 0) return;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    fluteNote(ctx, 659, t, 0.32, 0.16 * sfxVol);
    fluteNote(ctx, 880, t + 0.15, 0.42, 0.16 * sfxVol);
  }, [sfxVol]);

  // five ranking motifs: 1 triumphant fanfare … 3 neutral … 5 sad trombone
  const playRankSound = useCallback((tier, delay = 0) => {
    const ctx = ensureCtx(); if (!ctx || sfxVol <= 0) return;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + delay;
    const seqs = {
      1: { vol: 0.2, notes: [[523, 0, 0.2], [659, 0.16, 0.2], [784, 0.32, 0.2], [1047, 0.5, 0.75]] },        // triumphant flourish
      2: { vol: 0.18, notes: [[392, 0, 0.18], [523, 0.15, 0.18], [659, 0.31, 0.45]] },                        // pleasant rise
      3: { vol: 0.14, notes: [[440, 0, 0.24], [440, 0.28, 0.3]] },                                            // neutral two-tap
      4: { vol: 0.16, notes: [[294, 0, 0.28], [220, 0.3, 0.5]] },                                             // gentle sigh
      5: { vol: 0.15, bend: 0.92, notes: [[330, 0, 0.32], [294, 0.32, 0.32], [262, 0.64, 0.32], [196, 0.96, 0.9]] }, // drooping lament
    };
    const sq = seqs[tier] || seqs[3];
    sq.notes.forEach(([f, d, len]) => fluteNote(ctx, f, t0 + d, len, sq.vol * sfxVol, sq.bend || 1));
  }, [sfxVol]);

  // play the matching motif whenever a player's final placement lands (incl. the stuck Peasant at round end)
  const finSig = st ? st.round + ":" + st.finished.length : null;
  const prevFin = useRef(null);
  useEffect(() => {
    const cur = stRef.current;
    if (!cur) return;
    const now = { round: cur.round, count: cur.finished.length };
    const prev = prevFin.current;
    prevFin.current = now;
    if (!prev || prev.round !== cur.round || now.count <= prev.count) return; // new round / rejoin: stay silent
    const n = cur.players.length;
    const me = cur.players.findIndex((p) => p.id === profile.id);
    for (let i = prev.count; i < now.count; i++) {
      if (cur.finished[i] !== me) continue;            // only your own fate is heard
      playRankSound(rankTier(i, n));
    }
  }, [finSig, playRankSound, profile.id]);

  // ---- online sync
  const pull = useCallback(async () => {
    if (!online) return;
    const g = await sGet(gameKey(code), true);
    if (g && (!stRef.current || g.version > stRef.current.version)) setSt(g);
  }, [online, code]);
  useEffect(() => { if (online) { pull(); const t = setInterval(pull, 1500); return () => clearInterval(t); } }, [online, pull]);

  const commit = useCallback(async (ns) => {
    setSt(ns); setSel(null);
    if (online) await sSet(gameKey(code), ns, true);
  }, [online, code]);

  // who am I / who drives bots
  const myIdx = st ? st.players.findIndex((p) => p.id === profile.id) : -1;
  const driverIdx = st ? st.players.findIndex((p) => !p.bot) : -1;
  const iDrive = !online || myIdx === driverIdx;

  // ---- bot loop
  useEffect(() => {
    if (!st || st.phase !== "play") return;
    const pIdx = st.seatOrder[st.turn];
    const p = st.players[pIdx];
    if (!p.bot || !iDrive) return;
    if (online && lastBotVer.current === st.version) return;
    lastBotVer.current = st.version;
    clearTimeout(botTimer.current);
    botTimer.current = setTimeout(() => {
      const cur = stRef.current;
      if (!cur || cur.phase !== "play" || cur.version !== st.version) return;
      const mv = botChoose(cur, p.diff || "knight");
      commit(applyAction(cur, mv));
    }, fast ? 120 : BOT_DELAY[online ? "online" : "local"][(st.settings && st.settings.botSpeed) || "fast"]);
    return () => clearTimeout(botTimer.current);
  }, [st, iDrive, online, commit, fast]);

  // turn notification — must live above the early return (hooks can't be conditional)
  const myTurnNow = !!st && st.phase === "play" && myIdx >= 0 &&
    st.seatOrder.indexOf(myIdx) === st.turn && (st.hands[myIdx] || []).length > 0;
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (myTurnNow && !wasMyTurn.current) {
      chime();
      // one gentle pulse, phones only, honoring the Audio Settings toggle
      try { if (haptics && isPhone()) navigator.vibrate(30); } catch {}
    }
    wasMyTurn.current = myTurnNow;
  }, [myTurnNow, chime, haptics]);

  // no legal play: a 3-second grace window to pass yourself, then auto-pass
  const mustPassNow = myTurnNow && legalPlays(st.hands[myIdx], st.trick, st.round === 1).length === 0;
  const [countdown, setCountdown] = useState(null);
  useEffect(() => {
    if (!mustPassNow) { setCountdown(null); return; }
    setCountdown(5);
    const ver = st.version;
    const iv = setInterval(() => setCountdown((c) => (c && c > 1 ? c - 1 : c)), 1000);
    const to = setTimeout(() => {
      const cur = stRef.current;
      if (cur && cur.version === ver && cur.phase === "play") commit(applyAction(cur, { type: "pass" }));
    }, 5000);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [mustPassNow, st && st.version, commit]);

  // multiplayer move clock: 15 seconds to act, then you auto-pass (your own client enforces it)
  const [turnClock, setTurnClock] = useState(null);
  useEffect(() => {
    if (!online || !myTurnNow || mustPassNow) { setTurnClock(null); return; }
    setTurnClock(15);
    const ver = st.version;
    const iv = setInterval(() => setTurnClock((c) => (c && c > 1 ? c - 1 : c)), 1000);
    const to = setTimeout(() => {
      const cur = stRef.current;
      if (cur && cur.version === ver && cur.phase === "play") commit(applyAction(cur, { type: "pass" }));
    }, 15000);
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [online, myTurnNow, mustPassNow, st && st.version, commit]);

  // driver watchdog: if a (possibly disconnected) human stalls past the clock, pass for them
  const stallRef = useRef({ ver: -1, ts: 0 });
  useEffect(() => {
    if (!online || !iDrive) return;
    const iv = setInterval(() => {
      const cur = stRef.current;
      if (!cur || cur.phase !== "play") return;
      if (stallRef.current.ver !== cur.version) { stallRef.current = { ver: cur.version, ts: Date.now() }; return; }
      const p = cur.players[cur.seatOrder[cur.turn]];
      if (p.bot || p.id === profile.id) return;
      if (Date.now() - stallRef.current.ts > 18000) {
        stallRef.current.ts = Date.now();
        commit(applyAction(cur, { type: "pass" }));
      }
    }, 2000);
    return () => clearInterval(iv);
  }, [online, iDrive, commit]);

  // bot tax decisions: the driver resolves them one by one after a beat, so peons watch it happen
  const taxTimer = useRef(null);
  const lastTaxVer = useRef(-1);
  useEffect(() => {
    if (!st || st.phase !== "tax" || !st.tax || !iDrive) return;
    // Never let the driver act on the seated human's own entries — a card swap or payment
    // that touches YOUR hand must always come from a tap of yours, never a timer. We check
    // both the seat's bot flag AND its identity against yours, so a stale/incorrect bot flag
    // can never silently resolve your choice.
    const isMine = (idx) => idx === myIdx;
    const payIdx = st.tax.findIndex((e) => !e.taken && st.players[e.giver].bot && !isMine(e.giver));
    const retIdx = st.tax.findIndex((e) => e.taken && !e.returned && st.players[e.taker].bot && !isMine(e.taker));
    if (payIdx < 0 && retIdx < 0) return;
    if (online && lastTaxVer.current === st.version) return;
    lastTaxVer.current = st.version;
    clearTimeout(taxTimer.current);
    taxTimer.current = setTimeout(() => {
      const cur = stRef.current;
      if (!cur || cur.phase !== "tax" || cur.version !== st.version || !cur.tax) return;
      const p2 = cur.tax.findIndex((e) => !e.taken && cur.players[e.giver].bot && !isMine(e.giver));
      if (p2 >= 0) { const e = cur.tax[p2]; commit(resolveTaxPayment(cur, p2, cur.hands[e.giver].slice(0, e.k))); return; }
      const r2 = cur.tax.findIndex((e) => e.taken && !e.returned && cur.players[e.taker].bot && !isMine(e.taker));
      if (r2 >= 0) { const e = cur.tax[r2]; commit(resolveTaxReturn(cur, r2, botTaxPick(cur.hands[e.taker], e.k))); }
    }, online ? 1600 : 1300);
    return () => clearTimeout(taxTimer.current);
  }, [st, iDrive, online, commit]);

  if (!st) return <div className="wrap"><div className="hint" style={{ marginTop: 40, textAlign: "center" }}><span className="spin" /> Shuffling…</div></div>;

  const n = st.seatOrder.length;
  const mySeat = st.seatOrder.indexOf(myIdx);
  const myHand = myIdx >= 0 ? (st.hands[myIdx] || []) : [];
  const myTurn = st.phase === "play" && st.turn === mySeat && myHand.length > 0;
  const groups = groupHand(myHand);
  const rankList = Object.keys(groups).map(Number).sort((a, b) => a - b);
  const legal = myTurn ? legalPlays(myHand, st.trick, st.round === 1) : [];
  const canPlaySel = sel && legal.some((m) => m.rank === sel.rank && m.count === sel.count);
  const mustPass = myTurn && legal.length === 0;
  const turnPlayer = st.players[st.seatOrder[st.turn]];

  const jokersHeld = groups[13] || 0;
  const jokersUsed = sel && sel.rank !== 13 ? Math.max(0, sel.count - (groups[sel.rank] || 0)) : 0;
  const tapGroup = (r) => {
    if (!myTurn) return;
    if (st.trick) {
      const ok = legal.some((m) => m.rank === r);
      if (!ok) {
        showToast(r === 13 ? "A lone Jester is a 13 — it beats nothing. Tap another rank to use it as a wild."
          : st.trick.rank <= r ? `Needs a rank below ${st.trick.rank}.`
          : `You need ${st.trick.count} of that rank, even counting wilds.`);
        return;
      }
      setSel(sel && sel.rank === r ? null : { rank: r, count: st.trick.count });
    } else {
      setSel(sel && sel.rank === r ? null : { rank: r, count: groups[r] });
    }
  };

  const doPlay = () => { if (canPlaySel) commit(applyAction(st, { type: "play", ...sel })); };
  const doPass = () => { if (myTurn && (st.trick || mustPass)) commit(applyAction(st, { type: "pass" })); };
  const nextRound = () => commit(startRound(st));

  const scoreRows = st.players.map((p, i) => ({ p, i, pts: st.scores[i] })).sort((a, b) => b.pts - a.pts);

  return (
    <div className="game">
      <div className="gamehead">
        <button className="back" style={{ background: "none", color: "var(--gilt)", fontWeight: 700 }}
          onClick={() => { if (!online && st.phase !== "matchEnd") setConfirmExit(true); else onExit(); }}>‹ Exit</button>
        <div>Round <b>{st.round}</b> / {st.settings.rounds}{online ? <> · <b>{code}</b></> : null}</div>
        <div className="row" style={{ gap: 8 }}>
          <span>You: <b>{st.scores[myIdx] ?? 0} pts</b></span>
          <button className="back" style={{ padding: "2px 4px", fontSize: 15 }} aria-label="Audio settings" onClick={onOpenAudio}>🎵</button>
          <button className="back" style={{ padding: "2px 4px", fontSize: 15 }} aria-label="How to play" onClick={() => setShowRules(true)}>❓</button>
        </div>
      </div>

      <div className="felt">
        {(() => {
          const mySeatSafe = mySeat >= 0 ? mySeat : 0;
          const order = [];                                     // clockwise from the seat after you
          for (let k = 1; k < n; k++) order.push((mySeatSafe + k) % n);
          const sides = Math.floor(order.length / 3);           // e.g. 9 opponents -> 3 left, 3 top, 3 right
          const leftG = order.slice(0, sides);
          const topG = order.slice(sides, order.length - sides);
          const rightG = order.slice(order.length - sides);
          const SeatTile = ({ seat }) => {
            const pIdx = st.seatOrder[seat];
            const p = st.players[pIdx];
            const title = royalName(p, seatTitle(seat, n, st.round));
            const crown = seatCrown(title);
            const finPos = st.finished.indexOf(pIdx);
            const out = st.hands[pIdx].length === 0 && st.phase === "play";
            return (
              <div className={"seat round" + (st.phase === "play" && st.turn === seat ? " turn" : "") + (out ? " out" : "")}>
                {crown && <div className="crown">{crown}</div>}
                {finPos >= 0 && st.phase === "play" && <div className="finmedal">{finPos + 1}</div>}
                {st.passSet.includes(seat) && <div className="passtag">Pass</div>}
                <div style={{ display: "flex", justifyContent: "center" }}><Avatar p={p} /></div>
                <div className="nm">{st.trick && st.trick.byIdx === pIdx && <span className="laststar" title="Their cards are in play">★ </span>}{p.name}{pIdx === myIdx ? " (you)" : ""}</div>
                <div className="ttl">{title}</div>
                <div className="cnt">{out ? "out" : `${st.hands[pIdx].length} cards`} · {st.scores[pIdx]} pts</div>
              </div>
            );
          };
          return (
            <>
              <div className="trow">{topG.map((seat) => <SeatTile key={seat} seat={seat} />)}</div>
              <div className="lcol">{[...leftG].reverse().map((seat) => <SeatTile key={seat} seat={seat} />)}</div>
              <div className="ccell">
                <div className="centerstack">
                  {st.trick ? (
                    <>
                      <div className="lead">{st.players[st.trick.byIdx].name} laid down</div>
                      <div className={"trickcards" + (st.trick.count > 5 ? " dense" : "")}>
                        {Array.from({ length: st.trick.count - (st.trick.jokers || 0) }, (_, i) => <PCard key={"n" + i} rank={st.trick.rank} mini />)}
                        {Array.from({ length: st.trick.jokers || 0 }, (_, i) => <PCard key={"j" + i} rank={13} mini />)}
                      </div>
                      <div className="beat">Beat it with {st.trick.count} card{st.trick.count > 1 ? "s" : ""} below rank {st.trick.rank}</div>
                    </>
                  ) : (
                    <>
                      <div className="lead">Open table</div>
                      <div className="beat" style={{ marginTop: 0 }}>{st.phase === "play" ? `${turnPlayer.name} leads any set of one rank` : "—"}</div>
                    </>
                  )}
                  <div className="logline">{st.log[st.log.length - 1]}</div>
                </div>
              </div>
              <div className="rcol">{rightG.map((seat) => <SeatTile key={seat} seat={seat} />)}</div>
              <div className="brow"><SeatTile seat={mySeatSafe} /></div>
            </>
          );
        })()}
      </div>

      <div className="handzone">
        <div className="handlabel">
          <span>Your hand · {myHand.length}{(() => { const hs = handStrength(myHand); return hs ? <span className="strength" title={`${hs.label} hand`}> · {"★".repeat(hs.stars)}{"☆".repeat(5 - hs.stars)} {hs.label}</span> : null; })()}</span>
          <span style={{ color: myTurn ? "var(--gilt)" : "var(--smoke)" }}>
            {st.phase !== "play" ? "round over" : myTurn ? (mustPass ? `no legal play — auto-pass in ${countdown ?? 5}…` : online && turnClock ? `your move · ${turnClock}s` : "your move") : myHand.length === 0 ? "you're out — well played" : st.passSet.includes(mySeat) ? "you passed — benched until the next lead" : `${turnPlayer.name}'s move`}
          </span>
        </div>
        <div className="hand">
          {rankList.map((r) => (
            <div className="grp" key={r}>
              {Array.from({ length: groups[r] }, (_, i) => (
                <PCard key={i} rank={r}
                  sel={sel && ((sel.rank === r && i < sel.count) || (r === 13 && sel.rank !== 13 && i < jokersUsed))}
                  onClick={() => tapGroup(r)} />
              ))}
            </div>
          ))}
          {myHand.length === 0 && (() => {
            const finPos = st.finished.indexOf(myIdx);
            if (finPos < 0) return <div className="hint" style={{ padding: "20px 8px" }}>Hand empty — watching the peons scrap it out.</div>;
            const ord = ["1st", "2nd", "3rd"][finPos] || `${finPos + 1}th`;
            const finalRound = st.round >= st.settings.rounds;
            const title = royalName(st.players[myIdx], seatTitle(finPos, n, st.round + 1));
            const crown = seatCrown(title);
            return (
              <div className="hint" style={{ padding: "16px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--util)", fontWeight: 800, fontSize: 14, color: "var(--gilt)" }}>
                  {crown ? crown + " " : ""}You finished {ord}{finalRound ? "" : ` — next round you sit as the ${title}`}
                </div>
                <div style={{ marginTop: 6 }}>Hand empty — watching the peons scrap it out.</div>
              </div>
            );
          })()}
        </div>

        {sel && !st.trick && (sel.rank === 13 ? jokersHeld : groups[sel.rank] + jokersHeld) > 1 && (
          <div className="countpick">
            <span>Play</span>
            {Array.from({ length: sel.rank === 13 ? jokersHeld : groups[sel.rank] + jokersHeld }, (_, i) => i + 1).map((c) => (
              <button key={c} className={"pill" + (sel.count === c ? " on" : "")} onClick={() => setSel({ rank: sel.rank, count: c })}>{c}</button>
            ))}
            <span>{sel.rank === 13 ? "Jesters (as 13s)" : jokersUsed > 0 ? `of ${sel.rank} — ${jokersUsed} wild` : `of your ${sel.rank}s`}</span>
          </div>
        )}

        {!online && st.phase === "play" && myHand.length === 0 ? (
          <div className="actions">
            <button className="btn gold playbtn" onClick={() => setFast((f) => !f)}>
              <span className="t">{fast ? "▶ Watching at speed — tap for normal" : "⏩ Speed up the rest of the round"}</span>
            </button>
          </div>
        ) : (
          <div className="actions">
            <button className="btn gold playbtn" disabled={!canPlaySel} onClick={doPlay}>
              <span className="t">{sel ? (sel.rank === 13 ? `Play ${sel.count} Jester${sel.count > 1 ? "s" : ""}` : `Play ${sel.count} × ${sel.rank}${jokersUsed ? ` (+${jokersUsed} wild)` : ""}`) : "Play"}</span>
            </button>
            <button className="btn passbtn" disabled={!myTurn || (!st.trick && !mustPass)} onClick={doPass}>
              <span className="t">{mustPass && countdown ? `Pass (${countdown})` : "Pass"}</span>
            </button>
          </div>
        )}
      </div>

      {st.phase === "revolt" && st.revolt && (
        <div className="overlay">
          <div className="sheet">
            <h2>⚔️ Revolution?</h2>
            <div className="sub">both Jesters in one hand</div>
            {st.revolt.pIdx === myIdx ? (
              <>
                <div className="hint" style={{ textAlign: "center", lineHeight: 1.6 }}>
                  You were dealt <b>both Jesters</b>. Declare a revolution and <b>no taxes are paid</b> this round
                  {st.revolt.seat === n - 1 ? <> — and as the Peasant, the <b>whole court flips</b>: you take the throne!</> : "."}
                  {(st.revolt.seat === 0 || (n >= 4 && st.revolt.seat === 1)) && <> Beware — you would forfeit the tax you were owed.</>}
                </div>
                <button className="btn gold" style={{ textAlign: "center", marginTop: 16 }} onClick={() => commit(resolveRevolt(st, true))}>
                  <span className="t">{st.revolt.seat === n - 1 ? "⚔️ Overturn the court" : "⚔️ Declare revolution"}</span>
                </button>
                <button className="btn" style={{ textAlign: "center", marginTop: 10 }} onClick={() => commit(resolveRevolt(st, false))}>
                  <span className="t">Let the taxes be paid</span>
                </button>
              </>
            ) : (
              <div className="hint" style={{ textAlign: "center" }}>
                <b>{st.players[st.revolt.pIdx].name}</b> was dealt both Jesters…<br /><span className="spin" /> awaiting their decision.
              </div>
            )}
          </div>
        </div>
      )}

      {(st.phase === "roundEnd" || st.phase === "matchEnd") && (
        <div className="overlay">
          <div className="sheet">
            <h2>{st.phase === "matchEnd" ? "The Court Adjourns" : `Round ${st.round} Complete`}</h2>
            <div className="sub">{st.phase === "matchEnd" ? "final standings" : "standings so far"}</div>
            {st.phase === "roundEnd" && st.round < st.settings.rounds && st.finished.indexOf(myIdx) >= 0 && (() => {
              const finPos = st.finished.indexOf(myIdx);
              const title = royalName(st.players[myIdx], seatTitle(finPos, n, st.round + 1));
              const crown = seatCrown(title);
              return (
                <div className="hint" style={{ textAlign: "center", marginBottom: 10, fontFamily: "var(--util)", fontWeight: 800, color: "var(--gilt)" }}>
                  {crown ? crown + " " : ""}Next round you sit as the {title}
                </div>
              );
            })()}
            <table className="standings">
              <thead><tr><th aria-hidden="true"></th><th>Player</th><th className="pts">Points</th></tr></thead>
              <tbody>
              {scoreRows.map((r, i) => (
                <tr key={r.p.id}>
                  <td className="place">{i + 1}.</td>
                  <td><div className="row"><Avatar p={r.p} /><span style={{ fontWeight: r.i === myIdx ? 800 : 500 }}>{st.phase === "matchEnd" && i === 0 ? `👑 ${royalName(r.p, "King")} ` : ""}{r.p.name}{r.i === myIdx ? " (you)" : ""}</span></div></td>
                  <td className="pts">{r.pts}</td>
                </tr>
              ))}
            </tbody></table>

            {st.phase === "roundEnd" && (
              <div className="taxnote">
                Next round, seats follow this round's finish order. <b>{st.players[st.seatOrder[0]].name}</b> takes the throne
                and will tax <b>{st.players[st.seatOrder[n - 1]].name}</b>'s two lowest cards{n >= 4 ? (
                  <> — and <b>{st.players[st.seatOrder[1]].name}</b> taxes one from <b>{st.players[st.seatOrder[n - 2]].name}</b></>
                ) : null} — unless both Jesters land in one hand and a revolution is declared.
              </div>
            )}

            {st.phase === "roundEnd" ? (
              iDrive ? (
                <button className="btn gold" style={{ textAlign: "center", marginTop: 16 }} onClick={nextRound}>
                  <span className="t">Deal round {st.round + 1}</span>
                </button>
              ) : (
                <div className="hint" style={{ textAlign: "center", marginTop: 16 }}><span className="spin" /> Waiting for the next deal…</div>
              )
            ) : (
              <>
                <div className="taxnote" style={{ textAlign: "center" }}>
                  🏆 <b>{scoreRows[0].p.name}</b> rules as the true {royalName(scoreRows[0].p, "King")}.
                </div>
                <button className="btn gold" style={{ textAlign: "center", marginTop: 16 }} onClick={async () => {
                  if (online && iDrive) { await sDel(gameKey(code), true); await sDel(lobbyKey(code), true); }
                  onExit();
                }}>
                  <span className="t">Return home</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {st.phase === "tax" && st.tax && (() => {
        const payIdx = st.tax.findIndex((e) => e.giver === myIdx && !e.taken);
        if (payIdx >= 0) return <PeasantPayer key={"pay" + st.round + "-" + payIdx} st={st} entryIdx={payIdx}
          onConfirm={(cards) => commit(resolveTaxPayment(st, payIdx, cards))} />;
        const mine = st.tax.findIndex((e) => e.taker === myIdx && e.taken && !e.returned);
        if (mine >= 0) return <TaxChooser key={"ret" + st.round + "-" + mine} st={st} entryIdx={mine}
          onConfirm={(cards) => commit(resolveTaxReturn(st, mine, cards))} />;
        return (
          <div className="overlay">
            <div className="sheet">
              <h2>Taxation</h2>
              <div className="sub">the court collects</div>
              {st.tax.map((e, i) => {
                const involved = e.giver === myIdx || e.taker === myIdx;
                const gNm = <b>{st.players[e.giver].name}{e.giver === myIdx ? " (you)" : ""}</b>;
                const tNm = <b>{st.players[e.taker].name}{e.taker === myIdx ? " (you)" : ""}</b>;
                return (
                  <div key={i} className="taxnote" style={{ textAlign: "center" }}>
                    {!e.taken ? (
                      <span><span className="spin" /> {gNm} is paying their {e.k} lowest card{e.k > 1 ? "s" : ""} to {tNm}…</span>
                    ) : involved ? (
                      <>
                        {gNm} paid to {tNm}:
                        <div style={{ margin: "8px 0" }}><MiniRow cards={e.taken} /></div>
                        {e.returned
                          ? <>returned in trade:<div style={{ marginTop: 8 }}><MiniRow cards={e.returned} /></div></>
                          : <span><span className="spin" /> {st.players[e.taker].name} is choosing what to return…</span>}
                      </>
                    ) : (
                      <span>
                        {gNm} paid {e.k} card{e.k > 1 ? "s" : ""} to {tNm}
                        {e.returned ? " and received the same number back — the cards are sealed from view." : <> — <span className="spin" /> awaiting the return.</>}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {st.phase === "play" && st.round > 1 && taxSeen !== st.round && (st.lastTax || st.taxReport) && (
        <div className="overlay">
          <div className="sheet">
            <h2>{st.lastTax ? "Taxes Collected" : "⚔️ Revolution"}</h2>
            <div className="sub">before round {st.round} begins</div>
            {st.lastTax && st.taxReport && st.taxReport.length > st.lastTax.length && (
              <div className="hint" style={{ textAlign: "center", marginBottom: 8 }}>{st.taxReport[0]}</div>
            )}
            {st.lastTax ? st.lastTax.map((e, i) => {
              const involved = e.giver === myIdx || e.taker === myIdx;
              return involved ? (
                <div key={i} className="taxnote" style={{ textAlign: "center" }}>
                  <b>{st.players[e.taker].name}{e.taker === myIdx ? " (you)" : ""}</b> took from <b>{st.players[e.giver].name}{e.giver === myIdx ? " (you)" : ""}</b>:
                  <div style={{ margin: "8px 0" }}><MiniRow cards={e.taken} /></div>
                  and returned:
                  <div style={{ marginTop: 8 }}><MiniRow cards={e.returned} /></div>
                </div>
              ) : (
                <div key={i} className="taxnote" style={{ textAlign: "center" }}>
                  <b>{st.players[e.taker].name}</b> collected {e.k} card{e.k > 1 ? "s" : ""} from <b>{st.players[e.giver].name}</b> and returned {e.k}.
                </div>
              );
            }) : (st.taxReport || []).map((t, i) => <div key={i} className="taxnote" style={{ textAlign: "center" }}>{t}</div>)}
            <button className="btn gold" style={{ textAlign: "center", marginTop: 14 }} onClick={() => setTaxSeen(st.round)}>
              <span className="t">Begin round {st.round}</span>
            </button>
          </div>
        </div>
      )}
      {confirmExit && (
        <div className="overlay" onClick={() => setConfirmExit(false)}>
          <div className="sheet" onClick={(ev) => ev.stopPropagation()}>
            <h2>Leave the table?</h2>
            <div className="sub">are you sure?</div>
            <div className="hint" style={{ textAlign: "center" }}>Your match against the bots will be abandoned and can't be resumed.</div>
            <button className="btn gold" style={{ textAlign: "center", marginTop: 16 }} onClick={() => setConfirmExit(false)}>
              <span className="t">Keep playing</span>
            </button>
            <button className="btn danger" style={{ textAlign: "center", marginTop: 10 }} onClick={onExit}>
              <span className="t">Exit game</span>
            </button>
          </div>
        </div>
      )}
      {showRules && <RulesSheet onClose={() => setShowRules(false)} />}
      <Toast msg={toast} />
    </div>
  );
}

export { makeMatch, startRound, resolveTaxReturn, resolveTaxPayment, botTaxPick, rankTier, applyAction, botChoose, resolveRevolt };

/* ============================================================ menu music (full-quality files in /music) */
const MUSIC_TRACKS = [
  { name: "Chant of the Conqueror", src: "music/Chant_of_the_Conqueror.mp3" },
  { name: "Conquest of Cards", src: "music/Conquest_of_Cards.mp3" },
  { name: "Epic Card Battle", src: "music/Epic_Card_Battle.mp3" },
  { name: "Climb the Leaderboard", src: "music/Climb_the_Leaderboard.mp3" },
];

/* ============================================================ app shell */
export default function App() {
  const [screen, setScreen] = useState("loading"); // home | ai | browse | create | lobby | game
  const [profile, setProfile] = useState(null);
  const [audioPrefs, setAudioPrefs] = useState({ music: 0.25, sfx: 0.5, muted: false, haptics: true });
  const prefsRef = useRef(audioPrefs); prefsRef.current = audioPrefs;
  const updateAudio = (patch) => setAudioPrefs((p) => { const np = { ...p, ...patch }; sSet("kp-audio", np, false); return np; });
  const effMusic = () => prefsRef.current.music;

  // Sequential playlist with live crossfades: Chant of the Conqueror opens, each track blends
  // into the next (2.5s overlap), looping the list forever. Runs on Web Audio buffers.
  const [nowIdx, setNowIdx] = useState(-1);
  const [userPaused, setUserPaused] = useState(false);
  const musicCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const curRef = useRef(null);            // { node, gain, end, idx }
  const fadingRef = useRef(false);
  const buffersRef = useRef({});
  const fetchTrack = async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("track missing: " + url);
    return res.arrayBuffer();
  };
  const ensureMusicCtx = () => {
    if (!musicCtxRef.current) {
      try {
        const C = window.AudioContext || window.webkitAudioContext;
        const ctx = new C();
        const g = ctx.createGain();
        g.gain.value = effMusic();
        g.connect(ctx.destination);
        musicCtxRef.current = ctx; masterGainRef.current = g;
      } catch {}
    }
    return musicCtxRef.current;
  };
  const playTrack = async (i, fadeIn = 0, keepOld = false) => {
    if (!MUSIC_TRACKS.length) return;                       // preview build ships without tracks
    const ctx = ensureMusicCtx(); if (!ctx) return;
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }
    let buf = buffersRef.current[i];
    if (!buf) {
      try { buf = await ctx.decodeAudioData(await fetchTrack(MUSIC_TRACKS[i].src)); buffersRef.current = { [i]: buf }; }
      catch { return; }
    }
    if (!keepOld && curRef.current) { try { curRef.current.node.onended = null; curRef.current.node.stop(); } catch {} }
    const g = ctx.createGain();
    g.connect(masterGainRef.current);
    const node = ctx.createBufferSource();
    node.buffer = buf;
    node.connect(g);
    node.onended = () => {                 // safety net if the crossfade scheduler ever misses
      if (curRef.current && curRef.current.node === node && !fadingRef.current) {
        playTrack((i + 1) % MUSIC_TRACKS.length, 0.6);
      }
    };
    if (fadeIn > 0) {
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1, ctx.currentTime + fadeIn);
    } else g.gain.value = 1;
    try { node.start(); } catch {}
    curRef.current = { node, gain: g, end: ctx.currentTime + (buf.duration || 0), idx: i };
    setNowIdx(i);
  };
  const crossfadeTo = (i, xf) => {
    const ctx = musicCtxRef.current; if (!ctx) return;
    const old = curRef.current;
    fadingRef.current = true;
    if (old) {
      try {
        old.node.onended = null;
        const t = ctx.currentTime;
        old.gain.gain.setValueAtTime(old.gain.gain.value || 1, t);
        old.gain.gain.linearRampToValueAtTime(0.0001, t + xf);
        old.node.stop(t + xf + 0.05);
      } catch {}
    }
    playTrack(i, xf, true);
    setTimeout(() => { fadingRef.current = false; }, xf * 1000 + 150);
  };
  const skipTrack = () => {
    setUserPaused(false);
    const nxt = curRef.current ? (curRef.current.idx + 1) % MUSIC_TRACKS.length : 0;
    if (curRef.current) crossfadeTo(nxt, 0.8); else playTrack(0, 0.3);
  };
  const pauseToggle = () => {
    if (userPaused) setUserPaused(false);  // the screen effect resumes playback
    else { setUserPaused(true); const ctx = musicCtxRef.current; if (ctx) { try { ctx.suspend(); } catch {} } }
  };
  useEffect(() => {
    if (!MUSIC_TRACKS.length) return;      // preview build: no soundtrack, skip engine setup entirely
    if (masterGainRef.current) masterGainRef.current.gain.value = effMusic();
    const ctx = musicCtxRef.current;
    if (userPaused || effMusic() <= 0) { if (ctx && ctx.state === "running") { try { ctx.suspend(); } catch {} } return; }
    const kick = () => {
      const c = ensureMusicCtx(); if (!c) return;
      if (!curRef.current) playTrack(0, 0.3);
      else if (c.state === "suspended") { try { c.resume(); } catch {} }
    };
    kick();                                // phones stay silent until the first tap — unlock below
    window.addEventListener("pointerdown", kick);
    const iv = setInterval(() => {         // crossfade scheduler: blend 2.5s before a track ends
      const c = musicCtxRef.current, cur = curRef.current;
      if (!c || c.state !== "running" || !cur || fadingRef.current) return;
      if (c.currentTime >= cur.end - 2.5) crossfadeTo((cur.idx + 1) % MUSIC_TRACKS.length, 2.5);
    }, 500);
    return () => { window.removeEventListener("pointerdown", kick); clearInterval(iv); };
  }, [audioPrefs.music, audioPrefs.muted, userPaused]);
  useEffect(() => { (async () => { const ap = await sGet("kp-audio", false); if (ap && typeof ap.music === "number") setAudioPrefs({ music: 0.25, sfx: 0.5, muted: false, haptics: true, ...ap }); })(); }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudio, setShowAudio] = useState(false);
  const [localMatch, setLocalMatch] = useState(null);
  const [activeCode, setActiveCode] = useState(null);

  useEffect(() => {
    (async () => {
      let p = await sGet("kp-profile", false);
      if (!p) { p = await sGet("dalmudi-profile", false); if (p) sSet("kp-profile", p, false); } // migrate old saves
      if (!p) p = { id: uid(), name: "Traveler", avatar: null };
      setProfile(p);
      setScreen("home");
      if (!p.saved) setShowSettings(true); // first visit: pick a name
    })();
  }, []);

  const saveProfile = async (p) => {
    const np = { ...p, saved: true };
    setProfile(np); setShowSettings(false);
    await sSet("kp-profile", np, false);
  };

  if (!profile) return (
    <div className="app"><style>{CSS}</style>
      <div className="wrap"><div className="hint" style={{ marginTop: 60, textAlign: "center" }}><span className="spin" /> Opening the hall…</div></div>
    </div>
  );

  return (
    <div className="app">
      <style>{CSS}</style>
      {screen === "home" && <Home profile={profile} onNav={setScreen} onOpenSettings={() => setShowSettings(true)} onOpenAudio={() => setShowAudio(true)} />}
      {screen === "ai" && <AISetup profile={profile} onBack={() => setScreen("home")} onStart={(m) => { setLocalMatch(m); setScreen("game-local"); }} onOpenAudio={() => setShowAudio(true)} />}
      {screen === "create" && <CreateLobby profile={profile} onBack={() => setScreen("home")} onEnter={(c) => { setActiveCode(c); setScreen("lobby"); }} onOpenAudio={() => setShowAudio(true)} />}
      {screen === "browse" && <BrowseLobbies profile={profile} onBack={() => setScreen("home")} onEnter={(c) => { setActiveCode(c); setScreen("lobby"); }} onOpenAudio={() => setShowAudio(true)} />}
      {screen === "lobby" && <LobbyRoom profile={profile} code={activeCode} onBack={() => setScreen("home")} onGameStart={() => setScreen("game-online")} />}
      {screen === "game-local" && <GameTable profile={profile} mode="local" initial={localMatch} sfxVol={audioPrefs.sfx} haptics={audioPrefs.haptics !== false} onOpenAudio={() => setShowAudio(true)} onExit={() => setScreen("home")} />}
      {screen === "game-online" && <GameTable profile={profile} mode="online" code={activeCode} sfxVol={audioPrefs.sfx} haptics={audioPrefs.haptics !== false} onOpenAudio={() => setShowAudio(true)} onExit={() => setScreen("home")} />}
      {showSettings && <SettingsSheet profile={profile} onSave={saveProfile} onClose={() => setShowSettings(false)} />}
      {showAudio && <AudioSheet audio={audioPrefs} onAudio={updateAudio} trackName={nowIdx >= 0 ? MUSIC_TRACKS[nowIdx].name : null}
        paused={userPaused} onPauseToggle={pauseToggle} onSkip={skipTrack} onClose={() => setShowAudio(false)} />}
    </div>
  );
}
