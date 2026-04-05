const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");

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

// ================= RESET CONTROLS =================
function resetControls() {
  if (!bot) return;
  ["forward", "back", "left", "right", "jump", "sprint"]
    .forEach(c => bot.setControlState(c, false));
}

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
    version: false
  });

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;
    lastHealth = bot.health;

    setupAdvancedLogin(); // 🔥 login system
    startIdle();
  });

  // 💥 DAMAGE DETECT
  bot.on("health", () => {
    if (!bot?.entity) return;

    if (bot.health < lastHealth && !reacting) {
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

// ================= ADVANCED LOGIN =================
function setupAdvancedLogin() {
  const password = "bot112022";

  let loggedIn = false;
  let triedRegister = false;

  bot.on("message", (msg) => {
    const text = msg.toString().toLowerCase();

    if (text.includes("/register")) {
      if (triedRegister) return;
      console.log("📝 Registering...");
      bot.chat(`/register ${password} ${password}`);
      triedRegister = true;
    }

    if (text.includes("/login")) {
      console.log("🔐 Logging in...");
      bot.chat(`/login ${password}`);
    }

    if (
      text.includes("logged in") ||
      text.includes("welcome") ||
      text.includes("success")
    ) {
      console.log("✅ Login success");
      loggedIn = true;
    }
  });

  // fallback login
  setTimeout(() => {
    if (!loggedIn) {
      console.log("⏳ Forced login...");
      bot.chat(`/login ${password}`);
    }
  }, 4000);
}

// ================= HIT REACTION =================
function reactToHit() {
  if (!bot?.entity) return;

  reacting = true;
  stopIdle();

  const moves = ["forward", "back", "left", "right"];
  const move = moves[Math.floor(Math.random() * moves.length)];

  resetControls();

  bot.setControlState("sprint", true);
  bot.setControlState(move, true);

  if (bot.entity.onGround) {
    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 120);
  }

  setTimeout(() => {
    resetControls();
    reacting = false;
    setTimeout(startIdle, 300);
  }, 1200 + Math.random() * 500);
}

// ================= IDLE SYSTEM =================
function startIdle() {
  if (!bot?.entity) return;

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

  }, 4000 + Math.random() * 1500);

  moveInterval = setInterval(() => {
    if (!bot?.entity || reacting) return;

    const moves = ["left", "right"];
    const move = moves[Math.floor(Math.random() * moves.length)];

    bot.setControlState(move, true);

    setTimeout(() => {
      bot.setControlState(move, false);
    }, 400 + Math.random() * 400);

  }, 5000 + Math.random() * 3000);
}

// ================= STOP IDLE =================
function stopIdle() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpInterval) clearInterval(jumpInterval);
  if (moveInterval) clearInterval(moveInterval);

  lookLoop = null;
  jumpInterval = null;
  moveInterval = null;

  resetControls();
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
