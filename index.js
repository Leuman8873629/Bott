const express = require("express")
const http = require("http")
const mineflayer = require("mineflayer")
const pvp = require("mineflayer-pvp").plugin
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder")
const armorManager = require("mineflayer-armor-manager")
const AutoAuth = require("mineflayer-auto-auth")

const app = express()

app.get("/", (_, res) => res.send("Bot is running"))
app.listen(process.env.PORT || 3000)

// keep repl alive
setInterval(() => {
if (process.env.PROJECT_DOMAIN) {
http.get(`http://${process.env.PROJECT_DOMAIN}.repl.co/`)
}
}, 224000)

function createBot() {

const bot = mineflayer.createBot({
host: "157.180.102.179",
port: 29642,
username: "rioBekasi",
version: false,
plugins: [AutoAuth],
AutoAuth: "bot112022"
})

bot.loadPlugin(pvp)
bot.loadPlugin(armorManager)
bot.loadPlugin(pathfinder)

let guardPos = null

// SPAWN
bot.once("spawn", () => {

console.log("Bot joined server")

startAntiAFK()

})


// HUMAN LIKE ANTI AFK
function startAntiAFK() {

function randomJump() {

const delay = Math.floor(Math.random() * 5000) + 8000

setTimeout(() => {

bot.setControlState("jump", true)

setTimeout(() => {
bot.setControlState("jump", false)
}, 120)

randomJump()

}, delay)

}

randomJump()

}


// AUTO EQUIP
bot.on("playerCollect", (collector) => {

if (collector !== bot.entity) return

setTimeout(() => {

const sword = bot.inventory.items().find(i => i.name.includes("sword"))
if (sword) bot.equip(sword, "hand").catch(()=>{})

const shield = bot.inventory.items().find(i => i.name.includes("shield"))
if (shield) bot.equip(shield, "off-hand").catch(()=>{})

}, 250)

})


// GUARD SYSTEM
function guardArea(pos) {

guardPos = pos.clone()

if (!bot.pvp.target) moveToGuardPos()

}

function stopGuarding() {

guardPos = null
bot.pvp.stop()
bot.pathfinder.setGoal(null)

}

function moveToGuardPos() {

if (!guardPos) return

const mcData = require("minecraft-data")(bot.registry.version)
const movements = new Movements(bot, mcData)

bot.pathfinder.setMovements(movements)

bot.pathfinder.setGoal(
new goals.GoalBlock(
guardPos.x,
guardPos.y,
guardPos.z
)
)

}

bot.on("stoppedAttacking", () => {
if (guardPos) moveToGuardPos()
})


// LOOK AT ENTITY
let lookDelay = 0

bot.on("physicsTick", () => {

if (!bot.entity) return
if (bot.pvp.target) return
if (bot.pathfinder.isMoving()) return

lookDelay++

if (lookDelay < 20) return
lookDelay = 0

const entity = bot.nearestEntity()

if (entity) {
bot.lookAt(entity.position.offset(0, entity.height, 0)).catch(()=>{})
}

})


// ATTACK MOBS
bot.on("physicsTick", () => {

if (!guardPos) return

const filter = e =>
e.type === "mob" &&
e.position.distanceTo(bot.entity.position) < 16 &&
e.mobType !== "Armor Stand"

const entity = bot.nearestEntity(filter)

if (entity) bot.pvp.attack(entity)

})


// CHAT COMMANDS
bot.on("chat", (username, message) => {

if (username === bot.username) return

if (message === "guard") {

const player = bot.players[username]

if (player && player.entity) {
bot.chat("I will guard here!")
guardArea(player.entity.position)
}

}

if (message === "stop") {
bot.chat("Stopping guard!")
stopGuarding()
}

})


// LOGGING
bot.on("kicked", console.log)
bot.on("error", console.log)


// RECONNECT
bot.on("end", () => {

console.log("Bot disconnected. Reconnecting in 30 seconds...")

setTimeout(createBot, 30000)

})

}

createBot()
