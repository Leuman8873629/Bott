const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");

const app = express();
const PORT = process.env.PORT || 3000;

// Keep Railway alive
app.get("/", (req, res) => res.send("Minecraft Bot Running"));
app.listen(PORT, "0.0.0.0", () => console.log("Web server running on port " + PORT));

let bot = null;
let jumpInterval = null;
let reconnecting = false;

function createBot() {

  if (bot) {
    console.log("Bot already running.");
    return;
  }

  console.log("Starting bot...");

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "sparkyyybottt",
    version: "1.20.1"
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;

  // SPAWN
  bot.once("spawn", () => {

    console.log("Bot joined server");

    setTimeout(() => {
      // bot.chat("/login bott123123");
    }, 5000);

    // Anti AFK
    jumpInterval = setInterval(() => {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 100);
    }, 10000);

  });

  // AUTO EQUIP
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

    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);

    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(
      new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z)
    );
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // LOOK AT ENTITY
  bot.on("physicsTick", () => {

    if (!bot.entity || bot.pvp.target || bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) {
      bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(() => {});
    }

  });

  // ATTACK MOBS
  bot.on("physicsTick", () => {

    if (!guardPos) return;

    const filter = e =>
      e.type === "mob" &&
      e.position.distanceTo(bot.entity.position) < 16 &&
      e.mobType !== "Armor Stand";

    const entity = bot.nearestEntity(filter);

    if (entity) bot.pvp.attack(entity);

  });

  // CHAT COMMANDS
  bot.on("chat", (username, message) => {

    if (username === bot.username) return;

    if (message === "guard") {

      const player = bot.players[username];

      if (player && player.entity) {
        bot.chat("Guarding this area!");
        guardArea(player.entity.position);
      }

    }

    if (message === "stop") {
      bot.chat("Stopping guard!");
      stopGuarding();
    }

  });

  // ERROR LOGGING
  bot.on("kicked", reason => {
    console.log("Kicked:", reason);
  });

  bot.on("error", err => {
    console.log("Error:", err.message);
  });

  // RECONNECT
  bot.on("end", () => {

    console.log("Bot disconnected");

    if (jumpInterval) clearInterval(jumpInterval);

    bot = null;

    if (!reconnecting) {

      reconnecting = true;

      console.log("Reconnecting in 30 seconds...");

      setTimeout(() => {
        reconnecting = false;
        createBot();
      }, 999999999999999999);

    }

  });

}

createBot();
