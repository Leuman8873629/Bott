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
    host: "TSLifestealsmp.aternos.me",
    port: 27900,
    username: "heheh_botwaa",

    version: false,
    auth: "offline",

    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true,
      timeout: 5000
    }
  });

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;
    lastHealth = bot.health;

    // 🔥 FORCE AUTH SYSTEM (NO FAIL)
    setTimeout(() => bot.chat("/login bot112022"), 2000);
    setTimeout(() => bot.chat("/register bot112022 bot112022"), 4000);
    setTimeout(() => bot.chat("/login bot112022"), 6000);

    // start movement AFTER auth
    setTimeout(() => startIdle(), 8000);
  });

  // ================= SMART AUTH (CHAT DETECTION) =================
  bot.on("messagestr", (msg) => {
    const message = msg.toLowerCase();

    if (message.includes("/register") || message.includes("please register")) {
      console.log("📝 Registering...");
      bot.chat("/register bot112022 bot112022");
    }

    if (message.includes("/login") || message.includes("please login")) {
      console.log("🔐 Logging in...");
      bot.chat("/login bot112022");
    }
  });

  // ================= DAMAGE =================
  bot.on("health", () => {
    if (!bot?.entity) return;

    if (bot.health < lastHealth) {
      console.log("💥 Got hit!");
      reactToHit();
    }

    lastHealth = bot.health;
  });

  // ================= DEBUG =================
  bot.on("kicked", (reason) => {
    console.log("❌ FULL KICK:", reason);
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
  if (!bot?.entity || reacting) return;

  reacting = true;
  stopIdle();

  const moves = ["forward", "back", "left", "right"];
  const move = moves[Math.floor(Math.random() * moves.length)];

  bot.setControlState("sprint", true);
  bot.setControlState(move, true);

  if (bot.entity.onGround) {
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 120);
  }

  setTimeout(() => {
    bot.setControlState(move, false);
    bot.setControlState("sprint", false);

    reacting = false;
    startIdle();
  }, 1200 + Math.random() * 500);
}

// ================= IDLE =================
function startIdle() {
  stopIdle();

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

  jumpInterval = setInterval(() => {
    if (!bot?.entity || reacting) return;
    if (!bot.entity.onGround) return;

    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 100);
  }, 4500);

  moveInterval = setInterval(() => {
    if (!bot?.entity || reacting) return;

    const move = Math.random() > 0.5 ? "left" : "right";
    bot.setControlState(move, true);

    setTimeout(() => bot.setControlState(move, false), 500);
  }, 6000);
}

// ================= STOP =================
function stopIdle() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpInterval) clearInterval(jumpInterval);
  if (moveInterval) clearInterval(moveInterval);
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
