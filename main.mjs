#!/usr/bin/env node
import promptSync from 'prompt-sync';
import { scrapeWebsite } from './scripts/player-link-scraper.mjs';
import scrapePlayer from './scripts/player-info-scraper.mjs';
import { savePlayer, saveEvent, addPlayerToEvent } from './scripts/db.mjs';

const [link, year, eventName] = process.argv.slice(2);

if (!link || !year || !eventName) {
  console.error('Usage: valstats <link> <year> <event-name>');
  process.exit(1);
}

const isStage = eventName.toLowerCase().includes('stage');

let region = null;
if (isStage) {
  const prompt = promptSync();
  region = prompt('Enter the region: ');
}

const eventId = saveEvent({
  name: eventName,
  url: link,
  region,
  year: parseInt(year, 10),
  stage: null,
});

const links = await scrapeWebsite(link);

for (const playerLink of links) {
  const player = await scrapePlayer(playerLink, region);
  if (player) {
    savePlayer(player);
    addPlayerToEvent(eventId, player.name);
    console.log(`Saved ${player.name} to players.db under "${eventName}"`);
    console.log(player);
  }
}
