import {
  ThreadAutoArchiveDuration,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  type TextChannel,
  type AnyThreadChannel,
} from "discord.js";
import type { HybridCommand } from "../../lib/command.js";
import { errorEmbed } from "../../lib/embeds.js";

const COLOR = 0x2b2d31;
const MOURN_INVITE = "https://discord.com/oauth2/authorize?client_id=1499466116768993461";
const SUPPORT = "https://discord.gg/CdUtYSFC3U";

interface ThreadDef {
  name: string;
  display?: string;
  section: string;
  content: string;
}

const THREADS: ThreadDef[] = [
  // ── Important Information ────────────────────────────────────────────────────
  {
    name: "Initial Setup",
    display: "Initial Setup (First Time Use)",
    section: "Important Information",
    content: [
      "**Initial Commands**",
      "The **first commands** you want to run are `,setjailrole` & `,setupmute`.",
      "",
      "`,setjailrole @role` — Sets the role given to jailed members.",
      "`,setupmute` — Creates three mute roles: **imute**, **mute** and **rmute**.",
      "",
      "**Setting your prefix**",
      "The server prefix is set to `,` by default.",
      "Use `,prefix set (symbol)` to change it for your server.",
      "",
      "**Need help?**",
      `Join the support server: ${SUPPORT}`,
    ].join("\n"),
  },
  {
    name: "Common Errors & Questions",
    section: "Important Information",
    content: [
      "**Booster Role Troubleshooting**",
      "Ensure the base role is at least **two roles above** the Discord default boost role.",
      "∙ Use `,settings baserole @role` to set this if not done.",
      "",
      "**Levelling System**",
      "A common issue with the levelling system is not running `,levelstoggle`.",
      "∙ This is needed for mourn to start caching levels and awarding XP.",
      "",
      "**Starboard / Clownboard**",
      "A common issue is not running `,starboard unlock` / `,clownboard unlock`.",
      "∙ This is needed for mourn to start monitoring messages and counting reactions.",
      "",
      "**Lock and Mute fixes**",
      "If your mutes or jails are not working, this will be a permission issue.",
      "Ensure that **Send Messages** is enabled within the role and **neutral** within the channel & category perms.",
      "",
      "**Still having issues?**",
      `Let us know in the support server: ${SUPPORT}`,
    ].join("\n"),
  },

  // ── Security Setup ───────────────────────────────────────────────────────────
  {
    name: "Antinuke",
    section: "Security Setup",
    content: [
      "**Why use an antinuke system?**",
      "The antinuke will set a limit on the number of actions a moderator can perform in a certain timeframe. If the limit is exceeded, the moderator is punished and a message is sent to the owner.",
      "",
      "**Parameters**",
      "`--do <punishment>` — punishment applied to the moderator.",
      "`--threshold <number>` — number of actions before punishment (recommended: 1–6).",
      "`--command on|off` — whether mourn commands count toward the threshold.",
      "",
      "**Antinuke Modules**",
      "permissions, channel, role, emoji, ban, kick, webhook, botadd",
      "",
      "**Punishments**",
      "kick, ban, jail, stripstaff",
      "∙ `stripstaff` removes dangerous-permission roles from whoever triggers the antinuke.",
      "∙ Set staff roles first using `,settings staff @role`",
      "",
      "**Recommended Config**",
      "```",
      ",an permissions grant mention_everyone --do ban",
      ",an permissions grant manage_guild --do ban",
      ",an permissions grant manage_webhooks --do ban",
      ",an permissions grant manage_channels --do ban",
      ",an permissions grant administrator --do ban",
      ",an permissions remove administrator --do stripstaff",
      ",an permissions grant ban_members --do ban",
      ",an channel on --do ban --threshold 1",
      ",an role on --do stripstaff --command on --threshold 2",
      ",an emoji on --do kick --threshold 1",
      ",an ban on --do stripstaff",
      "```",
      "",
      "**Whitelisting a user**",
      "`,an whitelist @user` — whitelisted users are ignored by antinuke. Only whitelist trusted staff.",
      "",
      "**Making a user antinuke admin**",
      "`,an admin @user` — antinuke admins can change or disable your config.",
      "",
      `**Still having issues?** ${SUPPORT}`,
    ].join("\n"),
  },
  {
    name: "Antiraid",
    section: "Security Setup",
    content: [
      "**Antiraid Configurables**",
      "",
      "**Mass Joins**",
      "`,antiraid massjoin on|off [--threshold N] [--do action] [--lock true|false] [--punish true|false]`",
      "",
      "**Requiring an Avatar**",
      "`,antiraid avatar on|off [--do action]`",
      "",
      "**Minimum Account Age**",
      "`,antiraid age on|off [--threshold N] [--do action]`",
      "∙ Threshold is the number of days for an account to be considered old enough to join.",
      "",
      "**Exempting Accounts**",
      "`,antiraid whitelist @user`",
      "∙ Use `,antiraid whitelist view` to see all whitelisted accounts.",
      "",
      "Run `,antiraid config` to get a summary of your config.",
      "",
      "**Post-Raid Cleanup**",
      "Remove all accounts that joined during a raid:",
      "`,recentban <amount> [reason]`",
      "`,raid <duration> kick|ban [reason]`",
      "",
      "**Disabling Raid State**",
      "After the raid is over, re-enable events and unlock channels:",
      "`,antiraid state`",
      "",
      `**Still having issues?** ${SUPPORT}`,
    ].join("\n"),
  },
  {
    name: "Enabling & Disabling",
    display: "Enabling/Disabling (Commands/Events/Modules)",
    section: "Security Setup",
    content: [
      "**Commands**",
      "To disable any command from being used in a channel or by a member:",
      "`,dcmd #channel <command>`",
      "`,dcmd @user <command>`",
      "",
      "**Modules**",
      "To disable a module from being used in a channel:",
      "`,dm #channel <module>`",
      "∙ Example: Disabling the Last.fm module from a channel — `,np` and any Last.fm command will not work.",
      "",
      "To enable commands or modules, simply use:",
      "`,ecmd` or `,em`",
      "",
      "**Events**",
      "```",
      "Event           | Description",
      "y/n             | Reacts with ⬆️ and ⬇️",
      "v/s             | Reacts with ◀️ and ▶️",
      "afk             | Autoresponse when pinging an AFK user",
      "reactiontrigger | Reaction triggers occurring",
      "autoresponder   | Autoresponder messages occurring",
      "commandfailure  | Autoresponse when a command fails",
      "snipe           | Previous deleted message content",
      "```",
      "Use `,ee <event>` to enable and `,de <event>` to disable.",
    ].join("\n"),
  },
  {
    name: "Fake Permissions",
    section: "Security Setup",
    content: [
      "**How do fake permissions work?**",
      "When a moderator is given a fake permission such as `ban_members`, they will be able to use `,ban` with mourn, but they won't be able to use the native Discord ban feature.",
      "",
      "**Getting command permissions**",
      "You can locate the required permissions for a command with `,help <command>`.",
      "",
      "**Recommended Config**",
      "",
      "Co-Owner:",
      "`,fp grant @co-owner administrator`",
      "",
      "Administrators:",
      "```",
      ",fp grant @admin manage_messages",
      ",fp grant @admin moderate_members",
      ",fp grant @admin manage_nicknames",
      ",fp grant @admin manage_roles",
      ",fp grant @admin ban_members",
      ",fp grant @admin kick_members",
      "```",
      "",
      "Moderators:",
      "```",
      ",fp grant @mod manage_messages",
      ",fp grant @mod moderate_members",
      ",fp grant @mod manage_nicknames",
      ",fp grant @mod kick_members",
      "```",
      "",
      "Chat Moderators:",
      "`,fp grant @chatmod manage_messages`",
      "",
      "This is just a recommendation and not required!",
      "",
      `**Still having issues?** ${SUPPORT}`,
    ].join("\n"),
  },
  {
    name: "Word Filter",
    section: "Security Setup",
    content: [
      "**Filter Setup**",
      "mourn uses Discord's built-in AutoMod system along with its own word filter.",
      "",
      "**Adding words to the filter**",
      "`,wordfilter add <word>` — adds a word to the filter.",
      "`,wordfilter remove <word>` — removes a word from the filter.",
      "`,wordfilter list` — lists all filtered words.",
      "`,wordfilter reset` — clears all filtered words.",
      "",
      "**AutoMod modules**",
      "Use `,automod` to configure Discord's built-in AutoMod rules.",
      "",
      "**Filter types**",
      "caps, spam, spoilers, massmention, emoji, invites, links",
      "",
      `**Still having issues?** ${SUPPORT}`,
    ].join("\n"),
  },

  // ── Server Setup ─────────────────────────────────────────────────────────────
  {
    name: "Autoresponders",
    section: "Server Setup",
    content: [
      "**Creating an autoresponder**",
      "`,autoresponder add <trigger>, <response>`",
      "∙ The trigger and response must be separated by a comma.",
      "∙ The response can be raw text or an embed with dynamic variables.",
      "",
      "**Removing an autoresponder**",
      "`,autoresponder remove <trigger>`",
      "",
      "**Available Flags**",
      "`--not_strict` — searches for the trigger anywhere in the message.",
      "`--self_destruct` — deletes the response after 6–60 seconds.",
      "`--delete` — deletes the trigger message after responding.",
      "`--reply` — replies directly to the trigger message.",
      "`--ignore_command_check` — triggers even if it matches an existing command.",
      "",
      "**Restricting autoresponders**",
      "`,autoresponder exclusive #channel|@role` — restrict to a channel or role.",
      "",
      "**More commands**",
      "`,autoresponder update <trigger>, <new response>` — update an existing responder.",
      "`,autoresponder reset` — remove all autoresponders.",
      "`,autoresponder list` — view all autoresponders.",
      "",
      "**Autoresponder roles**",
      "`,ar role` — assign or remove roles when a member says a specific message.",
    ].join("\n"),
  },
  {
    name: "Booster Roles",
    section: "Server Setup",
    content: [
      "**Initial Command**",
      "Before anything, run `,settings baserole @role`.",
      "∙ This role must be at least **two roles above** Discord's default booster role.",
      "",
      "**Booster role commands**",
      "`,br create <#hex>` — create your booster role.",
      "`,br rename <name>` — rename your booster role.",
      "`,br icon <emoji/url>` — change the booster role icon.",
      "`,br remove` — remove your booster role.",
      "",
      "**Rewarding boosters with a role**",
      "`,br award @role` — automatically give a role when someone boosts.",
      "`,br award view` — view the currently awarded role.",
      "`,br award remove` — remove the award role.",
      "",
      "**More commands**",
      "`,boosterrole list` — view all booster roles.",
      "`,boosterrole cleanup` — clean up roles that weren't removed properly.",
    ].join("\n"),
  },
  {
    name: "Boost Messages",
    section: "Server Setup",
    content: [
      "**Adding a boost message**",
      "`,setboost add #channel <text or embed code>`",
      "",
      "**Removing a boost message**",
      "`,setboost remove #channel`",
      "",
      "**Testing your boost message**",
      "`,setboost view #channel`",
      "",
      "**Listing boost messages**",
      "`,setboost list`",
    ].join("\n"),
  },
  {
    name: "Counters",
    section: "Server Setup",
    content: [
      "**Counter types available**",
      "`members`, `users_only`, `bots_only`, `pending_members`, `all_channels`, `text_channels`, `voice_channels`, `categories`, `boosts`, `booster_count`",
      "",
      "**Channel types**",
      "voice (recommended), text, category, announce, stage",
      "",
      "**Adding a counter**",
      "`,counter add <counter type> <channel type>`",
      "∙ Example: `,counter add members voice`",
      "∙ To edit the counter name, just rename the channel — but don't change the numbers at the end.",
      "",
      "**Removing a counter**",
      "`,counter remove <channel ID>`",
    ].join("\n"),
  },
  {
    name: "Embed Creation",
    section: "Server Setup",
    content: [
      "**Creating embeds**",
      "`,embed create` — launches an interactive button-based embed builder.",
      "`,createembed <embed code>` — create an embed from raw embed code.",
      "",
      "**Embed scripting**",
      "mourn supports a full embed scripting language with dynamic variables.",
      "Use the button builder (`,embed create`) to get started without needing to learn the syntax.",
      "",
      "**Sending an embed as mourn**",
      "`,embed send #channel <embed code>`",
      "",
      "**Editing an existing embed**",
      "`,embed edit <message link> <new embed code>`",
    ].join("\n"),
  },
  {
    name: "Levels",
    section: "Server Setup",
    content: [
      "**Initial Command**",
      "Run `,levelstoggle` to enable the levelling system.",
      "∙ This is required for mourn to start caching levels and awarding XP.",
      "",
      "**Setting the level-up message channel**",
      "`,setlevelchannel #channel` — set where level-up messages are sent.",
      "Options for the channel: `pm`, `context`, `#channel`, `none`",
      "",
      "**Changing a member's level**",
      "`,setlevel @member <level>` — set a member to a specific level.",
      "`,setxp @member <amount>` — set a member's XP to a specific amount.",
      "",
      "**XP Multiplier**",
      "`,levels setrate <multiplier>` — increase or decrease XP members receive.",
      "",
      "**Viewing levels**",
      "`,rank [@member]` — view a user's level and XP.",
      "`,leaderboard` — view the server leaderboard.",
      "",
      "**Level rewards**",
      "`,rewards` — view all level rewards and the XP needed to receive them.",
      "`,addreward <level> @role` — add a role reward for reaching a level.",
      "`,removereward <level>` — remove a level reward.",
    ].join("\n"),
  },
  {
    name: "Lock Ignore",
    section: "Server Setup",
    content: [
      "**Lockdown Issues**",
      "Make sure the **Send Messages** channel permission for **all roles** is set to **neutral**.",
      "Also make sure **Send Messages** is enabled within the role itself.",
      "",
      "**To allow a role to speak during lockdowns:**",
      "Set the **Send Messages** permission to ✅ (enabled) in the role's permissions.",
      "Leave it as **neutral** (—) in the channel & category permissions.",
      "",
      "**Lock commands**",
      "`,lock #channel` — locks a specific channel.",
      "`,unlock #channel` — unlocks a specific channel.",
      "`,lockdown` — locks all channels in the server.",
    ].join("\n"),
  },
  {
    name: "Pagination",
    section: "Server Setup",
    content: [
      "**Step 1**",
      "Create page 1 of your pagination embed using `,createembed <embed code>`.",
      "",
      "**Step 2**",
      "Copy the **message link** of the embed from Step 1, then run:",
      "`,pagination set <message link>`",
      "∙ You should see "Page 1 of 1" in the embed footer.",
      "",
      "**Step 3 — Adding pages**",
      "`,pagination add <first message link> <2nd page embed code>`",
      "",
      "**Editing a page**",
      "Look at the footer — it shows "Page X of X". Note the **underlined** number, then run:",
      "`,pagination update <first message link> <page number> <updated embed code>`",
    ].join("\n"),
  },
  {
    name: "Reaction Roles",
    section: "Server Setup",
    content: [
      "**Step 1**",
      "Send the message you want reaction roles attached to in the channel of your choice.",
      "∙ This can be an embed created by mourn.",
      "",
      "**Step 2**",
      "`,rr add <message link> <emoji> @role`",
      "",
      "**Removing a reaction role**",
      "∙ Run `,rr list` to find the message link.",
      "∙ Run `,rr remove <message link> <emoji>`",
      "∙ To remove all reactions from a message: `,rr removeall <message link>`",
      "∙ To remove every reaction role in the server: `,rr clear`",
    ].join("\n"),
  },
  {
    name: "Starboard & Clownboard",
    section: "Server Setup",
    content: [
      "**Initial Command**",
      "`,starboard unlock` is the first command you want to run.",
      "",
      "**Setting the channel**",
      "`,starboard set #channel`",
      "",
      "**Setting the emoji**",
      "`,starboard emoji <emoji>`",
      "",
      "**Setting the threshold**",
      "`,starboard threshold <number of reactions>`",
      "",
      "**Ignoring a channel**",
      "`,starboard ignore #channel`",
      "∙ `,starboard ignore list` — view all ignored channels.",
      "",
      "**Viewing your config**",
      "`,starboard config`",
      "",
      "∙ All commands above also apply to `,clownboard`.",
    ].join("\n"),
  },
  {
    name: "VoiceMaster",
    section: "Server Setup",
    content: [
      "**VoiceMaster** gives your server a clean voice channel system — channels are only created when needed and deleted when empty.",
      "",
      "**Initial Setup**",
      "`,voicemaster setup` — creates the VoiceMaster hub and interface.",
      "",
      "**Configurable commands**",
      "`,vm bitrate <bitrate>` — change the default voice channel bitrate.",
      "`,vm join role @role` — set a role given to anyone who creates or joins a voice channel.",
      "`,vm default name <name>` — set default name for new voice channels.",
      "`,vm default region <region>` — set default region for new voice channels.",
      "`,vm sendinterface` — re-sends the interface panel.",
      "`,vm category` — redirect voice channels to a custom category.",
      "",
      "**Interface buttons**",
      "🔒 Lock · 🔓 Unlock · 👻 Ghost · 👁 Reveal · 👑 Claim",
      "❌ Disconnect · 🎮 Activity · ℹ️ Info · ➕ Increase limit · ➖ Decrease limit",
    ].join("\n"),
  },
  {
    name: "Vanity Roles",
    section: "Server Setup",
    content: [
      "**Vanity role commands**",
      "`,vanity set <vanity>` — set the vanity that will be awarded.",
      "`,vanity role add @role` — set what role to give when the vanity is being used.",
      "`,vanity role remove` — remove the current award role.",
      "`,vanity log #channel` — set the log channel for vanity add/removal.",
      "`,vanity award #channel` — set where mourn says thanks.",
      "`,vanity message <text>` — set the thank you message.",
      "`,vanity role list` — list all award roles.",
      "`,vanity view substring` — show the current vanity mourn is looking for.",
      "`,vanity view message` — show the current thank you message.",
    ].join("\n"),
  },
  {
    name: "Welcome & Goodbye",
    section: "Server Setup",
    content: [
      "**Setting your welcome message**",
      "`,setwelcome add #channel <text or embed code>`",
      "",
      "**Removing your welcome message**",
      "`,setwelcome remove #channel`",
      "",
      "**Testing your welcome message**",
      "`,setwelcome view #channel` (or run it in the channel it's set to).",
      "",
      "∙ The same commands apply for goodbye messages using `,setgoodbye`.",
    ].join("\n"),
  },
  {
    name: "Logging",
    section: "Server Setup",
    content: [
      "**Setting up logging**",
      "`,setlog add #channel <event>` — enable logging for an event in a channel.",
      "",
      "**Removing logs**",
      "`,setlog remove #channel <event>`",
      "",
      "**Ignoring a member or channel**",
      "`,setlog ignore <member or channel>`",
      "`,setlog ignore list` — view all ignored members/channels.",
      "",
      "**Customising embed color**",
      "`,setlog color <channel> <event> <color>`",
      "`,setlog color list <channel>` — list embed color customisation for a channel.",
      "",
      "**Available logging events**",
      "`messages`, `members`, `roles`, `channels`, `invites`, `emojis`, `voice`",
    ].join("\n"),
  },

  // ── More ─────────────────────────────────────────────────────────────────────
  {
    name: "Giveaways",
    section: "More",
    content: [
      "**Creating a giveaway**",
      "`,gcreate` — start an interactive giveaway setup.",
      "",
      "**Managing giveaways**",
      "`,gend <message ID>` — end a giveaway early.",
      "`,greroll <message ID>` — reroll a giveaway winner.",
      "`,gedit <message ID>` — edit an active giveaway.",
      "`,gcancel <message ID>` — cancel a giveaway.",
      "`,glist` — list all active giveaways.",
    ].join("\n"),
  },
  {
    name: "Tags",
    section: "More",
    content: [
      "**Creating a tag**",
      "`,tag add <name> <content>` — create a new tag.",
      "",
      "**Using a tag**",
      "`,tag <name>` — display a tag.",
      "",
      "**Managing tags**",
      "`,tag edit <name> <new content>` — edit an existing tag.",
      "`,tag delete <name>` — delete a tag.",
      "`,tag list` — view all server tags.",
      "`,tag info <name>` — view info about a specific tag.",
    ].join("\n"),
  },
  {
    name: "Last.fm",
    section: "More",
    content: [
      "**Linking your account**",
      "`,fmset <username>` — link your Last.fm account.",
      "`,fmunset` — unlink your Last.fm account.",
      "",
      "**Now Playing**",
      "`,np` — show your currently playing track.",
      "",
      "**Your stats**",
      "`,topartists` — view your top artists.",
      "`,toptracks` — view your top tracks.",
      "`,topalbums` — view your top albums.",
      "`,fmrecent` — view your recently played tracks.",
      "`,fmprofile` — view your Last.fm profile.",
    ].join("\n"),
  },
];

