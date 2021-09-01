import { SlashCommandType } from '../constants'
import { CommandInteraction } from '../Structures/CommandInteraction'

export interface SlashCommandOptions {
    type: SlashCommandType
    name: string
    description: string
    required?: boolean
    choices?: SlashCommandChoices[]
    options?: SlashCommandOptions[]
}

export interface SlashCommandChoices {
    name: string
    value: string | number
}

export interface SlashCommandBase {
    name: string
    description: string
    options?: SlashCommandOptions[]
    default_permission?: boolean
    type?: SlashCommandType
}

export interface SlashCommand extends SlashCommandBase {
    extended: { [key: string]: any }
    run: (interaction: CommandInteraction, shardId: number) => Promise<any>
}
