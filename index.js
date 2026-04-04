const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");

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

let lookLoop = null;
let jumpInterval = null;
let moveInterval = null;

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
    plugins: [AutoAuth],
    AutoAuth: {
      password: "bot112022",
      logging: true
    }
  });

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;
    startIdle();
  });

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

// ================= IDLE SYSTEM =================
function startIdle() {
  stopIdle();

  // 👀 LOOK AROUND
  function look() {
    if (!bot?.entity) return;

    try {
      const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.8;
      const pitch = bot.entity.pitch + (Math.random() - 0.5) * 0.4;
      bot.look(yaw, pitch, true);
    } catch {}

    lookLoop = setTimeout(look, 2000 + Math.random() * 2000);
  }
  look();

  // 🦘 ULTRA RELIABLE JUMP
  if (jumpInterval) clearInterval(jumpInterval);

  jumpInterval = setInterval(() => {
    if (!bot?.entity) return;

    // 🧠 STEP 1: force tiny movement (fixes onGround + anti-cheat)
    bot.setControlState("forward", true);

    setTimeout(() => {
      bot.setControlState("forward", false);

      // 🧠 STEP 2: HARD RESET jump
      bot.setControlState("jump", false);

      setTimeout(() => {
        // 🧠 STEP 3: force jump (even if server is strict)
        bot.setControlState("jump", true);

        setTimeout(() => {
          bot.setControlState("jump", false);
        }, 350);

      }, 80);

    }, 120);

  }, 4500);

  // 🚶 MICRO MOVEMENT (anti-AFK bypass)
  if (moveInterval) clearInterval(moveInterval);

  moveInterval = setInterval(() => {
    if (!bot?.entity) return;

    const moves = ["forward", "back", "left", "right"];
    const m = moves[Math.floor(Math.random() * moves.length)];

    bot.setControlState(m, true);

    setTimeout(() => {
      bot.setControlState(m, false);
    }, 800 + Math.random() * 1200);

  }, 5000 + Math.random() * 3000);
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
