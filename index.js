const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");

const app = express();
const PORT = process.env.PORT || 3000;

// Web server (so Railway keeps bot alive)
app.get("/", (req, res) => res.send("Minecraft Bot Running"));
app.listen(PORT, "0.0.0.0", () => console.log("Web server running on port " + PORT));

let bot = null; // global bot instance
let reconnecting = false; // prevent multiple reconnects

function createBot() {

  if (bot) {
    console.log("Bot already exists, won't create another!");
    return; // prevents multiple bots
  }

  console.log("Starting bot...");

  bot = mineflayer.createBot({
    host: "157.180.102.179",
    port: 29642,
    username: "sparkyyyboii", // change to a unique bot name
    version: "1.20.1"
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let jumpInterval;
  let guardPos = null;

  // SPAWN
  bot.once("spawn", () => {

    console.log("Bot joined server");

    // login with longer delay
    // Anti-AFK jump with randomization (avoids TickTimer detection)
    jumpInterval = setInterval(() => {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), Math.random() * 100 + 50);
    }, Math.random() * 5000 + 8000); // Random 8-13 seconds
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
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  bot.on("stoppedAttacking", () => { if (guardPos) moveToGuardPos(); });

  // LOOK AT ENTITY
  let lookDelay = 0;
  bot.on("physicsTick", () => {
    if (!bot.entity || bot.pvp.target || bot.pathfinder.isMoving()) return;
    lookDelay++; if (lookDelay < 20) return; lookDelay = 0;
    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(() => {});
  });

  // ATTACK MOBS
  bot.on("physicsTick", () => {
    if (!guardPos) return;
    const filter = e => e.type === "mob" && e.position.distanceTo(bot.entity.position) < 16 && e.mobType !== "Armor Stand";
    const entity = bot.nearestEntity(filter);
    if (entity) bot.pvp.attack(entity);
  });

  // CHAT COMMANDS
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;
    if (message === "guard") {
      const player = bot.players[username];
      if (player && player.entity) { bot.chat("I will guard here!"); guardArea(player.entity.position); }
    }
    if (message === "stop") { bot.chat("Stopping guard!"); stopGuarding(); }
  });

  // BETTER ERROR LOGGING
  bot.on("kicked", reason => {
    console.log("Kicked:", reason);
  });
  
  bot.on("error", err => {
    console.log("Error:", err.message || err);
  });

  // AUTO RECONNECT (only if bot crashes/disconnects unexpectedly)
  bot.on("end", () => {
    console.log("Bot disconnected.");
    clearInterval(jumpInterval); // Clean up the jump interval
    bot = null; // reset bot reference
    if (!reconnecting) {
      reconnecting = true;
      console.log("Reconnecting in 30 seconds...");
      setTimeout(() => { reconnecting = false; createBot(); }, 30000);
    }
  });

}

// START BOT once after container ready
setTimeout(createBot, 10000);
