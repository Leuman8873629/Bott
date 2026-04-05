const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");

const app = express();
app.get("/", (_, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

// keep alive
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

let bot = null;
let reconnecting = false;

let lookLoop = null;
let jumpInterval = null;
let moveInterval = null;

let lastHealth = 20;
let reacting = false;

// ================= CREATE BOT =================
function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log("🚀 Starting bot...");

  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch {}
    bot = null;
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "heheh_botwaa",
    version: "1.21.11",
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;
    lastHealth = bot.health;
    startIdle();
  });

  // 💥 DAMAGE DETECTION
  bot.on("health", () => {
    if (!bot?.entity) return;

    if (bot.health < lastHealth) {
      console.log("💥 Got hit!");
      reactToHit();
    }

    lastHealth = bot.health;
  });

  bot.on("kicked", (r) => {
    console.log("❌ Kicked:", r.toString());
    safeReconnect();
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    safeReconnect();
  });

  bot.on("error", (e) => {
    console.log("⚠️ Error:", e.message);
  });
}

// ================= HIT REACTION =================
function reactToHit() {
  if (!bot?.entity) return;
  if (reacting) return;

  reacting = true;

  const moves = ["forward", "back", "left", "right"];
  const move = moves[Math.floor(Math.random() * moves.length)];

  // 🛑 STOP idle to prevent override
  stopIdle();

  // 🏃 sprint escape
  bot.setControlState("sprint", true);
  bot.setControlState(move, true);

  // 🦘 jump safely
  if (bot.entity.onGround) {
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 120);
  }

  // 🔁 stop reaction after time
  setTimeout(() => {
    bot.setControlState(move, false);
    bot.setControlState("sprint", false);

    reacting = false;

    // ✅ restart idle AFTER reaction
    startIdle();

  }, 1200 + Math.random() * 500);
}

// ================= IDLE SYSTEM =================
function startIdle() {
  stopIdle();

  // 👀 LOOK LOOP
  function look() {
    if (!bot?.entity || reacting) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);
    } catch {}

    lookLoop = setTimeout(look, 2000 + Math.random() * 2000);
  }
  look();

  // 🦘 JUMP LOOP
  jumpInterval = setInterval(() => {
    if (!bot?.entity || reacting) return;
    if (!bot.entity.onGround) return;

    bot.setControlState("jump", true);

    setTimeout(() => {
      bot.setControlState("jump", false);
    }, 100);

  }, 4500 + Math.random() * 1000);

  // 🚶 MOVE LOOP
  moveInterval = setInterval(() => {
    if (!bot?.entity || reacting) return;

    const moves = ["left", "right"];
    const move = moves[Math.floor(Math.random() * moves.length)];

    bot.setControlState(move, true);

    setTimeout(() => {
      bot.setControlState(move, false);
    }, 500 + Math.random() * 500);

  }, 6000 + Math.random() * 3000);
}

// ================= STOP =================
function stopIdle() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpInterval) clearInterval(jumpInterval);
  if (moveInterval) clearInterval(moveInterval);

  lookLoop = null;
  jumpInterval = null;
  moveInterval = null;
}

// ================= RECONNECT =================
function safeReconnect() {
  stopIdle();

  if (reconnecting) return;

  reconnecting = true;
  console.log("🔄 Reconnecting in 10 sec...");

  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, 10000);
}

// ================= START =================
createBot();
