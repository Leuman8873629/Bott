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

  function loop() {
    if (!bot || !bot.entity) return;

    try {
      // 👀 smooth look around
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);

      // 🦘 random jump (natural)
      if (Math.random() < 0.3 && bot.entity.onGround) {
        bot.setControlState("jump", true);

        setTimeout(() => {
          if (!bot) return;
          bot.setControlState("jump", false);
        }, 180);
      }

    } catch (e) {
      console.log("Idle error:", e.message);
    }

    // next action delay (human-like)
    const next = 3000 + Math.random() * 4000;
    idleLoop = setTimeout(loop, next);
  }

  loop();
}

function stopIdle() {
  if (idleLoop) {
    clearTimeout(idleLoop);
    idleLoop = null;
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

// start
createBot();
