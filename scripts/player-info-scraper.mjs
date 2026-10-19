import * as cheerio from 'cheerio';
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

async function scrapePlayer(url, region) {
  console.log('scrapePlayer ran')
  try {
    const scrapeData = await getClient().scrape.startAndWait({
      url: url,
      scrapeOptions: {
        formats: ["html"]
      }
    })

    const $ = cheerio.load(scrapeData.data.html);

    const agentsPlayed = findAgents($)
    return {
      name: getPlayerName(url),
      team: getCurTeam($),
      past_teams: getPastTeam($),
      winnings: getWinnings($),
      most_played_agents: agentsPlayed.map(data => data.Agent),
      avg_kda: agentsPlayed.reduce((acc, data) => acc + (parseFloat(data['K:D'])) / agentsPlayed.length, 0),
      nationality: getNationality($),
      region: region,
      stats: agentsPlayed
    }
  }
  catch (error) {
    console.error("Error scraping website:", error);
  }
}

export default scrapePlayer;

/*
node scripts/player-info-scraper.mjs
*/

function getPlayerName(link) {
  console.log('getPlayerName ran')
  return link.substring(link.lastIndexOf('/') + 1)
}

function findAgents($) {
  console.log('findAgents ran')
  const header = $('.mod-agent-rows').first().children().first()

  const statCategories = header.text().split('\n').map(ele => ele.trim()).filter(ele => ele !== '')
  statCategories.unshift('Agent')

  const agentStats = header.next().children()
  const agents = agentStats.map((i, el) => {
    el = $(el)
    return {
      agent: el.children().first().html().trim(),
      stats: el.text().split('\t').map(ele => ele.trim()).filter(ele => ele !== '')
    }
  }).get()

  const agentData = agents.map(agent => {
    return statCategories.reduce((acc, category, index) => {
      if(index == 0) {
        acc[category] = agent.agent
      }
      else {
        acc[category] = agent.stats[index-1]
      }
      return acc
    }, {})
  })

  return agentData.length<3 ? agentData : agentData.slice(0,3)
}

function getCurTeam($) {
  console.log('getCurTeam ran')
  const currentTeam = $('h2:contains("Current Teams")').first().next().text().trim()
  const currentTeamName = currentTeam.split('\t').filter(ele => ele.trim() !== '')
  return currentTeamName[0].trim()
}

function getPastTeam($) {
    console.log('getPastTeam ran')
    const pastTeams = $('h2:contains("Past Teams")').first().next().text().trim()
    const pastTeamNames = pastTeams.split('\t').filter(ele => ele.trim() !== ''
                          && !ele.includes('joined')
                          && !ele.includes(' – ')
                          && !ele.includes('left'))
                          .map(ele => ele.trim())
    return pastTeamNames
}

function getWinnings($) {
    console.log('getWinnings ran')
    const events = $('h2:contains("Event Placements")').first().next()
    const winnings = events.children().first().text().trim()
    // console.log(winnings.split('\t').map(ele => ele.trim()).filter(ele => ele !== '')[1])
    return winnings.split('\t').map(ele => ele.trim()).filter(ele => ele !== '')[1]
  
}

function getNationality($) {
  console.log('getNationality ran')
  const header = $('.flag').first()
  console.log('flags found:', $('.flag').length);
  console.log(header.parent().text().trim())
  return header.parent().text().trim()
}