import Database from 'better-sqlite3'
import path from 'path'

const db = new Database(path.join(process.cwd(), 'players.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    name TEXT PRIMARY KEY,
    team TEXT,
    past_teams TEXT,
    winnings TEXT,
    most_played_agents TEXT,
    avg_kda REAL,
    nationality TEXT,
    region TEXT,
    stats TEXT
  )
`)

const existingPlayerColumns = db.prepare('PRAGMA table_info(players)').all().map(col => col.name)
if (!existingPlayerColumns.includes('stats')) {
  db.exec('ALTER TABLE players ADD COLUMN stats TEXT')
}

const existingTableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name)
if (existingTableNames.includes('tournaments') && !existingTableNames.includes('events')) {
  db.exec('ALTER TABLE tournaments RENAME TO events')
}
if (existingTableNames.includes('tournament_players') && !existingTableNames.includes('event_players')) {
  db.exec('ALTER TABLE tournament_players RENAME TO event_players')
  db.exec('ALTER TABLE event_players RENAME COLUMN tournament_id TO event_id')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    url TEXT,
    region TEXT,
    year INTEGER,
    stage INTEGER
  )
`)

const existingEventColumns = db.prepare('PRAGMA table_info(events)').all().map(col => col.name)
if (!existingEventColumns.includes('year')) {
  db.exec('ALTER TABLE events ADD COLUMN year INTEGER')
}
if (!existingEventColumns.includes('stage')) {
  db.exec('ALTER TABLE events ADD COLUMN stage INTEGER')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS event_players (
    event_id INTEGER NOT NULL REFERENCES events(id),
    player_name TEXT NOT NULL REFERENCES players(name),
    PRIMARY KEY (event_id, player_name)
  )
`)

const upsertPlayerStmt = db.prepare(`
  INSERT INTO players (name, team, past_teams, winnings, most_played_agents, avg_kda, nationality, region, stats)
  VALUES (@name, @team, @past_teams, @winnings, @most_played_agents, @avg_kda, @nationality, @region, @stats)
  ON CONFLICT(name) DO UPDATE SET
    team = excluded.team,
    past_teams = excluded.past_teams,
    winnings = excluded.winnings,
    most_played_agents = excluded.most_played_agents,
    avg_kda = excluded.avg_kda,
    nationality = excluded.nationality,
    region = excluded.region,
    stats = excluded.stats
`)

const upsertEventStmt = db.prepare(`
  INSERT INTO events (name, url, region, year, stage)
  VALUES (@name, @url, @region, @year, @stage)
  ON CONFLICT(name) DO UPDATE SET
    url = excluded.url,
    region = excluded.region,
    year = excluded.year,
    stage = excluded.stage
`)

const linkPlayerToEventStmt = db.prepare(`
  INSERT OR IGNORE INTO event_players (event_id, player_name)
  VALUES (@eventId, @playerName)
`)

function rowToPlayer(row) {
  if (!row) return null
  return {
    ...row,
    past_teams: JSON.parse(row.past_teams),
    most_played_agents: JSON.parse(row.most_played_agents),
    stats: JSON.parse(row.stats),
  }
}

function savePlayer(player) {
  upsertPlayerStmt.run({
    ...player,
    past_teams: JSON.stringify(player.past_teams),
    most_played_agents: JSON.stringify(player.most_played_agents),
    stats: JSON.stringify(player.stats),
  })
}

function getPlayer(name) {
  return rowToPlayer(db.prepare('SELECT * FROM players WHERE name = ?').get(name))
}

// Case-insensitive partial match, e.g. "ten" finds "tenz" and "tenten".
function searchPlayers(query) {
  return db.prepare("SELECT * FROM players WHERE name LIKE ? ESCAPE '\\' ORDER BY name")
    .all(`%${query.replace(/[\\%_]/g, '\\$&')}%`)
    .map(rowToPlayer)
}

function getAllPlayers() {
  return db.prepare('SELECT * FROM players').all().map(rowToPlayer)
}

function getRandomPlayer() {
  return rowToPlayer(db.prepare('SELECT * FROM players ORDER BY RANDOM() LIMIT 1').get())
}

// Creates the event (tournament, stage, etc.) if it doesn't exist yet, and returns its id either way.
function saveEvent({ name, url, region, year, stage }) {
  upsertEventStmt.run({
    name,
    url: url ?? null,
    region: region ?? null,
    year: year ?? null,
    stage: stage ?? null,
  })
  return db.prepare('SELECT id FROM events WHERE name = ?').get(name).id
}

function addPlayerToEvent(eventId, playerName) {
  linkPlayerToEventStmt.run({ eventId, playerName })
}

function getEvents() {
  return db.prepare('SELECT * FROM events').all()
}

function getEventByName(name) {
  return db.prepare('SELECT * FROM events WHERE name = ?').get(name)
}

function getPlayersByEvent(eventName) {
  return db.prepare(`
    SELECT players.* FROM players
    JOIN event_players ON event_players.player_name = players.name
    JOIN events ON events.id = event_players.event_id
    WHERE events.name = ?
  `).all(eventName).map(rowToPlayer)
}

function getRandomPlayerFromEvent(eventName) {
  return rowToPlayer(db.prepare(`
    SELECT players.* FROM players
    JOIN event_players ON event_players.player_name = players.name
    JOIN events ON events.id = event_players.event_id
    WHERE events.name = ?
    ORDER BY RANDOM() LIMIT 1
  `).get(eventName))
}

// Deletes players that no longer belong to any event.
function deleteOrphanedPlayers() {
  db.prepare('DELETE FROM players WHERE name NOT IN (SELECT player_name FROM event_players)').run()
}

// Removes every player from an event but keeps the event itself, so it can be re-scraped.
// Players that are still in other events are kept.
const emptyEvent = db.transaction((eventName) => {
  const event = getEventByName(eventName)
  if (!event) return false
  db.prepare('DELETE FROM event_players WHERE event_id = ?').run(event.id)
  deleteOrphanedPlayers()
  return true
})

// Removes an event and its players. Players that are still in other events are kept.
const clearEvent = db.transaction((eventName) => {
  if (!emptyEvent(eventName)) return false
  db.prepare('DELETE FROM events WHERE name = ?').run(eventName)
  return true
})

// Wipes every event and player from the database.
const clearDatabase = db.transaction(() => {
  db.exec('DELETE FROM event_players DELETE FROM events DELETE FROM players')
})

export {
  savePlayer,
  getPlayer,
  searchPlayers,
  getAllPlayers,
  getRandomPlayer,
  saveEvent,
  addPlayerToEvent,
  getEvents,
  getEventByName,
  getPlayersByEvent,
  getRandomPlayerFromEvent,
  emptyEvent,
  clearEvent,
  clearDatabase,
}
