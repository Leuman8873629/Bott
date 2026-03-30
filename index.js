const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const mcDataLoader = require("minecraft-data");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("Minecraft Bot Running"));
app.listen(PORT, "0.0.0.0", () => {
  console.log("Web server running on port " + PORT);
});

let bot;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let shouldReconnect = true;
let reconnectLocked = false;

function createBot() {
  console.log("Starting bot...");

  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch (e) {}
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "chatpata_momo",
    version: false // ✅ auto detect (fix)
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;
  let lastLook = 0;

  bot.once("spawn", () => {
    console.log("✅ Bot joined");

    reconnectAttempts = 0;
    reconnectLocked = false;
    shouldReconnect = true;

    // ✅ normal physics (fix)
    bot.physics.maxGroundSpeed = 4.3;

    setTimeout(() => {
      bot.chat("/login botwa123123");
    }, 4000);
  });

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

  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand").catch(() => {});
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

    const mcData = mcDataLoader(bot.version);
    const movements = new Movements(bot, mcData);

    // ✅ SAFE movement config (fix)
    movements.allow1by1towers = false;
    movements.canDig = false;
    movements.allowParkour = false;

    bot.pathfinder.setMovements(movements);

    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  bot.on("physicsTick", () => {
    if (!bot?.entity) return;

    const now = Date.now();

    // ✅ limit lookAt (fix)
    if (!bot.pvp.target && !bot.pathfinder.isMoving()) {
      if (now - lastLook > 1000) {
        const entity = bot.nearestEntity();
        if (entity) {
          bot.lookAt(entity.position.offset(0, entity.height, 0), true).catch(() => {});
        }
        lastLook = now;
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
        bot.chat("Guarding area");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopping");
      stopGuarding();
    }
  });

  bot.on("kicked", (reason) => {
    console.log("Kicked:", reason);

    const msg = reason.toString().toLowerCase();

    if (msg.includes("already playing")) {
      reconnectLocked = true;

      setTimeout(() => {
        reconnectLocked = false;
        console.log("🔓 Reconnect unlocked");
      }, 60000);
    }

    if (
      msg.includes("banned") ||
      msg.includes("whitelist") ||
      msg.includes("not allowed")
    ) {
      shouldReconnect = false;
    }
  });

  bot.on("error", err => console.log("Error:", err.message));

  bot.on("end", () => {
    console.log("Bot disconnected");

    if (!shouldReconnect) return;
    if (reconnectTimeout) return;
    if (reconnectLocked) return;

    reconnectAttempts++;

    const delay = Math.min(90000, 15000 * reconnectAttempts);

    console.log(`🔁 Reconnect in ${delay / 1000}s`);

    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      createBot();
    }, delay);
  });
}

process.on("uncaughtException", err => {
  console.log("Uncaught:", err);
});

createBot();
