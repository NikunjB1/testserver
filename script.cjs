const express = require('express');
const mongoose = require('mongoose');
const KirkaModule = require('kirkajs');
require('dotenv').config(); // Load environment variables from .env file
const { createCanvas } = require('canvas');
const KirkaJS = new KirkaModule();
const MemberSchema = require('./dailylb.cjs');
const fs = require('fs');
const MemberSchemav2 = require("./ClanMember Febuary");
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// app.use(cors({
//   origin: ['https://zenos-hub.vercel.app', 'http://localhost:3000'],
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(express.json());

// Define the initialize function
async function initialize() {
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

app.post('/generate-image', (req, res) => {
  const { players, pageNumber } = req.body;
  const PLAYERS_PER_PAGE = 15;

  const startIndex = (pageNumber - 1) * PLAYERS_PER_PAGE;
  const pagePlayers = players.slice(startIndex, startIndex + PLAYERS_PER_PAGE);

  const canvas = createCanvas(800, PLAYERS_PER_PAGE * 60 + 20);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#000033");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const columns = {
    rank: { x: 200, width: 100 },
    name: { x: 400, width: 200 },
    klo: { x: 600, width: 100 },
  };

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px Arial";
  const title = `🏆 VinK KLO Leaderboard - Page ${pageNumber} 🏆`;
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, (canvas.width - titleWidth) / 2, 60);

  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Rank", columns.rank.x, 100);
  ctx.fillText("Name", columns.name.x, 100);
  ctx.fillText("KLO", columns.klo.x, 100);

  ctx.beginPath();
  ctx.strokeStyle = "#ffffff33";
  ctx.lineWidth = 2;
  ctx.moveTo(100, 110);
  ctx.lineTo(canvas.width - 100, 110);
  ctx.stroke();

  ctx.font = "18px Arial";
  pagePlayers.forEach((player, index) => {
    const y = 140 + index * 50;
    const globalRank = startIndex + index + 1;

    let rankColor = "#ffffff";
    let nameColor = "#00ffff";
    let kloColor = "#ffffff";

    // Special colors for top 3
    if (globalRank === 1) {
      rankColor = "#ffd700";
      nameColor = "#ffd700";
      kloColor = "#ffd700";
    } else if (globalRank === 2) {
      rankColor = "#c0c0c0";
      nameColor = "#c0c0c0";
      kloColor = "#c0c0c0";
    } else if (globalRank === 3) {
      rankColor = "#cd7f32";
      nameColor = "#cd7f32";
      kloColor = "#cd7f32";
    }

    ctx.fillStyle = rankColor;
    ctx.fillText(`${globalRank}.`, columns.rank.x, y);

    // Add player name with neon effect for top 3
    ctx.fillStyle = nameColor;
    if (globalRank <= 3) {
      ctx.shadowColor = nameColor;
      ctx.shadowBlur = 10;
      ctx.fillText(player.name, columns.name.x, y);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillText(player.name, columns.name.x, y);
    }

    ctx.fillStyle = kloColor;
    ctx.fillText(player.klo.toString(), columns.klo.x, y);

    if (index < PLAYERS_PER_PAGE - 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#ffffff11";
      ctx.lineWidth = 1;
      ctx.moveTo(100, y + 15);
      ctx.lineTo(canvas.width - 100, y + 15);
      ctx.stroke();
    }
  });

  const buffer = canvas.toBuffer('image/png');
  res.type('png').send(buffer);
});


app.get('/test', async (req, res) => {
  console.log('Endpoint /test hit');
  let leaderboardJson;
  let leaderboard;
  leaderboardJson = JSON.stringify({Test: "pog"});
  res.json(leaderboardJson);
});

async function autoUpdate(){
  let test = await KirkaJS.getSoloLeaderboard();
  if(test.remainingTime == null)
    return;
  if(test.remainingTime <= (1800000/2)){
    let leaderboard = await KirkaJS.getClanLeaderboard();
    //convert leaderboard to json and write to lb.json
    let json = JSON.stringify(leaderboard);
    fs.writeFileSync('lb.json', json);
    console.log('Leaderboard updated');
  }
  //console.log(leaderboard);
}

async function pingTestEndpoint() {
  try {
    const response = await fetch('https://backend-api-2l08.onrender.com/test');
  } catch (error) {
    console.error('Error pinging test endpoint:', error.message);
  }
}

initialize();
autoUpdate();
pingTestEndpoint();
const interval2 = setInterval(autoUpdate, 5 * 60 * 1000); // 5 minutes in milliseconds
const testPingInterval = setInterval(pingTestEndpoint, 5 * 60 * 1000);

