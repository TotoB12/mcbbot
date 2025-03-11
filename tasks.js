class TaskQueue {
    constructor() {
        this.queue = []
        this.isProcessing = false
        this.onTaskStart = null
        this.onTaskEnd = null
    }

    addTask(task) {
        this.queue.push(task)
        if (!this.isProcessing) {
            this.processNextTask()
        }
    }

    async processNextTask() {
        if (this.queue.length === 0) {
            this.isProcessing = false
            if (this.onTaskEnd) this.onTaskEnd()
            return
        }

        this.isProcessing = true
        const task = this.queue[0]

        if (this.onTaskStart) this.onTaskStart(task)

        try {
            await task.execute()
        } catch (error) {
            console.log(`Error executing task: ${error.message}`)
        } finally {
            this.queue.shift()
            this.processNextTask()
        }
    }

    listTasks() {
        return this.queue.map(task => `[${task.username}] sent: ${task.originalCommand}`)
    }

    clearCurrentTask() {
        if (this.isProcessing && this.queue.length > 0) {
            this.queue.shift()
            this.isProcessing = false
        }
    }
}

class Task {
    constructor(bot, username, command, originalCommand, executeFunction) {
        this.bot = bot
        this.username = username
        this.command = command
        this.originalCommand = originalCommand
        this.executeFunction = executeFunction
        this.isStopped = false // Added stop flag
    }

    async execute() {
        await this.executeFunction(this) // Pass the task instance to the execute function
    }
}

module.exports = {
    TaskQueue,
    Task
}