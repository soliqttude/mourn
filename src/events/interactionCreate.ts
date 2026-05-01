import {
  type Client,
  type Interaction,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  MessageFlags,
} from "discord.js";
import { findCommand } from "../handlers/registry.js";
import { buildSlashContext } from "../lib/contextFactory.js";
import { errorEmbed } from "../lib/embeds.js";
import { logger } from "../lib/logger.js";
import { getGuildSettings } from "../db/settings.js";
import { config } from "../config.js";
import { checkTier, isBotOwner } from "../lib/permissions.js";
import { handlePanelInteraction } from "../panels/router.js";

export const event = {
  name: "interactionCreate",
  async execute(client: Client, interaction: Interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        return handleSlashCommand(client, interaction);
      }
      if (interaction.isButton()) {
        return handleButton(client, interaction);
      }
      if (interaction.isStringSelectMenu()) {
        return handleSelect(client, interaction);
      }
      if (interaction.isModalSubmit()) {
        return handleModal(client, interaction);
      }
    } catch (err) {
      logger.error({ err }, "interactionCreate error");
    }
  },
};

async function handleSlashCommand(
  client: Client,
  interaction: ChatInputCommandInteraction
) {
  const cmd = findCommand(interaction.commandName);
  if (!cmd) return;
  if (cmd.guildOnly !== false && !interaction.guild) {
    return interaction.reply({
      embeds: [errorEmbed("This command must be used in a server.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (cmd.ownerOnly && !isBotOwner(interaction.user.id)) {
    return interaction.reply({
      embeds: [errorEmbed("This command is restricted to the bot owner.")],
      flags: MessageFlags.Ephemeral,
    });
  }
  if (interaction.member && cmd.permission && cmd.permission !== "everyone") {
    if (!checkTier(interaction.member as any, cmd.permission)) {
      return interaction.reply({
        embeds: [errorEmbed("You don't have permission to use this command.")],
        flags: MessageFlags.Ephemeral,
      });
    }
  }
  const settings = interaction.guild
    ? await getGuildSettings(interaction.guild.id)
    : null;
  const prefix = settings?.prefix ?? config.defaultPrefix;
  const ctx = await buildSlashContext(client, interaction, prefix);
  try {
    await cmd.execute(ctx);
  } catch (err) {
    logger.error({ err, cmd: cmd.name }, "Slash command error");
    const payload: any = {
      embeds: [errorEmbed((err as Error).message || "An unexpected error occurred.")],
      flags: MessageFlags.Ephemeral,
    };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {
      /* ignore */
    }
  }
}

async function handleButton(client: Client, interaction: ButtonInteraction) {
  const id = interaction.customId;
  if (id.startsWith("panel:")) return handlePanelInteraction(client, interaction);
  const { handleTicketButton } = await import("../features/tickets.js");
  if (id.startsWith("ticket:")) return handleTicketButton(client, interaction);
  const { handleVMButton } = await import("../features/voicemaster.js");
  if (id.startsWith("vm:")) return handleVMButton(client, interaction);
}

async function handleSelect(
  client: Client,
  interaction: StringSelectMenuInteraction
) {
  if (interaction.customId.startsWith("panel:")) {
    return handlePanelInteraction(client, interaction);
  }
}

async function handleModal(
  client: Client,
  interaction: ModalSubmitInteraction
) {
  if (interaction.customId.startsWith("panel:")) {
    return handlePanelInteraction(client, interaction);
  }
  const { handleTicketModal } = await import("../features/tickets.js");
  if (interaction.customId.startsWith("ticket:")) {
    return handleTicketModal(client, interaction);
  }
}
