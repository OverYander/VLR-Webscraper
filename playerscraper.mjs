import { Hyperbrowser } from "@hyperbrowser/sdk"
import { config } from "dotenv";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
})

async function scrapeWebsite(url) {
  try {
    const scrapeData = await client.scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["html"],
        includeTags: [".event-team-players-item"]
      },
    })

    const players = scrapeData.data.html.split('\n').filter(line => line.includes('event-team-players-item'))
    const playerLinks = players.map(player => {
      const match = player.match(/href="(https:\/\/www\.vlr\.gg\/player\/[^"]*)"/);
      return match ? match[1] : null;
    }).filter(link => link !== null);
    
    // console.log("Players:", playerLinks);
  } 
  catch (error) {
    console.error("Error scraping website:", scrapeData.error);
  }
}

async function scrapePlayer(url) {
  try {
    const scrapeData = await client.scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["html"],
        includeTags: [".mod-agent"]
      },
    })
    
    console.log("Players:", playerLinks);
  }
  catch (error) {
    console.error("Error scraping website:", scrapeData.error);
  }
}

const playerLinks = await scrapeWebsite("https://www.vlr.gg/event/2977/vct-2026-americas-stage-2/group-stage");


/*
node teamscraper.mjs
*/