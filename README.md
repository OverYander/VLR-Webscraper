# vlr-stats-scraper

Scrapes player stats from [vlr.gg](https://www.vlr.gg) and stores them in a local SQLite
database, grouped by tournament or stage, so you can pull a backlog of players.

## Setup

Requires Node.js 18+ and a [Hyperbrowser](https://hyperbrowser.ai) API key for scraping.

```bash
npm install vlr-stats-scraper
```

Create a `.env` file in the directory you run it from:

```
HYPERBROWSER_API_KEY=your_key_here
```

## CLI usage

The package installs a `valstats` command.

| Command | What it does |
| --- | --- |
| `valstats <link> <year> <event-name>` | Scrape every player on an event page and save them under that event |
| `valstats --clear-event <event-name>` | Remove one event and its players |
| `valstats --clear` | Wipe the whole database (asks for confirmation) |

### Scraping an event

```bash
npx valstats <link> <year> <event-name>
```

```bash
npx valstats https://www.vlr.gg/event/2977/vct-2026-americas-stage-2/group-stage 2026 "Stage 2"
```

- `link` — the vlr.gg event/group-stage page to scrape.
- `year` — the year the event took place.
- `event-name` — a label for this tournament/stage (used to group players together later).

What happens:

1. If the event name contains the word **"stage"** (case-insensitive), you're prompted to
   enter a region (e.g. `AMER`, `EMEA`). That region is saved on the event and on every
   player scraped. Otherwise region is left empty.
2. Every player profile linked on the event page is collected. Stats are pulled using
   vlr.gg's **all-time** timespan.
3. Each player is scraped, saved to `players.db` in your current directory, linked to the
   event, and printed to the console.

Running it again with an event name and year that are already saved replaces that event's
players with the freshly scraped ones. A player already in the database is updated with the
new data rather than duplicated.

### Clearing data

```bash
npx valstats --clear-event "Stage 2"   # remove one event and its players
npx valstats --clear                   # wipe the whole database (type "yes" to confirm)
```

Players that also belong to another event are kept when a single event is cleared.

## What gets scraped

Each player is stored as an object like this:

```js
{
  name: 'tenz',                         // from the profile URL
  team: 'Sentinels',                    // current team
  past_teams: ['Cloud9', ...],          // previous teams
  winnings: '$123,456',                 // total event winnings
  most_played_agents: ['Jett', ...],    // top 3 agents by usage
  avg_kda: 1.23,                        // average K:D across those top 3 agents
  nationality: 'Canada',
  region: 'AMER',                       // from the CLI prompt / argument, or null
  stats: [                              // full agent stat rows for the top 3 agents,
    { Agent: 'Jett', 'K:D': '1.25', ... } //   keyed by vlr.gg's column headers
  ]
}
```

## Library usage

```js
import {
  scrapePlayer,
  scrapeWebsite,
  savePlayer,
  saveEvent,
  addPlayerToEvent,
  getPlayersByEvent,
  getRandomPlayerFromEvent,
} from 'vlr-stats-scraper';

const eventId = saveEvent({ name: 'Stage 2', region: 'AMER', year: 2026 });

const links = await scrapeWebsite('https://www.vlr.gg/event/.../group-stage');
for (const link of links) {
  const player = await scrapePlayer(link, 'AMER');
  if (player) {
    savePlayer(player);
    addPlayerToEvent(eventId, player.name);
  }
}

const roster = getPlayersByEvent('Stage 2');
const pick = getRandomPlayerFromEvent('Stage 2');
```

### Exports

#### Scraping

| Function | Returns | Description |
| --- | --- | --- |
| `scrapeWebsite(url)` | `Promise<string[]>` | Scrapes an event page and returns every player profile link on it (with `?timespan=all`). |
| `scrapePlayer(url, region)` | `Promise<Player>` | Scrapes one player's profile page into a player object (see above). `region` is stored as-is. Returns `undefined` if scraping fails. |

#### Players

| Function | Returns | Description |
| --- | --- | --- |
| `savePlayer(player)` | — | Inserts a player, or updates them if one with the same name exists. |
| `getPlayer(name)` | `Player \| null` | Looks up a player by name. |
| `getAllPlayers()` | `Player[]` | Every player in the database. |
| `getRandomPlayer()` | `Player \| null` | A random player from the whole database. |

#### Events (tournaments / stages)

| Function | Returns | Description |
| --- | --- | --- |
| `saveEvent({ name, url, region, year, stage })` | `number` | Creates or updates an event by name and returns its id. Only `name` is required. |
| `addPlayerToEvent(eventId, playerName)` | — | Links a saved player to an event (ignored if already linked). |
| `getEvents()` | `Event[]` | Every saved event. |
| `getEventByName(name)` | `Event \| undefined` | Looks up an event by name. |
| `getPlayersByEvent(eventName)` | `Player[]` | All players linked to an event. |
| `getRandomPlayerFromEvent(eventName)` | `Player \| null` | A random player from one event. |

#### Clearing

| Function | Returns | Description |
| --- | --- | --- |
| `emptyEvent(eventName)` | `boolean` | Removes an event's players but keeps the event so it can be re-scraped. `false` if the event doesn't exist. |
| `clearEvent(eventName)` | `boolean` | Removes an event and its players. `false` if the event doesn't exist. |
| `clearDatabase()` | — | Deletes every event and player. |

Players that still belong to another event are never deleted by `emptyEvent` or
`clearEvent`.

## Data storage

Player and event data is stored in a `players.db` SQLite file created in whichever
directory you run the tool from. It has three tables:

- `players` — one row per player (`past_teams`, `most_played_agents` and `stats` are stored
  as JSON and parsed back automatically when read).
- `events` — one row per tournament/stage (`name`, `url`, `region`, `year`, `stage`).
- `event_players` — links players to the events they were scraped from.

Databases created by older versions (with `tournaments` / `tournament_players` tables) are
migrated automatically.

## License

ISC
