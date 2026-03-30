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

function createBot() {
  if (isConnecting) return;
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

  // ===== SPAWN =====
  bot.on("spawn", () => {
    console.log("✅ Bot joined");
    isConnecting = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // 🔥 MICRO MOVEMENT (FIX FREEZE)
    if (moveInterval) clearInterval(moveInterval);

    moveInterval = setInterval(() => {
      if (!bot.entity) return;

      const actions = ["forward", "back", "left", "right"];
      const action = actions[Math.floor(Math.random() * actions.length)];

      bot.setControlState(action, true);

      setTimeout(() => {
        bot.setControlState(action, false);
      }, 300);

    }, 3000);

    // 👀 HEAD MOVEMENT (human-like)
    setInterval(() => {
      if (!bot.entity) return;

      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.5;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.2;

      bot.look(yaw, pitch, true);
    }, 4000);
  });

  // ===== HIT REACTION =====
  bot.on("entityHurt", (entity) => {
    if (entity !== bot.entity) return;

    lastHit = Date.now();

    // small knockback reaction
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

  // ===== GUARD =====
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

    if (msg.includes("already playing")) {
      console.log("⏳ Waiting 30s...");
      return setTimeout(safeReconnect, 30000);
    }

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

// ===== RECONNECT =====
function safeReconnect() {
  if (reconnectTimeout) return;

  isConnecting = false;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 15000);
}

createBot();
