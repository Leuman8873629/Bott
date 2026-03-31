const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
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

function createBot() {
  console.log("🚀 Starting bot...");

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "rioBekasdfsi",
    version: "1.21.11",
    plugins: [AutoAuth],
    AutoAuth: { password: "bot112022" }
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let moveInterval;
  let lookInterval;

  bot.once("spawn", () => {
    console.log("✅ Bot joined");

    // movement
    moveInterval = setInterval(() => {
      if (!bot.entity) return;

      const actions = ["forward", "back", "left", "right"];
      const action = actions[Math.floor(Math.random() * actions.length)];

      bot.setControlState(action, true);
      setTimeout(() => bot.setControlState(action, false), 300);
    }, 3000);

    // head movement
    lookInterval = setInterval(() => {
      if (!bot.entity) return;

      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.2;

      bot.look(yaw, pitch, true);
    }, 4000);
  });

  // ===== EVENTS (NO RECONNECT) =====
  bot.on("kicked", (reason) => {
    console.log("❌ Kicked:", reason.toString());
    console.log("🛑 Bot stopped. Restart manually.");
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    console.log("🛑 Bot stopped. Restart manually.");
  });

  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });
}

// start once
createBot();
