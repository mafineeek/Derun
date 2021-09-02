Usage example:
```ts
import { Client, SlashCommandType, CommandInteraction } from 'derun'

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
                type: SlashCommandType.STRING,
                required: true
            }
        ],
        extended: {
            safe: false
        },
        run: (interaction, shardId) => {
            if (!interaction.extended['safe']) {
                const task = interaction.options['input']
                const result = eval(task) // Of course you should never use eval() in such way, that's just an example!

                return await interaction.sendReply(`💡 Result = ${result}`)
            }
            else {
                await interaction.defer() // Send "Bot is thinking...". Interaction needs to be "acknowledged" within 3s so you need to reply or defer as quickly as possible.

                // After 5s reply with message.
                setTimeout(() => interaction.sendFollowUp('❌ Failed to calculate because safe mode is active.'), 5000)
            }
        }
    })

    client.updateCommands('853386288710156320') // Promise, update only on single guild
})

client.on('interaction', (interaction, shardId) => {
    if (interaction instanceof CommandInteraction) interaction.command.run(interaction, shardId)
})


console.info('[Init] Connecting...')
client.connect()
```

Experimental documentation: https://amatsagu.github.io/derun

**v0.1** - Early beta *(to not say alpha)*