// Define the /dailylb endpoint
app.get('/dailylb', async (req, res) => {
  const {date} = req.query;
  console.log(date);
  console.log('Endpoint /dailylb hit');
  let leaderboardJson;
  let leaderboard;
  if(date === 'current'){
  leaderboard = await KirkaJS.getSoloLeaderboard();
  leaderboardJson = JSON.stringify(leaderboard);
  } else {
    let list  = await MemberSchema.find({date}).exec();
    if(list.length === 0){
      leaderboardJson = JSON.stringify({error: 'No data found for this date', response: list});
    }
    else{
      leaderboard = {results:[]};
      for(let member of list){
        let user = (await KirkaJS.getStatsLongID(member.longId));
        leaderboard.results.push({rank: member.rank, name: user.name, scores: member.score, userId: member.longId});
     }
      leaderboardJson = JSON.stringify(leaderboard);
    }
  }
  res.json(leaderboardJson);
});

app.get('/pv', async (req, res) => {
  const {id} = req.query;
  console.log('Endpoint /pv hit');
  let profile = await KirkaJS.getStatsLongID(id);
  if(profile.id == null)
      profile = JSON.stringify({error: 'Api Error', response: profile});
  else
      profile = JSON.stringify(profile);
  
  res.json(profile);
});

app.get('/pvCheck', async (req, res) => {
  const {id} = req.query;
  console.log('Endpoint /pvCheck hit');
  console.log(id);
  let profile = await KirkaJS.getStats(id);
  if(profile.id == null)
      profile = JSON.stringify({error: 'Api Error', response: profile});
  else
      profile = JSON.stringify(profile);
  
  res.json(profile);
});

app.get('/getDiscordID', async (req, res) => {
  const {id} = req.query;
  console.log('Endpoint /getDiscordID hit, LongId: ');
  console.log(id);
  let query = {
      longId: id,
    };
  let profile = await MemberSchemav2.findOne(query);
  
  res.json(profile);
});


// Define the /clanlb endpoint
app.get('/clanlb', async (req, res) => {
  console.log('Endpoint /clanlb hit');
  const leaderboard = await KirkaJS.getClanLeaderboard();
  if(leaderboard.results == null)
      profile = JSON.stringify({error: 'Api Error', response: leaderboard});
  //read from lb.json
  let data = fs.readFileSync('lb.json');
  let leaderboardJson = JSON.parse(data);
  for(let member of leaderboard.results){
    //add a property to member called score diffrence
    if(leaderboardJson.results.find(x => x.clanId === member.clanId) == null){
      member.scoreDiff = 0;
      continue;
    }
    member.scoreDiff = member.scores - leaderboardJson.results.find(x => x.clanId === member.clanId).scores;
  }
  let leaderboardJsonString = JSON.stringify(leaderboard);
  res.json(leaderboardJsonString);
});

//Define the /clan endpoitn
app.get('/clan', async (req, res) => {
  console.log('Endpoint /clan hit');
  const leaderboard = await KirkaJS.getClanLeaderboard();
  if(leaderboard.results == null)
      return res.json(JSON.stringify({error: 'Api Error', response: leaderboard}));
  let leaderboardJsonString = JSON.stringify(leaderboard);
  res.json(leaderboardJsonString);
});


app.get('/playerlb', async (req, res) => {
  console.log('Endpoint /playerlb hit');
  let allList = await MemberSchema.find().exec();
  let { summedArray } = sortAndSumScores(allList);
  //get first 100 elements
  let cutArray = summedArray.slice(0, 100);
  let leaderboard = {results:cutArray};
  let leaderboardJsonString = JSON.stringify(leaderboard);
  //console.log(cutArray[0]._doc);
  res.json(leaderboardJsonString);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});


function sortAndSumScores(arr) {
  // Create a map to store the sum of scores and all objects for each longId
  const scoreMap = new Map();

  // Sum up the scores and collect all objects for each longId
  arr.forEach(obj => {
    if (scoreMap.has(obj.longId)) {
      const existing = scoreMap.get(obj.longId);
      existing.score += obj.score;
      existing.objects.push(obj);
    } else {
      scoreMap.set(obj.longId, { score: obj.score, objects: [obj] });
    }
  });

  // Convert the map back to an array of objects
  const summedArray = Array.from(scoreMap, ([longId, data]) => {
    // Merge all objects for this longId
    const mergedObj = Object.assign({}, ...data.objects);
    mergedObj.longId = longId;
    mergedObj.score = data.score;
    return mergedObj;
  });

  // Sort the array in descending order based on the score
  summedArray.sort((a, b) => b.score - a.score);

  return { summedArray };
}
