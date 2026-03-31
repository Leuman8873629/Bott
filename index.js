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

// ===== KEEP ALIVE =====
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

// ===== GLOBAL =====
let bot = null;
let reconnectTimeout = null;
let isConnecting = false;
let isConnected = false;
let blocked = false; // 🚫 HARD STOP

function createBot() {
  // 🚫 HARD BLOCK
  if (blocked || isConnecting || isConnected) {
    console.log("⚠️ Blocked / Already active, skipping...");
    return;
  }

  isConnecting = true;

  console.log("🚀 Starting bot...");

  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch {}
  }

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

  let guardPos = null;
  let lastHit = 0;
  let moveInterval;
  let lookInterval;

  // ===== SPAWN =====
  bot.once("spawn", () => {
    console.log("✅ Bot joined");

    isConnecting = false;
    isConnected = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    moveInterval = setInterval(() => {
      if (!bot.entity) return;

      const actions = ["forward", "back", "left", "right"];
      const action = actions[Math.floor(Math.random() * actions.length)];

      bot.setControlState(action, true);
      setTimeout(() => bot.setControlState(action, false), 300);
    }, 3000);

    lookInterval = setInterval(() => {
      if (!bot.entity) return;

      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.2;

      bot.look(yaw, pitch, true);
    }, 4000);
  });

  // ===== CLEANUP =====
  function cleanup() {
    console.log("🧹 Cleaning up...");

    isConnected = false;
    isConnecting = false;

    try {
      bot.removeAllListeners();
      bot.quit();
    } catch {}
  }

  // ===== EVENTS =====
  bot.on("kicked", (reason) => {
    const msg = reason.toString().toLowerCase();
    console.log("❌ Kicked:", msg);

    cleanup();

    // 🚫 PERMANENT STOP
    if (msg.includes("already playing")) {
      console.log("🛑 Bot already online — STOPPING reconnect");

      blocked = true;

      // 🧠 OPTIONAL: auto retry after 2 minutes
      setTimeout(() => {
        console.log("🔄 Retrying after cooldown...");
        blocked = false;
        createBot();
      }, 120000);

      return;
    }

    safeReconnect();
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    cleanup();
    safeReconnect();
  });

  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });
}

// ===== RECONNECT =====
function safeReconnect() {
  if (reconnectTimeout) return;

  if (blocked) {
    console.log("🛑 Reconnect blocked");
    return;
  }

  if (isConnected || isConnecting) {
    console.log("⚠️ Still active, no reconnect");
    return;
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 15000);
}

// START
createBot();
