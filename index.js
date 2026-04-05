const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");
const { pathfinder } = require("mineflayer-pathfinder");
const pvp = require("mineflayer-pvp").plugin;

const app = express();
app.get("/", (_, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

// keep alive
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

let bot = null;
let reconnecting = false;
let fighting = false;

let lookLoop = null;
let jumpInterval = null;
let moveInterval = null;

// ================= RESET CONTROLS =================
function resetControls() {
  if (!bot) return;
  ["forward","back","left","right","jump","sprint","sneak"]
    .forEach(c => bot.setControlState(c, false));
}

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
    host: "TSLifestealsmp.aternos.me",
    port: 27900,
    username: "heheh_botwaa",
    version: false,

    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true,
      timeout: 5000,
      repeat: true // 🔥 important
    }
  });

  // load plugins
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(pvp);

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;

    // fallback manual auth
    setTimeout(() => {
      bot.chat("/register bot112022 bot112022");
      bot.chat("/login bot112022");
    }, 3000);

    setTimeout(() => {
      startIdle();
    }, 6000);
  });

  // ================= AUTO DEFENSE =================
  bot.on("entityHurt", (entity) => {
    if (!bot?.entity || fighting) return;

    if (entity === bot.entity) {
      const attacker = bot.nearestEntity(e =>
        (e.type === "player" || e.type === "mob") &&
        e !== bot.entity
      );

      if (attacker) {
        console.log("⚔️ Attacked by:", attacker.name || attacker.mobType);
        startFight(attacker);
      }
    }
  });

  function startFight(enemy) {
    if (!bot?.entity || fighting) return;

    fighting = true;

    stopIdle();
    resetControls();

    try {
      bot.pvp.attack(enemy);
    } catch (e) {
      console.log("⚠️ PVP error:", e.message);
    }
  }

  function stopFight() {
    fighting = false;

    try {
      bot.pvp.stop();
    } catch {}

    resetControls();

    setTimeout(() => startIdle(), 2000);
  }

  bot.on("entityDead", () => fighting && stopFight());
  bot.on("entityGone", () => fighting && stopFight());

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

// ================= IDLE =================
function startIdle() {
  stopIdle();
  resetControls();

  function look() {
    if (!bot?.entity || fighting) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.6;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.3;
      bot.look(yaw, pitch, true);
    } catch {}

    lookLoop = setTimeout(look, 2000 + Math.random() * 2000);
  }
  look();

  jumpInterval = setInterval(() => {
    if (!bot?.entity || fighting) return;
    if (!bot.entity.onGround) return;

    bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 100);
  }, 5000);

  moveInterval = setInterval(() => {
    if (!bot?.entity || fighting) return;

    const move = Math.random() > 0.5 ? "left" : "right";
    bot.setControlState(move, true);

    setTimeout(() => {
      bot.setControlState(move, false);
    }, 500);
  }, 7000);
}

// ================= STOP =================
function stopIdle() {
  if (lookLoop) clearTimeout(lookLoop);
  if (jumpInterval) clearInterval(jumpInterval);
  if (moveInterval) clearInterval(moveInterval);

  lookLoop = null;
  jumpInterval = null;
  moveInterval = null;
}

// ================= RECONNECT =================
function safeReconnect() {
  stopIdle();
  resetControls();

  if (reconnecting) return;

  reconnecting = true;
  console.log("🔄 Reconnecting in 10 sec...");

  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, 10000);
}

// ================= START =================
createBot();
