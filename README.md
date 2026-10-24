# vlr-stats-scraper

Scrapes player stats from [vlr.gg](https://www.vlr.gg) and stores them in a local SQLite
database, grouped by tournament or stage, so you can pull a backlog of players.

## Setup

Requires a [Hyperbrowser](https://hyperbrowser.ai) API key for scraping.

```bash
npm install vlr-stats-scraper
```

Create a `.env` file in the directory you run it from:

```
HYPERBROWSER_API_KEY=your_key_here
```

## CLI usage

```bash
npx valstats <link> <year> <event-name>
```

```bash
npx valstats https://www.vlr.gg/event/2977/vct-2026-americas-stage-2/group-stage 2026 "Stage 2"
```

- `link` — the vlr.gg event/group-stage page to scrape.
- `year` — the year the event took place.
- `event-name` — a label for this tournament/stage (used to group players together later).

Each player on that event page gets scraped and saved to `players.db` in your current
directory, linked to that event name.

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

const links = await scrapeWebsite('https://www.vlr.gg/event/.../group-stage');
const player = await scrapePlayer(links[0], 'AMER');
savePlayer(player);
```

### Exports

- `scrapePlayer(url, region)` — scrapes one player's profile page.
- `scrapeWebsite(url)` — scrapes an event page for player profile links.
- `savePlayer(player)` / `getPlayer(name)` / `getAllPlayers()` / `getRandomPlayer()`
- `saveEvent({ name, url, region, year, stage })` — creates/updates a tournament or stage,
  returns its id.
- `addPlayerToEvent(eventId, playerName)`
- `getEvents()` / `getEventByName(name)`
- `getPlayersByEvent(eventName)` / `getRandomPlayerFromEvent(eventName)`

## Data storage

Player and event data is stored in a `players.db` SQLite file created in whichever
directory you run the tool from.

## License

ISC
