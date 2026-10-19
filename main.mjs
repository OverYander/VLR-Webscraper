import promptSync from 'prompt-sync';
import scrapeWebsite from './scripts/player-link-scraper.mjs';
import scrapePlayer from './scripts/player-info-scraper.mjs';
import { savePlayer } from './scripts/db.mjs';

const prompt = promptSync();

const tournamentUrl = prompt('Enter the tournament URL: ');
const region = prompt('Enter the region: ');

const links = await scrapeWebsite(tournamentUrl, region);

for (const link of links) {
  const player = await scrapePlayer(link, region);
  if (player) {
    savePlayer(player);
    console.log(`Saved ${player.name} to players.db`);
    console.log(player);
  }
}
