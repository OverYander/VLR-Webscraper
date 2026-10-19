import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'players.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    name TEXT PRIMARY KEY,
    team TEXT,
    past_teams TEXT,
    winnings TEXT,
    most_played_agents TEXT,
    avg_kd REAL,
    nationality TEXT,
    region TEXT,
    stats TEXT
  )
`);

const existingColumns = db.prepare('PRAGMA table_info(players)').all().map(col => col.name);
if (existingColumns.includes('avg_kda') && !existingColumns.includes('avg_kd')) {
  db.exec('ALTER TABLE players RENAME COLUMN avg_kda TO avg_kd');
}
if (!existingColumns.includes('stats')) {
  db.exec('ALTER TABLE players ADD COLUMN stats TEXT');
}

const upsertStmt = db.prepare(`
  INSERT INTO players (name, team, past_teams, winnings, most_played_agents, avg_kd, nationality, region, stats)
  VALUES (@name, @team, @past_teams, @winnings, @most_played_agents, @avg_kd, @nationality, @region, @stats)
  ON CONFLICT(name) DO UPDATE SET
    team = excluded.team,
    past_teams = excluded.past_teams,
    winnings = excluded.winnings,
    most_played_agents = excluded.most_played_agents,
    avg_kd = excluded.avg_kd,
    nationality = excluded.nationality,
    region = excluded.region,
    stats = excluded.stats
`);

function rowToPlayer(row) {
  if (!row) return null;
  return {
    ...row,
    past_teams: JSON.parse(row.past_teams),
    most_played_agents: JSON.parse(row.most_played_agents),
    stats: JSON.parse(row.stats),
  };
}

function savePlayer(player) {
  upsertStmt.run({
    ...player,
    past_teams: JSON.stringify(player.past_teams),
    most_played_agents: JSON.stringify(player.most_played_agents),
    stats: JSON.stringify(player.stats),
  });
}

function getPlayer(name) {
  return rowToPlayer(db.prepare('SELECT * FROM players WHERE name = ?').get(name));
}

function getAllPlayers() {
  return db.prepare('SELECT * FROM players').all().map(rowToPlayer);
}

function getRandomPlayer() {
  return rowToPlayer(db.prepare('SELECT * FROM players ORDER BY RANDOM() LIMIT 1').get());
}

export { savePlayer, getPlayer, getAllPlayers, getRandomPlayer };
