const express = require("express");
const http = require("http");
const mineflayer = require('mineflayer')
const pvp = require('mineflayer-pvp').plugin
const { pathfinder, Movements, goals} = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const app = express();

app.use(express.json());

app.get("/", (_, res) => res.sendFile(__dirname + "/index.html"));
app.listen(process.env.PORT || 3000);

// Keep alive (Replit)
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`);
}, 224000);

// ================= BOT =================

function createBot () {

const bot = mineflayer.createBot({
  host: 'Tomanreturns.aternos.me',
  port: 37089,
  username:'rioBekassii',
  version: 1.21.11
})

// Load plugins
bot.loadPlugin(pvp)
bot.loadPlugin(armorManager)
bot.loadPlugin(pathfinder)

// ================= SMART AUTH =================

const PASSWORD = "bot112022"

let registered = false
let loggedIn = false

bot.on('spawn', () => {
  registered = false
  loggedIn = false

  console.log("Bot spawned")

  // small delay to look human
  setTimeout(() => {
    bot.chat("/login " + PASSWORD)
  }, 2000)
})

bot.on('messagestr', (msg) => {
  const message = msg.toLowerCase()

  if (message.includes("/register") && !registered) {
    bot.chat(`/register ${PASSWORD} ${PASSWORD}`)
    registered = true
    console.log("Registered")
  }

  if (message.includes("/login") && !loggedIn) {
    setTimeout(() => {
      bot.chat(`/login ${PASSWORD}`)
    }, 1500)

    loggedIn = true
    console.log("Logged in")
  }
})

// ================= AUTO EQUIP =================

bot.on('playerCollect', (collector) => {
  if (collector !== bot.entity) return

  setTimeout(() => {
    const sword = bot.inventory.items().find(i => i.name.includes('sword'))
    if (sword) bot.equip(sword, 'hand')
  }, 150)

  setTimeout(() => {
    const shield = bot.inventory.items().find(i => i.name.includes('shield'))
    if (shield) bot.equip(shield, 'off-hand')
  }, 300)
})

// ================= GUARD SYSTEM =================

let guardPos = null

function guardArea (pos) {
  guardPos = pos.clone()
  moveToGuardPos()
}

function stopGuarding () {
  guardPos = null
  bot.pvp.stop()
  bot.pathfinder.setGoal(null)
}

function moveToGuardPos () {
  const mcData = require('minecraft-data')(bot.version)
  bot.pathfinder.setMovements(new Movements(bot, mcData))
  bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
}

bot.on('stoppedAttacking', () => {
  if (guardPos) moveToGuardPos()
})

// Look at nearby entities (idle behavior)
bot.on('physicTick', () => {
  if (bot.pvp.target) return
  if (bot.pathfinder.isMoving()) return

  const entity = bot.nearestEntity()
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
})

// Attack mobs near guard area
bot.on('physicTick', () => {
  if (!guardPos) return

  const entity = bot.nearestEntity(e =>
    e.type === 'mob' &&
    e.mobType !== 'Armor Stand' &&
    e.position.distanceTo(bot.entity.position) < 16
  )

  if (entity) bot.pvp.attack(entity)
})

// ================= CHAT COMMANDS =================

bot.on('chat', (username, message) => {

  if (username === bot.username) return

  if (message === 'guard') {
    const player = bot.players[username]

    if (!player || !player.entity) {
      bot.chat("I can't see you!")
      return
    }

    bot.chat('Guarding this area!')
    guardArea(player.entity.position)
  }

  if (message === 'stop') {
    bot.chat('Stopping guard!')
    stopGuarding()
  }
})

// ================= RECONNECT SYSTEM =================

bot.on('end', () => {
  console.log("Bot disconnected. Reconnecting in 5s...")
  setTimeout(createBot, 5000)
})

bot.on('kicked', console.log)
bot.on('error', console.log)

}

// Start bot
createBot()
