import { scrapeWebsite } from "./playerLinkScraper.mjs";
import * as cheerio from 'cheerio';
import { Hyperbrowser } from "@hyperbrowser/sdk"
import { config } from "dotenv";

config();

const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
})

function findAgents($) {
  const header = $('.mod-agent-rows').first().children().first()

  const statCategories = header.text().split('\n').map(ele => ele.trim()).filter(ele => ele !== '')
  statCategories.unshift('Agent')

  const agentStats = header.next().children()
  const agent1 = agentStats.eq(0).children().first().html().trim()
  const agent1Stats = agentStats.eq(0).text().split('\t').map(ele => ele.trim()).filter(ele => ele !== '')
  const agent2 = agentStats.eq(1).children().first().html().trim()
  const agent2Stats = agentStats.eq(1).text().split('\t').map(ele => ele.trim()).filter(ele => ele !== '')
  const agent3 = agentStats.eq(2).children().first().html().trim()
  const agent3Stats = agentStats.eq(2).text().split('\t').map(ele => ele.trim()).filter(ele => ele !== '')


  const agent1Data = statCategories.reduce((acc, category, index) => {
    if(index === 0) {
      acc[category] = agent1
    }
    else {
      acc[category] = agent1Stats[index-1]
    }
    return acc
  }, {})

  const agent2Data = statCategories.reduce((acc, category, index) => {
    if(index === 0) {
      acc[category] = agent2
    }
    else {
      acc[category] = agent2Stats[index-1]
    }
    return acc
  }, {})

  const agent3Data = statCategories.reduce((acc, category, index) => {
    if(index === 0) {
      acc[category] = agent3
    }
    else {
      acc[category] = agent3Stats[index-1]
    }
    return acc
  }, {})

  return [agent1Data, agent2Data, agent3Data]
}

function getCurTeam($) {
  const currentTeam = $('h2:contains("Current Teams")').first().next().text().trim()
  const currentTeamName = currentTeam.split('\t').filter(ele => ele.trim() !== '')
  return currentTeamName[0].trim()
}

function getPastTeam($) {
    const pastTeams = $('h2:contains("Past Teams")').first().next().text().trim()
    const pastTeamNames = pastTeams.split('\t').filter(ele => ele.trim() !== ''
                          && !ele.includes('joined')
                          && !ele.includes(' – ')
                          && !ele.includes('left'))
                          .map(ele => ele.trim())
    return pastTeamNames
}

function getWinnings($) {
    const events = $('h2:contains("Event Placements")').first().next()
    const winnings = events.children().first().text().trim()
    console.log(winnings.split('\t').map(ele => ele.trim()).filter(ele => ele !== '')[1])
    return winnings.split('\t').map(ele => ele.trim()).filter(ele => ele !== '')[1]
  
}


async function scrapePlayer(url) {
  try {
    const scrapeData = await client.scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["html"]
      }
    })

    const $ = cheerio.load(scrapeData.data.html);
    findAgents($)
  }
  catch (error) {
    console.error("Error scraping website:", scrapeData.error);
  }
}

// const playerLinks = await scrapeWebsite("https://www.vlr.gg/event/2977/vct-2026-americas-stage-2/group-stage")
const playerInfo = await scrapePlayer('https://www.vlr.gg/player/872/autumn');

/*
node playerinfoScraper.mjs
*/