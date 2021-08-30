Usage example:
```ts
import { Client } from 'derun'

// Showing all the options (+ their default values)
const client = new Client('<BOT TOKEN>', {
    shardCount: 'auto',
    intents: ['GUILDS'],
    connectionTimeout: 30000,
    largeThreshold: 50,
    requestTimeout: 15000,
    requestCleanInterval: 300000, // 5m
    restTimeOffset: 750,
    emitRawPayloads: false
})

client.once('ready', () => console.info('Successfully logged! Bot is ready.'))

client.connect()
```