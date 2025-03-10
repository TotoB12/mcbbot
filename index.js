const mineflayer = require('mineflayer')
const { pathfinder } = require('mineflayer-pathfinder')
require('dotenv').config()
const tools = require('./tools')
const { TaskQueue, Task } = require('./tasks')

const bot_username = process.env.MC_USERNAME

const bot = mineflayer.createBot({
  host: 'localhost', // minecraft server ip
  username: bot_username, // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
  auth: 'offline', // for offline mode servers, you can set this to 'offline'
  port: 25565,              // set if you need a port that isn't 25565
  version: "1.21.1",           // only set if you need a specific version or snapshot (ie: "1.8.9" or "1.16.5"), otherwise it's set automatically
  // password: '12345678'      // set if you want to use password-based auth (may be unreliable). If specified, the `username` must be an email
})

// Load the pathfinder plugin
bot.loadPlugin(pathfinder)

// Initialize the task queue
const taskQueue = new TaskQueue()

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
      // Add come command to the task queue
      taskQueue.addTask(new Task(
        bot,
        username,
        command,
        originalCommand,
        () => tools.moveToPlayer(bot, username)
      ));
      break;
      
    case 'echo':
    case 'say':
      // Execute echo/say commands immediately
      const echoMessage = commandWithPrefix.substring(command.length + 1);
      await tools.echoMessage(bot, echoMessage);
      break;
      
    case 'tasks':
      // Execute tasks command immediately
      await tools.listTasks(bot, taskQueue);
      break;
      
    default:
      bot.chat(`Unknown command: ${command}. Try 'come', 'echo', 'say', or 'tasks'.`);
      break;
  }
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)