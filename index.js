const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const mcDataLoader = require("minecraft-data");

const app = express();
const PORT = process.env.PORT || 3000;

// Keep Railway alive
app.get("/", (req, res) => res.send("Minecraft Bot Running"));
app.listen(PORT, "0.0.0.0", () => {
  console.log("Web server running on port " + PORT);
});

let bot;
let jumpInterval;

// ✅ Reconnect control
let reconnectTimeout = null;
let reconnectAttempts = 0;
let shouldReconnect = true;

function createBot() {
  console.log("Starting bot...");

  // ✅ kill old bot safely (important)
  if (bot) {
    try {
      bot.quit();
    } catch (e) {}
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "chatpata_momo",
    version: "1.21.11"
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;
  const mcData = mcDataLoader(bot.version);

  bot.once("spawn", () => {
    console.log("✅ Bot joined server");

    reconnectAttempts = 0;
    shouldReconnect = true;

    // login
    setTimeout(() => {
      bot.chat("/login botwa123123");
    }, 4000);

    // Anti AFK
    jumpInterval = setInterval(() => {
      if (!bot?.entity) return;

      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 120);
    }, 10000);
  });

  // Auto login/register detect
  bot.on("message", (msg) => {
    const text = msg.toString().toLowerCase();

    if (text.includes("register")) {
      setTimeout(() => {
        bot.chat("/register botwa123123 botwa123123");
      }, 1500);
    }

    if (text.includes("login")) {
      setTimeout(() => {
        bot.chat("/login botwa123123");
      }, 1500);
    }
  });

  // Equip items
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});

      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand").catch(() => {});
    }, 300);
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

    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);

    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // AI
  bot.on("physicsTick", () => {
    if (!bot?.entity) return;

    if (!bot.pvp.target && !bot.pathfinder.isMoving()) {
      const entity = bot.nearestEntity();
      if (entity) {
        bot.lookAt(entity.position.offset(0, entity.height, 0), true).catch(() => {});
      }
    }

    if (guardPos) {
      const mob = bot.nearestEntity(e =>
        e.type === "mob" &&
        e.mobType !== "Armor Stand" &&
        e.position.distanceTo(bot.entity.position) < 16
      );

      if (mob) bot.pvp.attack(mob);
    }
  });

  // Chat commands
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("Guarding this area!");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopping guard!");
      stopGuarding();
    }
  });

  // ✅ Kick handler (MAIN FIX)
  bot.on("kicked", (reason) => {
    console.log("Kicked:", reason);

    const msg = reason.toString().toLowerCase();

    if (msg.includes("already playing")) {
      console.log("⚠️ Ghost session detected → waiting longer");
      reconnectAttempts += 3; // big delay
    }

    if (
      msg.includes("banned") ||
      msg.includes("whitelist") ||
      msg.includes("not allowed")
    ) {
      console.log("❌ Stopping reconnect (restricted)");
      shouldReconnect = false;
    }
  });

  bot.on("error", err => console.log("Error:", err.message));

  // ✅ Smart reconnect (FINAL)
  bot.on("end", () => {
    console.log("Bot disconnected");

    if (jumpInterval) clearInterval(jumpInterval);

    if (!shouldReconnect) return;
    if (reconnectTimeout) return;

    reconnectAttempts++;

    // ✅ 10s → 60s delay (fix ghost issue)
    const delay = Math.min(60000, 10000 * reconnectAttempts);

    console.log(`🔁 Reconnect attempt ${reconnectAttempts} in ${delay / 1000}s`);

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      createBot();
    }, delay);
  });
}

// Prevent crash
process.on("uncaughtException", err => {
  console.log("Uncaught Error:", err);
});

// Start
createBot();
