const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");

const app = express();
app.get("/", (_, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

// keep alive (optional)
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

let bot = null;

function createBot() {
  console.log("🚀 Starting bot...");

  // 🧹 CLEAN OLD BOT (VERY IMPORTANT)
  if (bot) {
    try {
      bot.end();
      bot.removeAllListeners();
    } catch {}
    bot = null;
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "rioBekasdfsi", // ⚠️ change if still stuck
    version: false, // 🔥 AUTO VERSION FIX
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  // ===== DEBUG EVENTS (IMPORTANT) =====
  bot.on("login", () => {
    console.log("🔐 Logged in");
  });

  bot.on("spawn", () => {
    console.log("✅ Bot joined successfully!");
  });

  bot.on("kicked", (reason) => {
    console.log("❌ Kicked:", reason.toString());
    console.log("🛑 Bot stopped. Restart manually.");
  });

  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    console.log("🛑 Bot stopped. Restart manually.");
  });
}

// start once
createBot();
