const { Movements, goals } = require('mineflayer-pathfinder')
const Vec3 = require('vec3').Vec3

// Mapping of blocks to minimum required pickaxe
const minPickaxeRequired = {
  'coal_ore': 'wooden_pickaxe',
  'deepslate_coal_ore': 'wooden_pickaxe',
  'copper_ore': 'stone_pickaxe',
  'deepslate_copper_ore': 'stone_pickaxe',
  'iron_ore': 'stone_pickaxe',
  'deepslate_iron_ore': 'stone_pickaxe',
  'lapis_ore': 'stone_pickaxe',
  'deepslate_lapis_ore': 'stone_pickaxe',
  'gold_ore': 'iron_pickaxe',
  'deepslate_gold_ore': 'iron_pickaxe',
  'redstone_ore': 'iron_pickaxe',
  'deepslate_redstone_ore': 'iron_pickaxe',
  'diamond_ore': 'iron_pickaxe',
  'deepslate_diamond_ore': 'iron_pickaxe',
  'emerald_ore': 'iron_pickaxe',
  'deepslate_emerald_ore': 'iron_pickaxe',
  'nether_quartz_ore': 'wooden_pickaxe',
  'nether_gold_ore': 'wooden_pickaxe',
  'ancient_debris': 'diamond_pickaxe'
}

// Pickaxe tiers for comparison
const pickaxeTiers = {
  'wooden_pickaxe': 1,
  'stone_pickaxe': 2,
  'iron_pickaxe': 3,
  'diamond_pickaxe': 4,
  'netherite_pickaxe': 5
}

function hasRequiredTool(bot, blockName) {
  const requiredPickaxe = minPickaxeRequired[blockName];
  if (!requiredPickaxe) return false;
  const requiredTier = pickaxeTiers[requiredPickaxe];
  const inventory = bot.inventory.items();
  for (const item of inventory) {
    if (item.name.endsWith('_pickaxe')) {
      const tier = pickaxeTiers[item.name];
      if (tier && tier >= requiredTier) {
        return true;
      }
    }
  }
  return false;
}

async function mineBlocks(bot, blockName, amount, task) {
  const blockId = bot.registry.blocksByName[blockName].id;
  let mined = 0;
  while (mined < amount && !task.isStopped) {
    const block = bot.findBlock({
      matching: [blockId],
      maxDistance: 128
    });
    if (!block) {
      bot.chat(`I can't find any more ${blockName} nearby.`);
      return;
    }
    try {
      await bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 1));
      if (task.isStopped) {
        bot.chat("Mining task stopped.");
        return;
      }
      await bot.dig(block);
      mined++;
      if (bot.inventory.emptySlotCount() === 0) {
        bot.chat("My inventory is full. Stopping mining.");
        return;
      }
    } catch (err) {
      console.log(`Error mining block: ${err.message}`);
    }
  }
  if (!task.isStopped) {
    bot.chat(`Finished mining ${mined} ${blockName}.`);
  }
}

function moveToPlayer(bot, playerName) {
  return new Promise((resolve, reject) => {
    const player = bot.players[playerName]
    if (!player || !player.entity) {
      bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`)
      return reject(new Error(`Player ${playerName} not found or not visible`))
    }

    const target = player.entity.position
    bot.chat(`Coming ${playerName}...`)

    const timeout = setTimeout(() => {
      bot.pathfinder.setGoal(null)
      bot.chat("I couldn't reach you in time. Try again when I'm closer.")
      reject(new Error("Movement timeout"))
    }, 60000)

    const goal = new goals.GoalNear(target.x, target.y, target.z, 1)
    const defaultMove = new Movements(bot)
    bot.pathfinder.setMovements(defaultMove)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', () => {
      clearTimeout(timeout)
      bot.chat(`I'm here ${playerName}!`)
      resolve()
    })

    bot.once('path_update', (results) => {
      if (results.status === 'noPath') {
        clearTimeout(timeout)
        bot.chat(`I can't find a path to you. Please make sure I can reach your position.`)
        reject(new Error("No path available"))
      }
    })
  })
}

function followPlayer(bot, playerName) {
  return new Promise((resolve, reject) => {
    const player = bot.players[playerName]
    if (!player || !player.entity) {
      bot.chat(`I can't see ${playerName}. Make sure you're visible to me.`)
      return reject(new Error(`Player ${playerName} not found or not visible`))
    }

    bot.chat(`Following ${playerName}...`)
    const mcData = require('minecraft-data')(bot.version)
    const movements = new Movements(bot, mcData)
    const goal = new goals.GoalFollow(player.entity, 2)

    bot.pathfinder.setMovements(movements)
    bot.pathfinder.setGoal(goal, true)
  })
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
    currentTask.isStopped = true;
    bot.pathfinder.setGoal(null);
    taskQueue.clearCurrentTask();
    if (currentTask.command === 'follow') {
      bot.chat(`Stopped following ${currentTask.username} as per ${requestingUser}'s request.`);
    } else if (currentTask.command === 'come') {
      bot.chat(`Stopped moving towards ${currentTask.username} as per ${requestingUser}'s request.`);
    } else if (currentTask.command === 'mine') {
      bot.chat(`Stopped mining as per ${requestingUser}'s request.`);
    } else {
      bot.chat(`Stopped current task as per ${requestingUser}'s request.`);
    }
    resolve();
  });
}

