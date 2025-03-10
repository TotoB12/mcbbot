const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
require('dotenv').config()
const tools = require('./tools')
const { TaskQueue, Task } = require('./tasks')

const bot_username = process.env.MC_USERNAME
const admin_username = process.env.MC_ADMIN

const bot = mineflayer.createBot({
  host: 'localhost',
  username: bot_username,
  auth: 'offline',
  port: 25565,
  version: "1.21.1",
})

// Load the pathfinder plugin
bot.loadPlugin(pathfinder)

// Initialize the task queue and track current task
const taskQueue = new TaskQueue()
let currentTask = null

bot.once('spawn', () => {
  bot.chat('I\'m alive!')
})

bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  if (!message.startsWith(bot_username)) return

  const originalCommand = message;
  const commandWithPrefix = message.slice(bot_username.length + 1);
  const commandParts = commandWithPrefix.split(' ');
  const command = commandParts[0].toLowerCase();

  console.log(`Received command: ${command}.`);

  // Handle different commands
  switch (command) {
    case 'come':
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        () => tools.moveToPlayer(bot, username)
      ));
      break;

    case 'follow':
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        () => tools.followPlayer(bot, username)
      ));
      break;

    case 'stop':
      await tools.stopCurrentTask(bot, taskQueue, username, currentTask);
      break;

    case 'echo':
    case 'say':
      const echoMessage = commandWithPrefix.substring(command.length + 1);
      await tools.echoMessage(bot, echoMessage);
      break;

    case 'tasks':
      await tools.listTasks(bot, taskQueue);
      break;

    default:
      bot.chat(`Unknown command: ${command}. Try 'come', 'follow', 'stop', 'echo', 'say', or 'tasks'.`);
      break;
  }
})

// Update current task when queue processes
taskQueue.onTaskStart = (task) => {
  currentTask = task;
}
taskQueue.onTaskEnd = () => {
  currentTask = null;
}

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)