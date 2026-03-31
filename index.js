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

  // 🧹 CLEAN OLD BOT
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
    username: "rioBekasdfsi", // change if needed
    version: false, // auto detect version
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  // ===== EVENTS =====

  bot.on("login", () => {
    console.log("🔐 Logged in");
  });

  bot.on("spawn", () => {
    console.log("✅ Bot joined successfully!");

    // 🔥 SAFE MICRO MOVEMENT
    setInterval(() => {
      if (!bot.entity) return;

      const actions = ["forward", "back", "left", "right"];
      const action = actions[Math.floor(Math.random() * actions.length)];

      bot.setControlState(action, true);

      setTimeout(() => {
        bot.setControlState(action, false);
      }, 200);
    }, 4000);

    // 👀 SAFE HEAD MOVEMENT
    setInterval(() => {
      if (!bot.entity) return;

      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.3;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.1;

      bot.look(yaw, pitch, true);
    }, 5000);
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
