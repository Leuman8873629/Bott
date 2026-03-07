const express = require("express");
const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");

const app = express();

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server started");
});

function createBot() {

const bot = mineflayer.createBot({
  host: "157.180.102.179",
  port: 29642,
  username: "rioBekasi",
  version: "1.20.1",

  plugins: [AutoAuth],
  AutoAuth: {
    password: "bot112022"
  }
});

bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);
bot.loadPlugin(pathfinder);

let jumpInterval;

// BOT SPAWN
bot.on("spawn", () => {

  console.log("Bot joined server");

  if (jumpInterval) clearInterval(jumpInterval);

  jumpInterval = setInterval(() => {
    bot.setControlState("jump", true);

    setTimeout(() => {
      bot.setControlState("jump", false);
    }, 200);

  }, 400);
});


// AUTO EQUIP ITEMS
bot.on("playerCollect", (collector) => {

  if (collector !== bot.entity) return;

  setTimeout(() => {

    const sword = bot.inventory.items().find(i => i.name.includes("sword"));
    if (sword) bot.equip(sword, "hand").catch(()=>{});

    const shield = bot.inventory.items().find(i => i.name.includes("shield"));
    if (shield) bot.equip(shield, "off-hand").catch(()=>{});

  }, 200);

});


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


// LOOK AT ENTITY
bot.on("physicTick", () => {

  if (bot.pvp.target) return;
  if (bot.pathfinder.isMoving()) return;

  const entity = bot.nearestEntity();

  if (entity) {
    bot.lookAt(entity.position.offset(0, entity.height, 0));
  }

});


// ATTACK MOBS
bot.on("physicTick", () => {

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

});


// ERROR LOGS
bot.on("kicked", reason => console.log("Kicked:", reason));
bot.on("error", err => console.log("Error:", err));


// AUTO RECONNECT
bot.on("end", () => {

  console.log("Bot disconnected. Reconnecting in 5 seconds...");

  if (jumpInterval) clearInterval(jumpInterval);

  setTimeout(createBot, 5000);

});

}

createBot();
