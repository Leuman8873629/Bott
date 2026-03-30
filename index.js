const mineflayer = require("mineflayer");

function createBot() {
  const bot = mineflayer.createBot({
    host: "Tomanreturns.aternos.me", // e.g. play.example.com
    port: 37089,
    username: "AFK_Bot_01"
  });

  bot.on("spawn", () => {
    console.log("✅ Bot joined server");

    startAFK(bot);
  });

  bot.on("end", () => {
    console.log("❌ Disconnected... reconnecting in 5s");
    setTimeout(createBot, 5000);
  });

  bot.on("error", (err) => {
    console.log("Error:", err.message);
  });
}

function startAFK(bot) {
  setInterval(() => {
    // Random movement
    const actions = ["forward", "back", "left", "right"];

    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);

    // Stop after random time
    setTimeout(() => {
      bot.setControlState(action, false);
    }, Math.random() * 2000 + 500);

    // Jump sometimes
    if (Math.random() < 0.3) bot.setControlState("jump", true);
    setTimeout(() => bot.setControlState("jump", false), 500);

    // Sneak sometimes
    if (Math.random() < 0.2) bot.setControlState("sneak", true);
    setTimeout(() => bot.setControlState("sneak", false), 1000);

    // Look around randomly
    const yaw = Math.random() * Math.PI * 2;
    const pitch = (Math.random() - 0.5) * Math.PI;
    bot.look(yaw, pitch, true);

  }, 3000);
}

createBot();
