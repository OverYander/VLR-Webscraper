#!/usr/bin/env node
import promptSync from 'prompt-sync';
import { scrapeWebsite } from './scripts/player-link-scraper.mjs';
import scrapePlayer from './scripts/player-info-scraper.mjs';
import {
  savePlayer,
  saveEvent,
  addPlayerToEvent,
  getEventByName,
  emptyEvent,
  clearEvent,
  clearDatabase,
} from './scripts/db.mjs';

const args = process.argv.slice(2);

if (args[0] === '--clear') {
  const prompt = promptSync();
  const answer = prompt('This deletes every event and player in players.db. Type "yes" to continue: ');
  if (answer?.trim().toLowerCase() === 'yes') {
    clearDatabase();
    console.log('Cleared players.db');
  } else {
    console.log('Cancelled');
  }
  process.exit(0);
}

if (args[0] === '--clear-event') {
  const name = args[1];
  if (!name) {
    console.error('Usage: valstats --clear-event <event-name>');
    process.exit(1);
  }
  if (clearEvent(name)) {
    console.log(`Removed "${name}" and its players from players.db`);
  } else {
    console.error(`No event named "${name}" in players.db`);
    process.exit(1);
  }
  process.exit(0);
}

const [link, year, eventName] = args;

if (!link || !year || !eventName) {
  console.error('Usage: valstats <link> <year> <event-name>');
  console.error('       valstats --clear-event <event-name>');
  console.error('       valstats --clear');
  process.exit(1);
}

const isStage = eventName.toLowerCase().includes('stage');

let region = null;
if (isStage) {
  const prompt = promptSync();
  region = prompt('Enter the region: ');
}

// Re-adding an event + year that's already saved replaces its old players.
const existing = getEventByName(eventName);
if (existing && existing.year === parseInt(year, 10)) {
  emptyEvent(eventName);
  console.log(`"${eventName}" (${year}) is already in players.db, replacing it`);
}

const eventId = saveEvent({
  name: eventName,
  url: link,
  region,
  year: parseInt(year, 10),
  stage: null,
});

const links = await scrapeWebsite(link);

if (!links) {
  console.error(`Couldn't get the player list from ${link}`);
  process.exit(1);
}

for (const playerLink of links) {
  const player = await scrapePlayer(playerLink, region);
  if (player) {
    savePlayer(player);
    addPlayerToEvent(eventId, player.name);
    console.log(`Saved ${player.name} to players.db under "${eventName}"`);
    console.log(player);
  }
}
