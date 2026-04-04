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

let idleLoop = null;
let jumpInterval = null;
let moveInterval = null;

let jumping = false;

// ================= CREATE BOT =================
function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log("🚀 Starting bot...");

  // cleanup old bot
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
    username: "heheh_botwa",
    version: false,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  bot.once("login", () => {
    console.log("🔐 Logged in");
  });

  bot.once("spawn", () => {
    console.log("✅ Bot joined successfully!");
    reconnecting = false;

    startIdle();
  });

  // physics jump support
  bot.on("physicsTick", () => {
    if (!bot || !bot.entity) return;
    if (jumping) {
      bot.setControlState("jump", true);
    }
  });

  bot.on("kicked", (reason) => {
    console.log("❌ Kicked:", reason.toString());
    safeReconnect();
  });

  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    safeReconnect();
  });
}

// ================= IDLE SYSTEM =================
function startIdle() {
  stopIdle();

  // 👀 LOOK LOOP
  function lookLoop() {
    if (!bot || !bot.entity) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);
    } catch (e) {
      console.log("Look error:", e.message);
    }

    const next = 2000 + Math.random() * 2000;
    idleLoop = setTimeout(lookLoop, next);
  }

  lookLoop();

  // 🦘 JUMP LOOP (every 4–5 sec)
  if (jumpInterval) clearInterval(jumpInterval);

  jumpInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    if (jumping) return;

    jumping = true;
    bot.setControlState("jump", true);

    setTimeout(() => {
      jumping = false;
      if (bot) bot.setControlState("jump", false);
    }, 400);
  }, 4500);

  // 🚶 MICRO MOVEMENT (anti-AFK)
  if (moveInterval) clearInterval(moveInterval);

  moveInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    const actions = ["forward", "back", "left", "right"];
    const action = actions[Math.floor(Math.random() * actions.length)];

    bot.setControlState(action, true);

    setTimeout(() => {
      if (bot) bot.setControlState(action, false);
    }, 1000 + Math.random() * 1000);

  }, 5000 + Math.random() * 3000);
}

// ================= STOP IDLE =================
function stopIdle() {
  if (idleLoop) {
    clearTimeout(idleLoop);
    idleLoop = null;
  }

  if (jumpInterval) {
    clearInterval(jumpInterval);
    jumpInterval = null;
  }

  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
  }
}

// ================= SAFE RECONNECT =================
function safeReconnect() {
  stopIdle();

  if (reconnecting) return;

  reconnecting = true;
  console.log("🔄 Reconnecting in 10 seconds...");

  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, 10000);
}

// ================= START =================
createBot();
