// tasks.js
class TaskQueue {
    constructor() {
      this.queue = [];
      this.isProcessing = false;
    }
  
    // Add a task to the queue
    addTask(task) {
      this.queue.push(task);
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processNextTask();
      }
    }
  
    // Process the next task in the queue
    async processNextTask() {
      if (this.queue.length === 0) {
        this.isProcessing = false;
        return;
      }
  
      this.isProcessing = true;
      const task = this.queue[0];
  
      try {
        await task.execute();
      } catch (error) {
        console.log(`Error executing task: ${error.message}`);
      } finally {
        // Remove the completed task
        this.queue.shift();
        // Process the next task
        this.processNextTask();
      }
    }
  
    // Get list of all tasks in queue
    listTasks() {
      return this.queue.map(task => `[${task.username}] sent: ${task.originalCommand}`);
    }
  }
  
  // Task class to standardize tasks
  class Task {
    constructor(bot, username, command, originalCommand, executeFunction) {
      this.bot = bot;
      this.username = username;
      this.command = command;
      this.originalCommand = originalCommand;
      this.execute = executeFunction;
    }
  }
  
  // Export the task system
  module.exports = {
    TaskQueue,
    Task
  };