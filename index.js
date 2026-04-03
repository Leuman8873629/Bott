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
let jumping = false;

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

  bot.on("physicsTick", () => {
    // 🦘 PHYSICS-BASED JUMP (REAL FIX)
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

  function loop() {
    if (!bot || !bot.entity) return;

    try {
      // 👀 look around
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);

      // 🦘 TRIGGER JUMP (reliable)
      if (!jumping && Math.random() < 0.6) {
        jumping = true;

        setTimeout(() => {
          jumping = false;
          if (bot) bot.setControlState("jump", false);
        }, 400); // hold jump properly
      }

    } catch (e) {
      console.log("Idle error:", e.message);
    }

    const next = 2500 + Math.random() * 3500;
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
