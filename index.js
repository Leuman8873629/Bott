const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");
const { pathfinder } = require("mineflayer-pathfinder");

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
let alertMode = false;

let lookLoop = null;
let jumpLoop = null;
let moveInterval = null;

// ================= RESET CONTROLS =================
function resetControls() {
  if (!bot) return;
  ["forward","back","left","right","jump","sprint","sneak"]
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
    version: false,

    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true,
      timeout: 5000,
      repeat: true
    }
  });

  bot.loadPlugin(pathfinder);

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;

    setTimeout(() => {
      bot.chat("/register bot112022 bot112022");
      bot.chat("/login bot112022");
    }, 3000);

    setTimeout(() => {
      startIdle();
    }, 6000);
  });

  // ================= HIT → ALERT MODE =================
  bot.on("entityHurt", (entity) => {
    if (!bot?.entity) return;

    if (entity === bot.entity) {
      console.log("💥 Got hit! Alert mode ON");
      alertMode = true;
    }
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

// ================= IDLE =================
function startIdle() {
  stopIdle();
  resetControls();

  // 👀 LOOK SYSTEM
  function look() {
    if (!bot?.entity) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);
    } catch {}

    lookLoop = setTimeout(look, 2000 + Math.random() * 2000);
  }
  look();

  // 🦘 SMART JUMP LOOP (MAIN FIX)
  function jumpLoopFunc() {
    if (!bot?.entity) return;

    if (bot.entity.onGround) {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 100);
    }

    // 🔥 dynamic delay
    let nextDelay = 5000; // normal

    if (alertMode) {
      nextDelay = 2000 + Math.random() * 1000; // 2–3 sec
    }

    jumpLoop = setTimeout(jumpLoopFunc, nextDelay);
  }
  jumpLoopFunc();

  // 🏃 RANDOM MOVEMENT
  moveInterval = setInterval(() => {
    if (!bot?.entity) return;

    const move = Math.random() > 0.5 ? "left" : "right";
    bot.setControlState(move, true);

    setTimeout(() => {
      bot.setControlState(move, false);
    }, 500);
  }, 7000);
}

// ================= STOP =================
function stopIdle() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpLoop) clearTimeout(jumpLoop);
  if (moveInterval) clearInterval(moveInterval);

  lookLoop = null;
  jumpLoop = null;
  moveInterval = null;
}

// ================= RECONNECT =================
function safeReconnect() {
  stopIdle();
  resetControls();

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
