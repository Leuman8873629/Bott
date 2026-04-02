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
let movementLoop = null;
let reconnecting = false;

function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log("🚀 Starting bot...");

  // 🧹 CLEAN OLD BOT
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
    username: "rioBekasdfsi",
    version: false,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  // ===== EVENTS =====

  bot.once("login", () => {
    console.log("🔐 Logged in");
  });

  bot.once("spawn", () => {
    console.log("✅ Bot joined successfully!");
    reconnecting = false;

    startMovement();
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

// ================= MOVEMENT =================

function startMovement() {
  stopMovement();

  function loop() {
    if (!bot || !bot.entity) return;

    try {
      // 🎮 random walk
      const actions = ["forward", "back", "left", "right"];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const duration = 300 + Math.random() * 700;

      bot.setControlState(action, true);

      setTimeout(() => {
        if (!bot) return;
        bot.setControlState(action, false);
      }, duration);

      // 🦘 jump (low chance)
      if (Math.random() < 0.25) {
        bot.setControlState("jump", true);
        setTimeout(() => bot.setControlState("jump", false), 250);
      }

      // 🥷 sneak (very low chance)
      if (Math.random() < 0.15) {
        bot.setControlState("sneak", true);
        setTimeout(() => bot.setControlState("sneak", false), 600);
      }

      // 👀 smooth look
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);

    } catch (e) {
      console.log("Movement error:", e.message);
    }

    const next = 2500 + Math.random() * 5000;
    movementLoop = setTimeout(loop, next);
  }

  loop();
}

function stopMovement() {
  if (movementLoop) {
    clearTimeout(movementLoop);
    movementLoop = null;
  }
}

// ================= SAFE RECONNECT =================

function safeReconnect() {
  stopMovement();

  if (reconnecting) return;

  reconnecting = true;

  console.log("🔄 Reconnecting in 10 seconds...");

  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, 10000); // enough delay to avoid "same username" bug
}

// start
createBot();
