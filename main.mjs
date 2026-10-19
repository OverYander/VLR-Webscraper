#!/usr/bin/env node
import promptSync from 'prompt-sync';
import { scrapeWebsite } from './scripts/player-link-scraper.mjs';
import scrapePlayer from './scripts/player-info-scraper.mjs';
import { savePlayer, saveEvent, addPlayerToEvent } from './scripts/db.mjs';

const prompt = promptSync();

const eventType = prompt('Is this a tournament or a stage? ').trim().toLowerCase();

let eventName;
let year = null;
let stage = null;

if (eventType === 'stage') {
  year = prompt('Enter the year: ');
  stage = prompt('Enter the stage number: ');
  eventName = `${year} Stage ${stage}`;
  year = parseInt(year, 10);
  stage = parseInt(stage, 10);
} else {
  eventName = prompt('Enter the tournament name: ');
}

const eventUrl = prompt('Enter the event URL: ');
const region = prompt('Enter the region: ');

const eventId = saveEvent({
  name: eventName,
  url: eventUrl,
  region,
  year,
  stage,
});

const links = await scrapeWebsite(eventUrl, region);

for (const link of links) {
  const player = await scrapePlayer(link, region);
  if (player) {
    savePlayer(player);
    addPlayerToEvent(eventId, player.name);
    console.log(`Saved ${player.name} to players.db under "${eventName}"`);
    console.log(player);
  }
}
