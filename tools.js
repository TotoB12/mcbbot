const { Movements, goals } = require('mineflayer-pathfinder');
const GoalFollow = goals.GoalFollow;

function moveToPlayer(bot, playerName) {
  return new Promise((resolve, reject) => {
    const player = bot.players[playerName];
    if (!player || !player.entity) {
      bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`);
      return reject(new Error(`Player ${playerName} not found or not visible`));
    }

    const target = player.entity.position;
    bot.chat(`Coming ${playerName}...`);

    const timeout = setTimeout(() => {
      bot.pathfinder.setGoal(null);
      bot.chat("I couldn't reach you in time. Try again when I'm closer.");
      reject(new Error("Movement timeout"));
    }, 60000);

    const goal = new goals.GoalNear(target.x, target.y, target.z, 1);
    const defaultMove = new Movements(bot);
    bot.pathfinder.setMovements(defaultMove);
    bot.pathfinder.setGoal(goal);

    bot.once('goal_reached', () => {
      clearTimeout(timeout);
      bot.chat(`I'm here ${playerName}!`);
      resolve();
    });

    bot.once('path_update', (results) => {
      if (results.status === 'noPath') {
        clearTimeout(timeout);
        bot.chat(`I can't find a path to you. Please make sure I can reach your position.`);
        reject(new Error("No path available"));
      }
    });
  });
}

function followPlayer(bot, playerName) {
  return new Promise((resolve, reject) => {
    const player = bot.players[playerName];
    if (!player || !player.entity) {
      bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`);
      return reject(new Error(`Player ${playerName} not found or not visible`));
    }

    bot.chat(`Following ${playerName}...`);
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    const goal = new GoalFollow(player.entity, 2); // Follow at 2 blocks distance

    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(goal, true); // Dynamic goal that updates with player movement

    // This promise won't resolve naturally since it's meant to run indefinitely
    // It will only end when stopped by the stop command
  });
}

function stopCurrentTask(bot, taskQueue, requestingUser, currentTask) {
  return new Promise((resolve) => {
    const admin_username = process.env.MC_ADMIN;

    if (!currentTask) {
      bot.chat("I'm not doing anything right now.");
      return resolve();
    }

    if (requestingUser !== currentTask.username && requestingUser !== admin_username) {
      bot.chat("You can't stop this task. Only the task creator or admin can.");
      return resolve();
    }

    bot.pathfinder.setGoal(null);
    taskQueue.clearCurrentTask();

    if (currentTask.command === 'follow') {
      bot.chat(`Stopped following ${currentTask.username} as per ${requestingUser}'s request.`);
    } else if (currentTask.command === 'come') {
      bot.chat(`Stopped moving towards ${currentTask.username} as per ${requestingUser}'s request.`);
    } else {
      bot.chat(`Stopped current task as per ${requestingUser}'s request.`);
    }

    resolve();
  });
}

function echoMessage(bot, message) {
  return new Promise((resolve) => {
    if (message.startsWith('/')) {
      bot.chat("Nice try. I can't run commands.");
      return resolve();
    }
    bot.chat(message);
    resolve();
  });
}

function listTasks(bot, taskQueue) {
  return new Promise((resolve) => {
    const tasks = taskQueue.listTasks();
    if (tasks.length === 0) {
      bot.chat("No tasks in queue.");
    } else {
      bot.chat("Current tasks in queue:");
      tasks.forEach(task => bot.chat(task));
    }
    resolve();
  });
}

module.exports = {
  moveToPlayer,
  followPlayer,
  stopCurrentTask,
  echoMessage,
  listTasks
};