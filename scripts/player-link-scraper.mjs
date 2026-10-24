import { Hyperbrowser } from "@hyperbrowser/sdk"
import { config } from "dotenv";

config();

let client;
function getClient() {
  if (!client) {
    client = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })
  }
  return client;
}

async function scrapeWebsite(url) {
  try {
    const scrapeData = await getClient().scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["html"],
        includeTags: [".event-team-players-item"]
      },
    })

    const players = scrapeData.data.html.split('\n').filter(line => line.includes('event-team-players-item'))
    const playerLinks = players.map(player => {
      const match = player.match(/href="(https:\/\/www\.vlr\.gg\/player\/[^"]*)"/)
      return match ? match[1] + "/?timespan=all" : null;
    }).filter(link => link !== null);
    
    return playerLinks
  } 
  catch (error) {
    console.error("Error scraping website:", error)
  }
}

export { scrapeWebsite };
/*
node teamscraper.mjs
*/