function echoMessage(bot, message) {
  return new Promise((resolve) => {
    if (message.startsWith('/')) {
      bot.chat("Nice try. I can't run commands.")
      return resolve()
    }
    bot.chat(message)
    resolve()
  })
}

function listTasks(bot, taskQueue) {
  return new Promise((resolve) => {
    const tasks = taskQueue.listTasks()
    if (tasks.length === 0) {
      bot.chat("No tasks in queue.")
    } else {
      bot.chat("Current tasks in queue:")
      tasks.forEach(task => bot.chat(task))
    }
    resolve()
  })
}

async function guard(bot, target, task) {
  let guardPos = null;
  let followPlayerName = null;

  // Determine the guard target
  if (typeof target === 'string') {
    followPlayerName = target;
  } else if (target instanceof Vec3) {
    guardPos = target;
  } else {
    throw new Error("Invalid guard target");
  }

  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);

  // Function to move to guard position
  const moveToGuardPos = async () => {
    if (task.isStopped) return;
    try {
      await bot.pathfinder.goto(new goals.GoalNear(guardPos.x, guardPos.y, guardPos.z, 2));
    } catch (err) {
      console.log(`Error moving to guard position: ${err.message}`);
    }
  };

  // Function to check for and attack enemies
  const checkForEnemies = () => {
    if (task.isStopped) return;
    let entity = null;
    if (followPlayerName) {
      // Attack mobs near the bot when guarding a player
      const filter = e => (e.type === 'hostile' || e.type === 'mob') &&
        e.position.distanceTo(bot.entity.position) < 10 &&
        e.displayName !== 'Armor Stand';
      entity = bot.nearestEntity(filter);
    } else if (guardPos) {
      // Only check for mobs if the bot is near the guard position
      if (bot.entity.position.distanceTo(guardPos) < 16) {
        const filter = e => (e.type === 'hostile' || e.type === 'mob') &&
          e.position.distanceTo(bot.entity.position) < 10 &&
          e.displayName !== 'Armor Stand';
        entity = bot.nearestEntity(filter);
      }
    }
    if (entity) {
      bot.pvp.attack(entity);
    } else if (guardPos && bot.entity.position.distanceTo(guardPos) > 2) {
      // Return to guard position if too far and no enemies
      bot.pvp.stop();
      moveToGuardPos();
    }
  };

  // Reset movement after combat
  const onStoppedAttacking = () => {
    if (task.isStopped) return;
    if (followPlayerName) {
      const player = bot.players[followPlayerName];
      if (player && player.entity) {
        const goal = new goals.GoalFollow(player.entity, 2);
        bot.pathfinder.setGoal(goal, true);
      }
    } else if (guardPos) {
      moveToGuardPos();
    }
  };

  // Set up event listeners
  bot.on('physicsTick', checkForEnemies);
  bot.on('stoppedAttacking', onStoppedAttacking);

  // Initialize guarding behavior
  if (followPlayerName) {
    const player = bot.players[followPlayerName];
    if (!player || !player.entity) {
      bot.chat(`I can't see ${followPlayerName}.`);
      task.isStopped = true;
      return;
    }
    bot.chat(`Guarding ${followPlayerName}...`);
    const goal = new goals.GoalFollow(player.entity, 2);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(goal, true);
  } else if (guardPos) {
    bot.chat(`Guarding position ${guardPos.x}, ${guardPos.y}, ${guardPos.z}...`);
    await moveToGuardPos();
    if (task.isStopped) return;
  }

  // Main loop to keep task running until stopped
  while (!task.isStopped) {
    if (followPlayerName && (!bot.players[followPlayerName] || !bot.players[followPlayerName].entity)) {
      bot.chat(`I can't see ${followPlayerName} anymore. Stopping guard.`);
      task.isStopped = true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Cleanup when stopped
  bot.pathfinder.setGoal(null);
  bot.pvp.stop();
  bot.removeListener('physicsTick', checkForEnemies);
  bot.removeListener('stoppedAttacking', onStoppedAttacking);
  bot.chat("Stopped guarding.");
}

module.exports = {
  moveToPlayer,
  followPlayer,
  stopCurrentTask,
  echoMessage,
  listTasks,
  mineBlocks,
  hasRequiredTool,
  guard
}