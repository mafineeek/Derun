const { ShardManager } = require('./lib')

const shards = 4
const client = new ShardManager('TOKEN', {shardCount: shards})

client.on('shardReady', (shardId) => console.info(`[Shard Ready] [Shard #${shardId + 1}] Initializing process finished in ${(((shardId + 1) / shards) * 100).toFixed(1)}%`))
client.on('shardResumed', (shardId) => console.info(`[Shard Resumed] [Shard #${shardId + 1}]`))
client.on('shardWarn', (shardId, reason) => console.info(`[Shard Warn] [Shard #${shardId + 1}] ${reason}`))
client.on('shardError', (shardId, reason) => console.info(`[Shard Error] [Shard #${shardId + 1}] ${reason}`))
client.once('ready', () => console.info(`[Ready] ===========================================================`))

console.info('[Init] Starting...')
client.spawn()