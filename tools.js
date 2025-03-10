function moveToPlayer(bot, playerName) {
  return new Promise((resolve, reject) => {
    const player = bot.players[playerName];

    if (!player || !player.entity) {
      bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`);
      return reject(new Error(`Player ${playerName} not found or not visible`));
    }

    const target = player.entity.position;

    bot.chat(`Coming ${playerName}...`);

    // Set a timeout to prevent the bot from trying forever
    const timeout = setTimeout(() => {
      bot.pathfinder.setGoal(null);
      bot.chat("I couldn't reach you in time. Try again when I'm closer.");
      reject(new Error("Movement timeout"));
    }, 60000); // 60 second timeout

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
      bot.chat(`I'm here ${playerName}!`);
      resolve();
    });

    // Handle pathfinding failures
    bot.once('path_update', (results) => {
      // console.log(results);
      if (results.status === 'noPath') {
        clearTimeout(timeout);
        bot.chat(`I can't find a path to you. Please make sure I can reach your position.`);
        reject(new Error("No path available"));
      }
    });
  });
}

// Echo/say command - repeats whatever message is passed
function echoMessage(bot, message) {
  return new Promise((resolve) => {
    // make sure the bot doesnt run a command (starts with /)
    if (message.startsWith('/')) {
      bot.chat("Nice try. I can't run commands.");
      return resolve();
    }
    bot.chat(message);
    resolve();
  });
}

// List all tasks in the queue
function listTasks(bot, taskQueue) {
  return new Promise((resolve) => {
    const tasks = taskQueue.listTasks();

    if (tasks.length === 0) {
      bot.chat("No tasks in queue.");
    } else {
      bot.chat("Current tasks in queue:");
      tasks.forEach(task => {
        bot.chat(task);
      });
    }

    resolve();
  });
}

module.exports = {
  moveToPlayer,
  echoMessage,
  listTasks
};