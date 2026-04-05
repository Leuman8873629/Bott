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
let jumpLoop = null;

// ================= RESET =================
function resetControls() {
  if (!bot) return;
  ["forward","back","left","right","jump","sprint","sneak"]
    .forEach(c => bot.setControlState(c, false));
}

// ================= CREATE =================
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
      bot.chat("/register bot112022 bot112022");
      bot.chat("/login bot112022");
    }, 3000);

    setTimeout(() => {
      startJump();
    }, 6000);
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

// ================= JUMP ONLY =================
function startJump() {
  if (jumpLoop) clearTimeout(jumpLoop);

  function loop() {
    if (!bot?.entity || !bot.entity.onGround) {
      jumpLoop = setTimeout(loop, 1000);
      return;
    }

    // jump
    bot.setControlState("jump", true);

    setTimeout(() => {
      bot.setControlState("jump", false);
    }, 120);

    // repeat every 2–3 sec
    jumpLoop = setTimeout(loop, 2000 + Math.random() * 1000);
  }

  loop();
}

// ================= RECONNECT =================
function safeReconnect() {
  if (jumpLoop) clearTimeout(jumpLoop);
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
