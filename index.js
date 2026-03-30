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

// ===== GLOBAL =====
let bot = null;
let reconnectTimeout = null;
let isConnecting = false;
let isConnected = false;

// ===== CREATE BOT =====
function createBot() {
  if (isConnecting || isConnected) return;
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
    version: false, // ✅ AUTO VERSION FIX
    plugins: [AutoAuth],
    AutoAuth: { password: "bot112022" }
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;
  let lastHit = 0;
  let moveState = null;

  // ===== SPAWN =====
  bot.on("spawn", () => {
    console.log("✅ Bot joined");

    isConnecting = false;
    isConnected = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  });

  // ===== REAL MOVEMENT (FIX STATUE) =====
  bot.on("physicsTick", () => {
    if (!bot.entity) return;

    if (Math.random() < 0.02) {
      const actions = ["forward", "back", "left", "right", null];
      moveState = actions[Math.floor(Math.random() * actions.length)];
    }

    bot.setControlState("forward", false);
    bot.setControlState("back", false);
    bot.setControlState("left", false);
    bot.setControlState("right", false);

    if (moveState) {
      bot.setControlState(moveState, true);
    }
  });

  // small sync helper
  bot.on("move", () => {});

  // ===== HIT REACTION =====
  bot.on("entityHurt", (entity) => {
    if (entity !== bot.entity) return;

    lastHit = Date.now();

    bot.setControlState("back", true);
    setTimeout(() => {
      bot.setControlState("back", false);
    }, 400);
  });

  // ===== AUTO EQUIP =====
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});

      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand").catch(() => {});
    }, 200);
  });

  // ===== GUARD SYSTEM =====
  function guardArea(pos) {
    guardPos = pos.clone();
    moveToGuardPos();
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

  bot.on("startedAttacking", () => {
    bot.pathfinder.setGoal(null);
  });

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // ===== SAFE AI LOOP =====
  setInterval(() => {
    if (!bot.entity) return;

    if (Date.now() - lastHit < 1200) return;

    if (guardPos && !bot.pvp.target) {
      const mob = bot.nearestEntity(e =>
        e.type === "mob" &&
        e.position.distanceTo(bot.entity.position) < 8
      );

      if (mob) bot.pvp.attack(mob);
    }
  }, 500);

  // ===== CHAT =====
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("Guarding!");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopped!");
      stopGuarding();
    }
  });

  // ===== KICK =====
  bot.on("kicked", (reason) => {
    const msg = reason.toString().toLowerCase();
    console.log("❌ Kicked:", msg);

    isConnected = false;

    if (msg.includes("already playing")) {
      console.log("⚠️ Already online, skipping reconnect");
      return;
    }

    safeReconnect();
  });

  // ===== ERROR =====
  bot.on("error", (err) => {
    console.log("⚠️ Error:", err.message);
  });

  // ===== END =====
  bot.on("end", () => {
    console.log("🔌 Disconnected");

    isConnected = false;
    safeReconnect();
  });
}

// ===== RECONNECT =====
function safeReconnect() {
  if (reconnectTimeout || isConnected || isConnecting) return;

  console.log("🔁 Reconnecting in 15s...");

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 15000);
}

createBot();
