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
    username: "heheh_botwa", // ✅ changed name
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

    startIdle(); // 👇 only idle, no movement spam
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

// ================= IDLE (NO MOVEMENT SPAM) =================

function startIdle() {
  setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      // 👀 just look around occasionally
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);

    } catch (e) {
      console.log("Idle error:", e.message);
    }
  }, 4000);
}

// ================= SAFE RECONNECT =================

function safeReconnect() {
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
