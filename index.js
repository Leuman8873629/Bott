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

// KEEP ALIVE
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

// ================= GLOBALS =================
let bot = null;
let reconnecting = false;
let lookLoop = null;
let jumpInterval = null;
let moveInterval = null;
let lastHealth = 20;
let guardPos = null;
const OWNER = "SPARKXBOII"; // 🔥 CHANGE THIS

// ================= CREATE BOT =================
function createBot() {
  if (reconnecting) return;
  reconnecting = true;
  console.log("🚀 Starting bot...");

  if (bot) {
    try {
      bot.removeAllListeners();
      bot.quit();
    } catch {}
    bot = null;
  }

  bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me",
    port: 37089,
    username: "heheh_botwaa",
    version: false,
    plugins: [AutoAuth, pvp, armorManager, pathfinder],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  // ================= LOGIN & SPAWN =================
  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;
    lastHealth = bot.health;
    startIdle();
  });

  // ================= DAMAGE DETECTION =================
  bot.on("health", () => {
    if (!bot?.entity) return;
    if (bot.health < lastHealth) {
      console.log("💥 Got hit!");
      reactToHit();
    }
    lastHealth = bot.health;
  });

  // ================= HIT REACTION =================
  function reactToHit() {
    if (!bot?.entity) return;
    const moves = ["forward", "back", "left", "right"];
    const move = moves[Math.floor(Math.random() * moves.length)];

    bot.setControlState("sprint", true);
    bot.setControlState(move, true);

    if (bot.entity.onGround) {
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 100);
    }

    setTimeout(() => {
      bot.setControlState(move, false);
      bot.setControlState("sprint", false);
    }, 1000 + Math.random() * 500);
  }

  // ================= IDLE SYSTEM =================
  function startIdle() {
    stopIdle();

    // 👀 LOOK AROUND
    function look() {
      if (!bot?.entity) return;
      try {
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
        const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
        bot.look(yaw, pitch, true);
      } catch {}
      lookLoop = setTimeout(look, 2000 + Math.random() * 2000);
    }
    look();

    // 🦘 JUMP
    jumpInterval = setInterval(() => {
      if (!bot?.entity || !bot.entity.onGround) return;
      bot.setControlState("jump", true);
      setTimeout(() => bot.setControlState("jump", false), 100);
    }, 4500 + Math.random() * 1000);

    // 🚶 MOVE
    moveInterval = setInterval(() => {
      if (!bot?.entity) return;
      const moves = ["left", "right"];
      const move = moves[Math.floor(Math.random() * moves.length)];
      bot.setControlState(move, true);
      setTimeout(() => bot.setControlState(move, false), 500 + Math.random() * 500);
    }, 6000 + Math.random() * 3000);
  }

  function stopIdle() {
    if (lookLoop) clearTimeout(lookLoop);
    if (jumpInterval) clearInterval(jumpInterval);
    if (moveInterval) clearInterval(moveInterval);
    lookLoop = null;
    jumpInterval = null;
    moveInterval = null;
  }

  // ================= GUARD SYSTEM =================
  function moveToGuardPos() {
    if (!guardPos) return;
    const mcData = require("minecraft-data")(bot.version);
    bot.pathfinder.setMovements(new Movements(bot, mcData));
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  function guardArea(pos) {
    guardPos = pos.clone();
    moveToGuardPos();
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  bot.on("stoppedAttacking", () => {
    if (guardPos) moveToGuardPos();
  });

  // ================= CHAT COMMANDS =================
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
  function safeReconnect() {
    stopIdle();
    if (reconnecting) return;
    reconnecting = true;
    console.log("🔄 Reconnecting in 10 sec...");
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  }

  bot.on("kicked", (r) => {
    console.log("❌ Kicked:", r.toString());
    safeReconnect();
  });

  bot.on("end", () => {
    console.log("🔌 Disconnected");
    safeReconnect();
  });

  bot.on("error", (e) => {
    console.log("⚠️ Error:", e.message);
  });
}

// ================= START =================
createBot();
