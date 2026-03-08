const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Minecraft Bot Running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Web server running on port " + PORT);
});

function createBot() {

console.log("Starting bot...");

const bot = mineflayer.createBot({
  host: "157.180.102.179",
  port: 29642,
  username: "rioBekasi",
  version: false
});

bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);
bot.loadPlugin(pathfinder);

let guardPos = null;


// SPAWN
bot.once("spawn", () => {

  console.log("Bot joined server");

  setTimeout(() => {
    bot.chat("/login bot112022");
  }, 5000);

  randomJump();

});


// HUMAN LIKE ANTI AFK
function randomJump() {

  const delay = Math.floor(Math.random() * 5000) + 8000;

  setTimeout(() => {

    bot.setControlState("jump", true);

    setTimeout(() => {
      bot.setControlState("jump", false);
    }, 120);

    randomJump();

  }, delay);

}


// AUTO EQUIP
bot.on("playerCollect", (collector) => {

  if (collector !== bot.entity) return;

  setTimeout(() => {

    const sword = bot.inventory.items().find(i => i.name.includes("sword"));
    if (sword) bot.equip(sword, "hand").catch(()=>{});

    const shield = bot.inventory.items().find(i => i.name.includes("shield"));
    if (shield) bot.equip(shield, "off-hand").catch(()=>{});

  }, 300);

});


// GUARD SYSTEM
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

  const mcData = require("minecraft-data")(bot.registry.version);
  const movements = new Movements(bot, mcData);

  bot.pathfinder.setMovements(movements);

  bot.pathfinder.setGoal(
    new goals.GoalBlock(
      guardPos.x,
      guardPos.y,
      guardPos.z
    )
  );
}

bot.on("stoppedAttacking", () => {
  if (guardPos) moveToGuardPos();
});


// LOOK AT ENTITY (SLOWER)
let lookCooldown = 0;

bot.on("physicsTick", () => {

  if (!bot.entity) return;
  if (bot.pvp.target) return;
  if (bot.pathfinder.isMoving()) return;

  lookCooldown++;

  if (lookCooldown < 20) return;
  lookCooldown = 0;

  const entity = bot.nearestEntity();

  if (entity) {
    bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(()=>{});
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
      bot.chat("I will guard here!");
      guardArea(player.entity.position);
    }

  }

  if (message === "stop") {
    bot.chat("Stopping guard!");
    stopGuarding();
  }

  if (username === ".SickBike5732" && message === "&&stop&&") {
    bot.chat("Shutting down...");
    process.exit();
  }

});


// LOGGING
bot.on("kicked", (reason) => {
  console.log("Bot was kicked:", reason);
});

bot.on("error", (err) => {
  console.log("Bot error:", err);
});


// AUTO RECONNECT
bot.on("end", () => {

  console.log("Bot disconnected. Reconnecting in 30 seconds...");

  setTimeout(createBot, 30000);

});

}


// START BOT
setTimeout(createBot, 5000);
