# Bleed 306-command parity audit

- **Reference:** user-provided Bleed command list, 306 `arguments` entries.
- **Repository:** `soliqttude/mourn`
- **Branch:** `feature/bleed-306-moderation-commands`
- **Audited HEAD:** `3eab3e064d3091517a7cefd5c2357255e741ffb7`
- **Method:** static inspection of each mapped command source, its registered command name/aliases, dispatcher branches, options and usage. No TypeScript build or Discord runtime test was performed.

## Result

| Status | Entries |
|---|---:|
| Implemented in source (not runtime-verified) | 276 |
| Partial / invocation or behavior caveat | 20 |
| Missing | 9 |
| Unsupported safely | 1 |
| **Total** | **306** |

## Missing

| Source entry | Finding |
|---|---|
| `boosterrole dominant` | No action to extract and apply the dominant color from a member avatar. |
| `settings premiumrole` | No premium-role setting or supporting feature. |
| `settings googlesafetylevel` | No Google Safe Browsing level setting or integration. |
| `settings disablecustomfms` | No matching custom-FM disable setting or feature. |
| `autoresponder list tickets` | No `list tickets` branch. |
| `webhook edit` | No edit action in the utility webhook dispatcher. |
| `webhook lock` | No lock action in the utility webhook dispatcher. |
| `webhook unlock` | No unlock action in the utility webhook dispatcher. |
| `extractemotes` | The mapped file registers `extractemojis`; its aliases do not include `extractemotes`. |

## Unsupported safely

| Source entry | Finding |
|---|---|
| `settings resetcases` | The command deliberately returns an error explaining that no jail-case record store exists. It does not delete warning records or other unrelated data. |

## Partial

| Source entry | Finding |
|---|---|
| `boosterrole share list` | The list action exists, but returns server-wide share rows rather than only members sharing the caller's booster role. |
| `settings muted` | Stores a mute-role setting, but the current `mute` path uses Discord timeouts rather than that role. |
| `filter` | The bare root invocation has no distinct configured action; subcommands are implemented separately. |
| `filter regex` | Validates and stores regex patterns; event-time enforcement was not verified in the filter implementation. |
| `alias` | Bare root invocation does not perform an action; the add/remove/list/view/reset/removeall subcommands exist. |
| `stickymessage` | Bare root invocation does not perform an action; child subcommands exist. |
| `welcome` | Bare root invocation does not perform an action; child subcommands exist. |
| `goodbye` | Bare root invocation does not perform an action; child subcommands exist. |
| `imgonly` | Bare root invocation does not perform an action; child subcommands exist. |
| `invoke` | Bare root invocation does not perform an action; child actions and supported moderation command types exist. |
| `autoresponder` | Bare root invocation does not perform an action; child subcommands exist. |
| `pagination` | Bare root invocation does not perform an action; child subcommands exist. |
| `pins` | Bare root invocation does not perform an action; child subcommands exist. |
| `webhook` | Bare root invocation does not perform an action; create/send/delete/list/info are present, but edit/lock/unlock are missing. |
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
| boosterrole | 22 | 20 | 1 | 1 | 0 |
| settings | 22 | 17 | 1 | 3 | 1 |
| boosts | 6 | 5 | 1 | 0 | 0 |
| alias | 7 | 6 | 1 | 0 | 0 |
| stickymessage | 5 | 4 | 1 | 0 | 0 |
| welcome | 6 | 5 | 1 | 0 | 0 |
| goodbye | 6 | 5 | 1 | 0 | 0 |
| imgonly | 4 | 3 | 1 | 0 | 0 |
| invoke | 76 | 75 | 1 | 0 | 0 |
| filter | 36 | 34 | 2 | 0 | 0 |
| autoresponder | 15 | 13 | 1 | 1 | 0 |
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
| webhook | 8 | 4 | 1 | 3 | 0 |
| fakepermissions | 5 | 4 | 1 | 0 | 0 |
| extractstickers | 1 | 1 | 0 | 0 | 0 |
| extractemotes | 1 | 0 | 0 | 1 | 0 |
| reposter | 6 | 5 | 1 | 0 | 0 |
| suggest | 17 | 17 | 0 | 0 | 0 |
| customize | 4 | 3 | 1 | 0 | 0 |
| badge | 9 | 8 | 1 | 0 | 0 |
| honeypot | 4 | 3 | 1 | 0 | 0 |

## Scope and limitations

1. This audit uses the 306 entries in the supplied reference. It does not infer undocumented Bleed behavior.
2. “Implemented” is source-level evidence only. Command registration, permission correctness, prefix/slash parity, persistence, migrations, and Discord API behavior still require build and runtime tests.
3. Parent/root rows marked partial are distinguished from their separately audited child actions.
4. The next implementation pass should close the nine missing entries and resolve the partial behavior caveats, then run typecheck/build and Discord runtime tests. Do not merge to `main` based on this audit alone.
