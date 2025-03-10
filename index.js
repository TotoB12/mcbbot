const mineflayer = require('mineflayer')
require('dotenv').config()

const bot_username = process.env.MC_USERNAME

const bot = mineflayer.createBot({
  host: 'localhost', // minecraft server ip
  username: bot_username, // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
  auth: 'offline', // for offline mode servers, you can set this to 'offline'
  port: 25565,              // set if you need a port that isn't 25565
  version: "1.21.1",           // only set if you need a specific version or snapshot (ie: "1.8.9" or "1.16.5"), otherwise it's set automatically
  // password: '12345678'      // set if you want to use password-based auth (may be unreliable). If specified, the `username` must be an email
})

bot.once('spawn', () => {
  bot.chat('I\'m alive!')
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return

  if (message.startsWith(bot_username)) {
    const command = message.slice(bot_username.length + 1)
    bot.chat(command)
  }
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)