const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
const pvp = require('mineflayer-pvp').plugin
require('dotenv').config()
const tools = require('./tools')
const { TaskQueue, Task } = require('./tasks')
const Vec3 = require('vec3').Vec3

const bot_username = process.env.MC_USERNAME
const admin_username = process.env.MC_ADMIN

const bot = mineflayer.createBot({
  host: 'localhost',
  username: bot_username,
  auth: 'offline',
  port: 25565,
  version: "1.21.1",
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(pvp)

const taskQueue = new TaskQueue()
let currentTask = null

// Define allowed blocks for mining
const allowedBlocks = [
  "coal_ore", "deepslate_coal_ore", "copper_ore", "deepslate_copper_ore",
  "iron_ore", "deepslate_iron_ore", "gold_ore", "deepslate_gold_ore",
  "redstone_ore", "deepslate_redstone_ore", "lapis_ore", "deepslate_lapis_ore",
  "diamond_ore", "deepslate_diamond_ore", "emerald_ore", "deepslate_emerald_ore",
  "nether_quartz_ore", "nether_gold_ore", "ancient_debris"
]

bot.once('spawn', () => {
  bot.chat('I\'m alive!')
})

bot.on('death', () => {
  bot.chat('I died lol x.x')
})

bot.on('noteHeard', (block, instrument, pitch) => {
  bot.chat(`Music for my ears! I just heard a ${instrument.name}`)
})

bot.on('playerJoined', (player) => {
  if (player.username !== bot.username) {
    bot.chat(`Hello, ${player.username}! Welcome to the server.`)
  }
})

bot.on('playerLeft', (player) => {
  if (player.username === bot.username) return
  bot.chat(`Bye ${player.username}`)
})

bot.on('entityCrouch', (entity) => {
  bot.chat(`${entity.username} you so sneaky.`)
})

bot.on('entityEat', (entity) => {
  bot.chat(`${entity.username}: OM NOM NOM NOMONOM. That's what you sound like.`)
})

bot.on('entitySpawn', (entity) => {
  if (entity.type === 'mob') {
    console.log(`Look out! A ${entity.displayName} spawned at ${entity.position}`)
  } else if (entity.type === 'object') {
    console.log(`There's a ${entity.displayName} at ${entity.position}`)
  } else if (entity.type === 'global') {
    bot.chat('Ooh lightning!')
  }
})

bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  if (!message.startsWith(bot_username)) return

  const originalCommand = message
  const commandWithPrefix = message.slice(bot_username.length + 1)
  const commandParts = commandWithPrefix.split(' ')
  const command = commandParts[0].toLowerCase()

  console.log(`Received command: ${command}.`)

  switch (command) {
    case 'come':
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        () => tools.moveToPlayer(bot, username)
      ))
      break

    case 'follow':
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        () => tools.followPlayer(bot, username)
      ))
      break

    case 'stop':
      await tools.stopCurrentTask(bot, taskQueue, username, currentTask)
      break

    case 'echo':
    case 'say':
      const echoMessage = commandWithPrefix.substring(command.length + 1)
      await tools.echoMessage(bot, echoMessage)
      break

    case 'tasks':
      await tools.listTasks(bot, taskQueue)
      break

    case 'mine':
      if (commandParts.length < 3) {
        bot.chat("Usage: mine <block> <amount>");
        break;
      }
      const blockName = commandParts[1];
      const amount = parseInt(commandParts[2]);
      if (isNaN(amount) || amount <= 0) {
        bot.chat("Please specify a valid positive integer for amount.");
        break;
      }
      if (!allowedBlocks.includes(blockName)) {
        bot.chat(`I can't mine ${blockName}. Allowed blocks are: ${allowedBlocks.join(', ')}.`);
        break;
      }
      if (!tools.hasRequiredTool(bot, blockName)) {
        bot.chat(`I don't have the required pickaxe to mine ${blockName}.`);
        break;
      }
      const slotsNeeded = Math.ceil(amount / 64);
      if (bot.inventory.emptySlotCount() < slotsNeeded) {
        bot.chat(`I might not have enough inventory space to mine ${amount} ${blockName}, but I'll try.`);
      }
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        async (task) => {
          await tools.mineBlocks(bot, blockName, amount, task);
        }
      ));
      break;

    case 'guard':
      if (commandParts.length < 2) {
        bot.chat("Usage: guard me | guard player <player> | guard <x> <y> <z>");
        break;
      }
      let target;
      if (commandParts[1].toLowerCase() === 'me') {
        target = username; // Guard the user who sent the command
      } else if (commandParts[1].toLowerCase() === 'player' && commandParts.length >= 3) {
        target = commandParts[2]; // Guard the specified player
      } else if (commandParts.length >= 4) {
        const x = parseFloat(commandParts[1]);
        const y = parseFloat(commandParts[2]);
        const z = parseFloat(commandParts[3]);
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          bot.chat("Invalid coordinates. Usage: guard <x> <y> <z>");
          break;
        }
        target = new Vec3(x, y, z); // Guard the specified coordinates
      } else {
        bot.chat("Usage: guard me | guard player <player> | guard <x> <y> <z>");
        break;
      }
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        (task) => tools.guard(bot, target, task)
      ));
      break;

    default:
      bot.chat(`Unknown command: ${command}. Try 'come', 'follow', 'stop', 'echo', 'say', 'tasks', 'mine', or 'guard'.`)
      break
  }
})

taskQueue.onTaskStart = (task) => {
  currentTask = task
}
taskQueue.onTaskEnd = () => {
  currentTask = null
}

bot.on('kicked', console.log)
bot.on('error', console.log)