// ── Group threads by section ───────────────────────────────────────────────────
function groupBySections(threads: ThreadDef[]): Map<string, ThreadDef[]> {
  const map = new Map<string, ThreadDef[]>();
  for (const t of threads) {
    if (!map.has(t.section)) map.set(t.section, []);
    map.get(t.section)!.push(t);
  }
  return map;
}

function buildDirectory(
  sections: Map<string, ThreadDef[]>,
  links: Map<string, string>
): string {
  const lines: string[] = [];
  for (const [section, items] of sections) {
    lines.push(`**${section}**`);
    for (const item of items) {
      const display = item.display ?? item.name;
      const url = links.get(item.name);
      lines.push(url ? `└ [${display}](${url})` : `└ ${display}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export const command: HybridCommand = {
  name: "setupthread",
  aliases: ["setupthreads", "setupdirectory"],
  description: "Post the server setup directory and create a thread for each topic.",
  category: "settings",
  permission: "admin",
  guildOnly: true,
  usage: "setupthread",
  examples: ["setupthread"],
  options: [],

  async execute(ctx) {
    if (!ctx.guild) return;

    const channel = ctx.channel as TextChannel;

    // Must be a text/news channel that supports threads
    if (
      channel.type !== ChannelType.GuildText &&
      channel.type !== ChannelType.GuildAnnouncement
    ) {
      return ctx.reply({
        embeds: [errorEmbed("This command must be run in a text channel.")],
      });
    }

    const me = ctx.guild.members.me;
    if (!me) return;

    const needed = [
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.ManageThreads,
      PermissionFlagsBits.SendMessagesInThreads,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.EmbedLinks,
    ];
    const missing = needed.filter((p) => !channel.permissionsFor(me).has(p));
    if (missing.length) {
      return ctx.reply({
        embeds: [
          errorEmbed(
            "I'm missing permissions: `CreatePublicThreads`, `ManageThreads`, `SendMessagesInThreads`."
          ),
        ],
      });
    }

    // Post placeholder directory message first
    const sections = groupBySections(THREADS);
    const placeholder = buildDirectory(sections, new Map());

    const dirEmbed = new EmbedBuilder()
      .setColor(COLOR)
      .setTitle("🧰 Server Setup Directory")
      .setDescription(placeholder)
      .setFooter({ text: "Creating threads — links will appear shortly…" });

    const dirMsg = await channel.send({ embeds: [dirEmbed] });

    // Create threads and track links
    const links = new Map<string, string>();

    for (const thread of THREADS) {
      try {
        const created: AnyThreadChannel = await channel.threads.create({
          name: thread.display ?? thread.name,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
          type: ChannelType.PublicThread,
          reason: "mourn setup directory",
        });

        const embed = new EmbedBuilder()
          .setColor(COLOR)
          .setTitle(thread.display ?? thread.name)
          .setDescription(thread.content)
          .setFooter({ text: `mourn • ${SUPPORT}` });

        await created.send({ embeds: [embed] });
        links.set(thread.name, `https://discord.com/channels/${ctx.guild.id}/${created.id}`);

        // Small delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 600));
      } catch {
        // continue even if one thread fails
      }
    }

    // Edit directory message with live links
    const updated = buildDirectory(sections, links);
    await dirMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR)
          .setTitle("🧰 Server Setup Directory")
          .setDescription(updated)
          .setFooter({ text: "mourn setup directory" }),
      ],
    });

    // Ack silently if prefix command
    if (ctx.isPrefix) {
      try {
        await ctx.message?.react("✅");
      } catch {
        /* ignore */
      }
    }
  },
};
