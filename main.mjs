#!/usr/bin/env node
import promptSync from 'prompt-sync'
import { scrapeWebsite } from './scripts/player-link-scraper.mjs'
import scrapePlayer from './scripts/player-info-scraper.mjs'
import {
  savePlayer,
  saveEvent,
  addPlayerToEvent,
  getEventByName,
  emptyEvent,
  clearEvent,
  clearDatabase,
  searchPlayers,
} from './scripts/db.mjs'

const args = process.argv.slice(2)

function printPlayerStats(player) {
  console.log(`\n${player.name}`)
  console.log(`  Team:        ${player.team ?? 'Free agent'}`)
  console.log(`  Past teams:  ${player.past_teams?.length ? player.past_teams.join(', ') : 'None'}`)
  console.log(`  Nationality: ${player.nationality || 'Unknown'}`)
  console.log(`  Region:      ${player.region ?? 'Unknown'}`)
  console.log(`  Winnings:    ${player.winnings ?? 'Unknown'}`)
  // Older saves stored agents as raw <img> tags, so pull the name out of the alt text.
  const agents = (player.most_played_agents ?? []).map(agent => agent?.match(/alt="([^"]*)"/)?.[1] ?? agent)
  console.log(`  Top agents:  ${agents.join(', ') || 'None'}`)
  console.log(`  Avg K:D:     ${Number(player.avg_kda).toFixed(2)}`)
  if (player.stats?.length) {
    console.table(player.stats)
  }
}

if (args[0] === '--player') {
  const query = args[1]
  if (!query) {
    console.error('Usage: valstats --player <name | vlr.gg player link>')
    process.exit(1)
  }

  // A vlr.gg link is scraped live anything else is searched for in players.db.
  if (query.startsWith('http')) {
    const url = query.includes('timespan=') ? query : query.replace(/\/?$/, '/?timespan=all')
    const player = await scrapePlayer(url, null)
    if (!player) {
      console.error(`Couldn't scrape a player from ${query}`)
      process.exit(1)
    }
    printPlayerStats(player)
    process.exit(0)
  }

  const players = searchPlayers(query)
  if (!players.length) {
    console.error(`No players matching "${query}" in players.db (pass a vlr.gg player link to scrape them live)`)
    process.exit(1)
  }
  console.log(`${players.length} player${players.length === 1 ? '' : 's'} matching "${query}":`)
  players.forEach(printPlayerStats)
  process.exit(0)
}

if (args[0] === '--clear') {
  const prompt = promptSync()
  const answer = prompt('This deletes every event and player in players.db. Type "yes" to continue: ')
  if (answer?.trim().toLowerCase() === 'yes') {
    clearDatabase()
    console.log('Cleared players.db')
  } else {
    console.log('Cancelled')
  }
  process.exit(0)
}

if (args[0] === '--clear-event') {
  const name = args[1]
  if (!name) {
    console.error('Usage: valstats --clear-event <event-name>')
    process.exit(1)
  }
  if (clearEvent(name)) {
    console.log(`Removed "${name}" and its players from players.db`)
  } else {
    console.error(`No event named "${name}" in players.db`)
    process.exit(1)
  }
  process.exit(0)
}

const [link, year, eventName] = args

if (!link || !year || !eventName) {
  console.error('Usage: valstats <link> <year> <event-name>')
  console.error('       valstats --player <name | vlr.gg player link>')
  console.error('       valstats --clear-event <event-name>')
  console.error('       valstats --clear')
  process.exit(1)
}

const isStage = eventName.toLowerCase().includes('stage')

let region = null
if (isStage) {
  const prompt = promptSync()
  region = prompt('Enter the region: ')
}

// Re-adding an event + year that's already saved replaces its old players.
const existing = getEventByName(eventName)
if (existing && existing.year === parseInt(year, 10)) {
  emptyEvent(eventName)
  console.log(`"${eventName}" (${year}) is already in players.db, replacing it`)
}

const eventId = saveEvent({
  name: eventName,
  url: link,
  region,
  year: parseInt(year, 10),
  stage: null,
})

const links = await scrapeWebsite(link)

if (!links) {
  console.error(`Couldn't get the player list from ${link}`)
  process.exit(1)
}

for (const playerLink of links) {
  const player = await scrapePlayer(playerLink, region)
  if (player) {
    savePlayer(player)
    addPlayerToEvent(eventId, player.name)
    console.log(`Saved ${player.name} to players.db under "${eventName}"`)
    console.log(player)
  }
}
