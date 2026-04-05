function setupAdvancedLogin() {
  const password = "bot112022";

  let loggedIn = false;
  let triedRegister = false;
  let loginAttempts = 0;

  // ================= CHAT + SYSTEM MESSAGES =================
  bot.on("messagestr", (msg) => {
    const text = msg.toLowerCase();
    console.log("📩 MSG:", text);

    // 📝 REGISTER DETECT
    if (
      (text.includes("register") || text.includes("/reg")) &&
      !text.includes("already") &&
      !triedRegister
    ) {
      console.log("📝 Registering...");
      bot.chat(`/register ${password} ${password}`);
      triedRegister = true;
      loginAttempts++;
    }

    // 🔐 LOGIN DETECT
    if (
      text.includes("login") ||
      text.includes("/l ") ||
      text.includes("log in")
    ) {
      console.log("🔐 Logging in...");
      bot.chat(`/login ${password}`);
      loginAttempts++;
    }

    // ✅ SUCCESS DETECT
    if (
      text.includes("logged in") ||
      text.includes("success") ||
      text.includes("welcome") ||
      text.includes("authenticated")
    ) {
      console.log("✅ Logged in successfully!");
      loggedIn = true;
    }
  });

  // ================= TITLE DETECTION (ADVANCED) =================
  bot._client.on("title", (packet) => {
    try {
      const text = JSON.stringify(packet).toLowerCase();
      console.log("📺 TITLE:", text);

      if (text.includes("login")) {
        console.log("📺 Title login detected → logging in");
        bot.chat(`/login ${password}`);
      }

      if (text.includes("register")) {
        console.log("📺 Title register detected → registering");
        bot.chat(`/register ${password} ${password}`);
      }
    } catch {}
  });

  // ================= FORCED LOGIN LOOP =================
  const loginInterval = setInterval(() => {
    if (loggedIn) {
      clearInterval(loginInterval);
      return;
    }

    if (loginAttempts > 6) {
      console.log("⚠️ Too many attempts, stopping spam");
      clearInterval(loginInterval);
      return;
    }

    console.log("⏳ Force login attempt...");
    bot.chat(`/login ${password}`);
    loginAttempts++;

  }, 5000);

  // ================= SAFETY TIMEOUT =================
  setTimeout(() => {
    if (!loggedIn) {
      console.log("⚠️ Login may have failed (GUI login server?)");
    }
  }, 20000);
}
