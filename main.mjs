import promptSync from 'prompt-sync';
import scrapePlayer from './scripts/player-info-scraper.mjs';
import { savePlayer } from './scripts/db.mjs';

const prompt = promptSync();

const link = prompt('Enter the page link: ');
const region = prompt('Enter the region: ');

const player = await scrapePlayer(link, region);

if (player) {
  savePlayer(player);
  console.log(`Saved ${player.name} to players.db`);
  console.log(player);
} else {
  console.log('Failed to scrape player.');
}
