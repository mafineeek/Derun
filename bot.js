const { Client } = require('./lib')

const shards = 1
const client = new Client('BOT TOKEN', {shardCount: shards})

client.on('shardReady', (shardId) => console.info(`[Shard Ready] [Shard #${shardId + 1}] Initializing process finished in ${(((shardId + 1) / client.shards.length) * 100).toFixed(1)}%`))
client.on('shardResumed', (shardId) => console.info(`[Shard Resumed] [Shard #${shardId + 1}]`))
client.on('shardWarn', (shardId, reason) => console.info(`[Shard Warn] [Shard #${shardId + 1}]`, reason))
client.on('shardError', (shardId, reason) => console.info(`[Shard Error] [Shard #${shardId + 1}]`, reason))
client.once('ready', async () => {
    console.info(`[Ready] ===========================================================`)

    await client.createMessage('853947881429663765', {}) // Expect error
})

// Add code of conduct
// - use throw over Promise.reject()
// - save all custom made interfaces & data types in Typings folder, in prepared file
// - etc.

console.info('[Init] Starting...')
client.connect()