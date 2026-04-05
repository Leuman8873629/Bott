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

// ================= RESET =================
function resetControls() {
  if (!bot) return;
  ["forward","back","left","right","jump","sprint","sneak"]
    .forEach(c => bot.setControlState(c, false));
}

// ================= CREATE =================
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
      startSystems();
    }, 6000);
  });

  // 💥 HIT FIX (NO FREEZE, NO MOVEMENT SPAM)
  bot.on("entityHurt", (entity) => {
    if (!bot?.entity) return;

    if (entity === bot.entity) {
      console.log("💥 Got hit → ALERT MODE");
      alertMode = true;

      // 🔥 ONLY JUMP (no forward movement)
      bot.setControlState("jump", true);
      setTimeout(() => {
        bot.setControlState("jump", false);
      }, 150);
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

// ================= SYSTEM START =================
function startSystems() {
  stopSystems();
  resetControls();

  startLook();
  startJump();
}

// ================= LOOK =================
function startLook() {
  function loop() {
    if (!bot?.entity) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);
    } catch {}

    lookLoop = setTimeout(loop, 2000 + Math.random() * 2000);
  }
  loop();
}

// ================= JUMP =================
function startJump() {
  function loop() {
    if (!bot?.entity || !bot.entity.position) return;

    if (bot.entity.onGround) {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 120);
    }

    const delay = alertMode
      ? 2000 + Math.random() * 1000   // 🔥 2–3 sec after hit
      : 5000;

    jumpLoop = setTimeout(loop, delay);
  }
  loop();
}

// ================= STOP =================
function stopSystems() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpLoop) clearTimeout(jumpLoop);

  lookLoop = null;
  jumpLoop = null;
}

// ================= RECONNECT =================
function safeReconnect() {
  stopSystems();
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
