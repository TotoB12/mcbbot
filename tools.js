function moveToPlayer(bot, playerName) {
    return new Promise((resolve, reject) => {
      const player = bot.players[playerName];
      
      if (!player || !player.entity) {
        bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`);
        return reject(new Error(`Player ${playerName} not found or not visible`));
      }
      
      const target = player.entity.position;
      
      bot.chat(`Moving to ${playerName}'s position...`);
      
      // Set a timeout to prevent the bot from trying forever
      const timeout = setTimeout(() => {
        bot.pathfinder.setGoal(null);
        bot.chat("I couldn't reach you in time. Try again when I'm closer.");
        reject(new Error("Movement timeout"));
      }, 30000); // 30 second timeout
      
      // Create a movement goal with a small arrival radius
      const { goals, Movements } = require('mineflayer-pathfinder');
      const goal = new goals.GoalNear(target.x, target.y, target.z, 1); // Get within 1 block
      const defaultMove = new Movements(bot);
      
      // Start pathfinding
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(goal);
      
      // Listen for goal reached event
      bot.once('goal_reached', () => {
        clearTimeout(timeout);
        bot.chat(`I've reached ${playerName}!`);
        resolve();
      });
      
      // Handle pathfinding failures
      bot.pathfinder.once('path_update', (results) => {
        if (results.status === 'noPath') {
          clearTimeout(timeout);
          bot.chat(`I can't find a path to you. Please make sure I can reach your position.`);
          reject(new Error("No path available"));
        }
      });
    });
  }
  
  module.exports = {
    moveToPlayer
  };