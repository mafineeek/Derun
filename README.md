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

client.once('ready', async () => {
    console.info(`[Ready] Successfully connected as ${client.user.tag}`)

    client.addCommand({
        name: 'calc',
        description: 'Calculates simple math tasks.',
        type: 1,
        options: [
            {
                name: 'input',
                description: 'Put there whatever you want to process.',
                type: SlashCommandType.STRING
            }
        ],
        extended: {
            adminOnly: false
        },
        run: (interaction, shardId) => {}
    })

    client.updateCommands('853386288710156320') // Promise
})

client.on('interaction', (interaction, shardId) => {
    if (interaction.command) console.log(interaction)
})


console.info('[Init] Connecting...')
client.connect()
```