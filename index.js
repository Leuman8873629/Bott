const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");

const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// KEEP ALIVE FIX
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

// ================= BOT =================
function createBot() {
  const bot = mineflayer.createBot({
    host: "TSLifestealsmp.aternos.me",
    port: 27900,
    username: "heheh_bottwa",
    version: false
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let jumpInterval;

  // ================= SMART LOGIN =================
  bot.on("messagestr", (msg) => {
    msg = msg.toLowerCase();

    if (msg.includes("/register")) {
      bot.chat("/register bot112022 bot112022");
      console.log("Registering...");
    }

    if (msg.includes("/login")) {
      bot.chat("/login bot112022");
      console.log("Logging in...");
    }
  });

  // ================= HUMAN-LIKE JUMP =================
  function startHumanJump() {
    function randomJump() {
      const delay = Math.floor(Math.random() * 5000) + 3000; // 3–8 sec

      setTimeout(() => {
        if (!bot.entity) return;

        bot.setControlState("jump", true);

        setTimeout(() => {
          bot.setControlState("jump", false);
          randomJump(); // loop again
        }, 200);

      }, delay);
    }

    randomJump();
  }

  bot.on("spawn", () => {
    console.log("Bot joined server");
    startHumanJump();
  });

  // ================= AUTO EQUIP =================
  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand");
    }, 150);

    setTimeout(() => {
      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand");
    }, 300);
  });

  // ================= GUARD SYSTEM =================
  let guardPos = null;

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
    const mcData = require("minecraft-data")(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // LOOK AT ENTITY
  bot.on("physicTick", () => {
    if (bot.pvp.target || bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) {
      bot.lookAt(entity.position.offset(0, entity.height, 0));
    }
  });

  // ATTACK MOBS
  bot.on("physicTick", () => {
    if (!guardPos) return;

    const entity = bot.nearestEntity(e =>
      e.type === "mob" &&
      e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== "Armor Stand"
    );

    if (entity) bot.pvp.attack(entity);
  });

  // ================= CHAT COMMANDS =================
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

  // ================= SMART RECONNECT =================
  let reconnectDelay = 5000;

  bot.on("end", () => {
    console.log(`Disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);

    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay + 5000, 30000); // max 30s
      createBot();
    }, reconnectDelay);
  });

  bot.on("spawn", () => {
    reconnectDelay = 5000; // reset delay when success
  });

  bot.on("kicked", console.log);
  bot.on("error", console.log);
}

createBot();
