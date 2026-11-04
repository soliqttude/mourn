# Bleed 306 server-command parity audit

- **Reference:** user-provided Bleed command list, 306 `arguments` entries.
- **Repository:** `soliqttude/mourn`
- **Branch:** `feature/bleed-306-moderation-commands`
- **Audited source revision:** `b15c75c861805cd9fea894ce720be19ff61ce531` (source implementation; this audit correction is committed separately).
- **Method:** static inspection of each mapped command source, its registered command name/aliases, dispatcher branches, options and usage. GitHub Actions build passed on `b15c75c861805cd9fea894ce720be19ff61ce531`. Discord runtime tests and test-database migration validation have not been performed. The webhook lock/unlock implementation revokes the old webhook by deleting it, then creates a replacement on unlock. Migration `drizzle/0002_managed_webhook_locks.sql` now adds the persistent `locked` column; apply it before deploying this branch. Booster-role share listing is scoped to the caller's own booster role. `autoresponder list tickets` lists autoresponders whose exclusive channel is a recorded ticket channel.

## Result

| Status | Entries |
|---|---:|
| Implemented in source (not runtime-verified) | 287 |
| Partial / invocation or behavior caveat | 18 |
| Missing | 0 |
| Unsupported safely | 1 |
| **Total** | **306** |

## Resolved settings

| Source entry | Finding |
|---|---|
| `settings premiumrole` | Implemented as a persisted server-subscription role setting, including reset and config display. Discord itself assigns subscription members to the selected role; Villain records the role for its own features. |
| `settings googlesafetylevel` | Persisted yes/no setting; the `google` search command applies Google SafeSearch (`safe=active` or `safe=off`) according to the server setting. |
| `settings disablecustomfms` | Persisted yes/no setting; disables the server's Last.fm Now Playing command (`np` / `fm`) while leaving the music-player `nowplaying` command available. |


## Unsupported safely

| Source entry | Finding |
|---|---|
| `settings resetcases` | The command deliberately returns an error explaining that no jail-case record store exists. It does not delete warning records or other unrelated data. |

## Partial

| Source entry | Finding |
|---|---|
| `settings muted` | Stores a mute-role setting, but the current `mute` path uses Discord timeouts rather than that role. |
| `filter` | The bare root invocation has no distinct configured action; subcommands are implemented separately. |
| `alias` | Bare root invocation does not perform an action; the add/remove/list/view/reset/removeall subcommands exist. |
| `stickymessage` | Bare root invocation does not perform an action; child subcommands exist. |
| `welcome` | Bare root invocation does not perform an action; child subcommands exist. |
| `goodbye` | Bare root invocation does not perform an action; child subcommands exist. |
| `imgonly` | Bare root invocation does not perform an action; child subcommands exist. |
| `invoke` | Bare root invocation does not perform an action; child actions and supported moderation command types exist. |
| `autoresponder` | Bare root invocation does not perform an action; child subcommands exist. |
| `pagination` | Bare root invocation does not perform an action; child subcommands exist. |
| `pins` | Bare root invocation does not perform an action; child subcommands exist. |
| `webhook` | Bare root invocation does not perform an action; create/send/edit/delete/list/info/lock/unlock are present. |
| `boosts` | Bare root invocation does not perform an action; child subcommands exist. |
| `badge` | Bare root invocation does not perform an action; child subcommands exist. |
| `honeypot` | Bare root invocation does not perform an action; child subcommands exist. |
| `reposter` | Bare root invocation does not perform an action; child subcommands exist. |
| `fakepermissions` | Bare root invocation does not perform an action; child subcommands exist. |
| `customize` | Bare root invocation does not perform an action; avatar/banner/bio/reset subcommands exist. |

## Per-root coverage

Counts below are source entries, not unique Discord slash commands. “Implemented” means a matching code path was found; it is not a runtime pass.

| Root | Total | Implemented | Partial | Missing | Unsupported |
|---|---:|---:|---:|---:|---:|
| prefix | 4 | 4 | 0 | 0 | 0 |
| boosterrole | 22 | 22 | 0 | 0 | 0 |
| settings | 22 | 20 | 1 | 0 | 1 |
| boosts | 6 | 5 | 1 | 0 | 0 |
| alias | 7 | 6 | 1 | 0 | 0 |
| stickymessage | 5 | 4 | 1 | 0 | 0 |
| welcome | 6 | 5 | 1 | 0 | 0 |
| goodbye | 6 | 5 | 1 | 0 | 0 |
| imgonly | 4 | 3 | 1 | 0 | 0 |
| invoke | 76 | 75 | 1 | 0 | 0 |
| filter | 36 | 35 | 1 | 0 | 0 |
| autoresponder | 15 | 14 | 1 | 0 | 0 |
| pagination | 9 | 8 | 1 | 0 | 0 |
| enablecommand | 2 | 2 | 0 | 0 | 0 |
| copydisabled | 1 | 1 | 0 | 0 | 0 |
| disablecommand | 3 | 3 | 0 | 0 | 0 |
| enableevent | 2 | 2 | 0 | 0 | 0 |
| disableevent | 3 | 3 | 0 | 0 | 0 |
| enablemodule | 2 | 2 | 0 | 0 | 0 |
| disablemodule | 3 | 3 | 0 | 0 | 0 |
| ignore | 4 | 4 | 0 | 0 | 0 |
| seticon | 1 | 1 | 0 | 0 | 0 |
| setsplashbackground | 1 | 1 | 0 | 0 | 0 |
| setbanner | 1 | 1 | 0 | 0 | 0 |
| unpin | 1 | 1 | 0 | 0 | 0 |
| pin | 1 | 1 | 0 | 0 | 0 |
| firstmessage | 1 | 1 | 0 | 0 | 0 |
| pins | 7 | 6 | 1 | 0 | 0 |
| webhook | 8 | 7 | 1 | 0 | 0 |
| fakepermissions | 5 | 4 | 1 | 0 | 0 |
| extractstickers | 1 | 1 | 0 | 0 | 0 |
| extractemotes | 1 | 1 | 0 | 0 | 0 |
| reposter | 6 | 5 | 1 | 0 | 0 |
| suggest | 17 | 17 | 0 | 0 | 0 |
| customize | 4 | 3 | 1 | 0 | 0 |
| badge | 9 | 8 | 1 | 0 | 0 |
| honeypot | 4 | 3 | 1 | 0 | 0 |

## Scope and limitations

1. This audit uses the 306 entries in the supplied reference. It does not infer undocumented Bleed behavior.
2. “Implemented” is source-level evidence only. Command registration, permission correctness, prefix/slash parity, persistence, migrations, and Discord API behavior still require build and runtime tests.
3. Parent/root rows marked partial are distinguished from their separately audited child actions.
4. Google SafeSearch is applied by the Google search command, and the custom-FM toggle gates the Last.fm `np`/`fm` command. The `reset` action clears both settings and the premium role. This interpretation maps Bleed's “custom Now Playing commands” wording to Villain's Last.fm `np`/`fm` command; the separate music-player `nowplaying` command remains available. GitHub Actions build passed on the latest source implementation commit. Discord runtime and test-database migration validation remain outstanding and should be completed before deployment.
