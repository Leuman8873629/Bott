const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");

const app = express();
app.use(express.json());

app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// ✅ KEEP ALIVE (only for Replit)
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

// 🔒 GLOBAL CONTROL
let bot = null;
let reconnectTimeout = null;
let isConnecting = false;

// 🤖 CREATE BOT
function createBot() {
  if (isConnecting) return;
  isConnecting = true;

  console.log("🚀 Starting bot...");

  // kill old bot
  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch (e) {}
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "rioBekasdfsi",
    version: "1.21.11",

    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022"
    }
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;

  // ✅ SPAWN
  bot.on("spawn", () => {
    console.log("✅ Bot joined");

    isConnecting = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  // ✅ AUTO EQUIP
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});

      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand").catch(() => {});
    }, 200);
  });

  // 🛡 GUARD SYSTEM
  function guardArea(pos) {
    guardPos = pos.clone();
    if (!bot.pvp.target) moveToGuardPos();
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    if (!guardPos) return;

    const mcData = require("minecraft-data")(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));

    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // 👀 LOOK + ATTACK
  bot.on("physicsTick", () => {
    if (!bot.entity) return;

    // look around
    if (!bot.pvp.target && !bot.pathfinder.isMoving()) {
      const entity = bot.nearestEntity();
      if (entity) {
        bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(() => {});
      }
    }

    // attack mobs
    if (guardPos) {
      const mob = bot.nearestEntity(e =>
        e.type === "mob" &&
        e.position.distanceTo(bot.entity.position) < 16
      );

      if (mob) bot.pvp.attack(mob);
    }
  });

  // 💬 CHAT COMMANDS
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("Guarding area!");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopping!");
      stopGuarding();
    }
  });

  // ❌ KICK HANDLING
  bot.on("kicked", (reason) => {
    const msg = reason.toString().toLowerCase();
    console.log("❌ Kicked:", msg);

    if (msg.includes("already playing")) {
      console.log("⏳ Waiting 30s (ghost session)");
      return setTimeout(safeReconnect, 30000);
    }

    safeReconnect();
  });

  // ⚠️ ERROR
  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });

  // 🔌 DISCONNECT
  bot.on("end", () => {
    console.log("🔌 Disconnected");
    safeReconnect();
  });
}

// 🔁 SAFE RECONNECT
function safeReconnect() {
  if (reconnectTimeout) return;

  isConnecting = false;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 15000);
}

createBot();
