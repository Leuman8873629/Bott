const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");

const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000);

// KEEP ALIVE
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

  const OWNER = "SPARKXBOII"; // 🔥 CHANGE THIS

  let guardPos = null;
  let reconnectDelay = 5000;

  // ================= SMART LOGIN =================
  bot.on("messagestr", (msg) => {
    const m = msg.toLowerCase();

    if (m.includes("/register")) {
      bot.chat("/register bot112022 bot112022");
      console.log("Registering...");
    }

    if (m.includes("/login")) {
      bot.chat("/login bot112022");
      console.log("Logging in...");
    }
  });

  // ================= HUMAN JUMP =================
  function humanJump() {
    const delay = Math.random() * 5000 + 3000;

    setTimeout(() => {
      if (!bot.entity) return;

      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 200);

      humanJump();
    }, delay);
  }

  bot.once("spawn", () => {
    console.log("Bot joined!");
    humanJump();
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

  // ================= MOVEMENT WHEN HIT =================
  bot.on("entityHurt", (entity) => {
    if (entity !== bot.entity) return;

    bot.setControlState("forward", true);
    bot.setControlState("sprint", true);

    setTimeout(() => {
      bot.setControlState("forward", false);
      bot.setControlState("sprint", false);
    }, 800);
  });

  // ================= GUARD SYSTEM =================
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

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // ================= LOOK AROUND =================
  bot.on("physicsTick", () => {
    if (bot.pvp.target || bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) {
      bot.lookAt(entity.position.offset(0, entity.height, 0));
    }
  });

  // ================= ATTACK + STRAFE =================
  bot.on("physicsTick", () => {
    if (!guardPos) return;

    const target = bot.nearestEntity(e =>
      e.type === "mob" &&
      e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== "Armor Stand"
    );

    if (target) {
      bot.pvp.attack(target);

      // 🔥 strafing (fix hitbox feeling)
      if (Math.random() < 0.3) {
        bot.setControlState("left", true);
        setTimeout(() => bot.setControlState("left", false), 300);
      }

      if (Math.random() < 0.3) {
        bot.setControlState("right", true);
        setTimeout(() => bot.setControlState("right", false), 300);
      }
    }
  });

  // ================= CHAT COMMAND FIX =================
  bot.on("messagestr", (msg) => {
    if (!msg.includes("<")) return;

    const username = msg.split(">")[0].replace("<", "").trim();
    const message = msg.split(">")[1]?.trim().toLowerCase();

    if (username !== OWNER) return;

    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("Guarding this area!");
        guardArea(player.entity.position);
      }
    }

    if (message === "stop") {
      bot.chat("Stopped guarding!");
      stopGuarding();
    }
  });

  // ================= SMART RECONNECT =================
  bot.on("end", () => {
    console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);

    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay + 5000, 30000);
      createBot();
    }, reconnectDelay);
  });

  bot.on("spawn", () => {
    reconnectDelay = 5000;
  });

  bot.on("kicked", console.log);
  bot.on("error", console.log);
}

createBot();
