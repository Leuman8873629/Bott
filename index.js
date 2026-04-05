const express = require("express");
const http = require("http");
const mineflayer = require("mineflayer");
const AutoAuth = require("mineflayer-auto-auth");

const app = express();
app.get("/", (_, res) => res.send("Bot running"));
app.listen(process.env.PORT || 3000);

// Keep alive
setInterval(() => {
  if (process.env.PROJECT_DOMAIN) {
    http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
  }
}, 240000);

let bot = null;
let reconnecting = false;
let jumpLoop = null;
let lastJump = 0;

// ================= RESET =================
function resetControls() {
  if (!bot) return;
  try {
    ["forward", "back", "left", "right", "jump", "sprint", "sneak"]
      .forEach(c => bot.setControlState(c, false));
  } catch {}
}

// ================= JUMP LOOP =================
function startJump() {
  if (jumpLoop) clearTimeout(jumpLoop);
  lastJump = 0;

  function loop() {
    try {
      if (!bot?.entity) {
        jumpLoop = setTimeout(loop, 1000);
        return;
      }

      const now = Date.now();
      const timeSinceLast = now - lastJump;

      // Jump if on ground OR if stuck airborne (knockback/hit recovery)
      if (bot.entity.onGround || timeSinceLast > 3000) {
        bot.setControlState("jump", true);
        setTimeout(() => {
          if (bot) bot.setControlState("jump", false);
        }, 120);
        lastJump = now;
      }
    } catch (e) {
      console.log("⚠️ Jump loop error:", e.message);
    }

    jumpLoop = setTimeout(loop, 2000 + Math.random() * 1000);
  }

  loop();
}

// ================= RECONNECT =================
function safeReconnect() {
  if (jumpLoop) {
    clearTimeout(jumpLoop);
    jumpLoop = null;
  }
  resetControls();
  if (reconnecting) return;
  reconnecting = true;
  console.log("🔄 Reconnecting in 10 sec...");
  setTimeout(() => {
    reconnecting = false;
    createBot();
  }, 10000);
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
      repeat: true
    }
  });

  bot.once("login", () => console.log("🔐 Logged in"));

  bot.once("spawn", () => {
    console.log("✅ Bot joined!");
    reconnecting = false;

    setTimeout(() => {
      if (!bot) return;
      bot.chat("/register bot112022 bot112022");
      bot.chat("/login bot112022");
    }, 3000);

    setTimeout(() => {
      if (!bot) return;
      startJump();
    }, 6000);
  });

  // Resume jump loop after being hurt (knockback recovery)
  bot.on("entityHurt", (entity) => {
    if (entity !== bot.entity) return;
    console.log("💥 Bot was hit! Resetting jump timer...");
    lastJump = 0; // force jump attempt on next loop tick
  });

  bot.on("kicked", (r) => {
    console.log("❌ Kicked:", typeof r === "object" ? JSON.stringify(r) : r);
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
