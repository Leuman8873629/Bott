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

// ✅ FIXED KEEP ALIVE
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

// 🔁 RECONNECT CONTROL
let reconnecting = false;

function createBot() {
  if (reconnecting) return;
  reconnecting = true;

  console.log("Starting bot...");

  const bot = mineflayer.createBot({
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

  let jumpInterval;
  let guardPos = null;

  bot.on("spawn", () => {
    console.log("✅ Bot joined");
    reconnecting = false;

    if (jumpInterval) clearInterval(jumpInterval);

    // ✅ NATURAL ANTI-DETECTION MOVEMENT
    jumpInterval = setInterval(() => {
      if (!bot.entity) return;

      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 120);

      if (Math.random() < 0.3) {
        bot.setControlState("sneak", true);
        setTimeout(() => bot.setControlState("sneak", false), 300);
      }
    }, 8000); // slower = safer
  });

  // ✅ AUTO EQUIP (combined)
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});

      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand").catch(() => {});
    }, 200);
  });

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

  // ✅ FIXED physicsTick
  bot.on("physicsTick", () => {
    if (!bot.entity) return;

    if (!bot.pvp.target && !bot.pathfinder.isMoving()) {
      const entity = bot.nearestEntity();
      if (entity) {
        bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(() => {});
      }
    }

    if (guardPos) {
      const mob = bot.nearestEntity(e =>
        e.type === "mob" &&
        e.position.distanceTo(bot.entity.position) < 16
      );

      if (mob) bot.pvp.attack(mob);
    }
  });

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

  bot.on("kicked", reason => {
    console.log("Kicked:", reason);
  });

  bot.on("error", err => {
    console.log("Error:", err.message);
  });

  bot.on("end", () => {
    console.log("❌ Bot disconnected. Reconnecting in 10s...");
    reconnecting = false;

    if (jumpInterval) clearInterval(jumpInterval);

    setTimeout(createBot, 10000);
  });
}

createBot();
