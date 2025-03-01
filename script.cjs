const express = require("express");
const mongoose = require("mongoose");
const KirkaModule = require("kirkajs");
require("dotenv").config(); // Load environment variables from .env file
const KirkaJS = new KirkaModule();
const MemberSchema = require("./dailylb.cjs");
const fs = require("fs");
const MemberSchemav2 = require("./ClanMember Febuary");
const RenderDB = require("./renderdb.cjs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: ["https://zenos-hub.vercel.app", "http://localhost:7000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

let weeklyLeaderboard = [];
async function cacheWeeklyLeaderboard() {
  try{
  let weeklyLeaderboard2 = [];
  let startTime = Date.now();
  let query = await RenderDB.findOne({ id: "1" });
  if (query == null) {
    console.log("No saved leaderboard found");
    return;
  }
  // console.log("Caching weekly leaderboard");
  // console.log("Query: " + query);
  let savedLb = query.clanlb;
  savedLb = JSON.parse(savedLb);
  let index = 0;
  let currentLb = await getClanLeaderboard();
  console.log("currentLb: " + JSON.stringify(currentLb))
  for (let clan of currentLb.results) {
    // console.log("Caching clan: " + clan);
    index++;
    for (let member of clan.data.members) {
      let oldMember = findMemberInClan(savedLb, member.user.id);
      let obj = {};
      if (oldMember == null) {
        if (index <= 25) {
          obj.name = member.user.name;
          obj.longId = member.user.id;
          obj.score = member.allScores;
          obj.clan = clan.name;
          weeklyLeaderboard2.push(obj);
        }
      } else {
        obj.name = oldMember.user.name;
        obj.longId = oldMember.user.id;
        obj.score = member.allScores - oldMember.allScores;
        obj.clan = clan.name;
        weeklyLeaderboard2.push(obj);
      }
    }
  }
  //sort weekly lb based on score
  weeklyLeaderboard2.sort((a, b) => b.score - a.score);
  //get first 100 elements
  weeklyLeaderboard = weeklyLeaderboard2.slice(0, 100);
  console.log("Caching completed in " + (Date.now() - startTime) + "ms");

  let timestamp = savedLb.timestamp;
  let resetTime = timeUntilNextRun(timestamp);
  if (resetTime <= 0) {
    console.log("Resetting weekly leaderboard");
    await saveClanLeaderboard();
  }
  }
  catch(e){
    return console.error("Error: " +  e);
  }
}

function findMemberInClan(savedLb, longId) {
  for (let clan of savedLb.results) {
    let member = clan.data.members.find((x) => x.user.id === longId);
    if (member != null) return member;
  }
  return null;
}

// Define the initialize function
async function initialize() {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

app.get("/test", async (req, res) => {
  console.log("Endpoint /test hit");
  let leaderboardJson;
  let leaderboard;
  leaderboardJson = JSON.stringify({ Test: "pog" });
  res.json(leaderboardJson);
});

app.get("/savedlb", async (req, res) => {
  console.log("Endpoint /savedlb hit");
  let query = await RenderDB.findOne({ id: "1" });
  if (query == null) {
    console.log("No saved leaderboard found");
    return res.json(JSON.stringify({ error: "No saved leaderboard found" }));
  }
  let savedLb = query.clanlb;
  savedLb = JSON.parse(savedLb);
  res.json(savedLb);
});

app.get("/weeklylb", async (req, res) => {
  console.log("Endpoint /weeklylb hit");
  let query = await RenderDB.findOne({ id: "1" });
  if (query == null) {
    console.log("No saved leaderboard found");
    return res.json(JSON.stringify({ error: "No saved leaderboard found" }));
  }
  let savedLb = query.clanlb;
  savedLb = JSON.parse(savedLb);
  let timestamp = savedLb.timestamp;
  let resetTime = timeUntilNextRun(timestamp);
  res.json(
    JSON.stringify({ results: weeklyLeaderboard, resetTime: resetTime })
  );
});

async function saveClanLeaderboard() {
  let leaderboard = await getClanLeaderboard();
  leaderboard.timestamp = Date.now();
  let json = JSON.stringify(leaderboard);
  let query = await RenderDB.findOne({ id: "1" });
  if (query == null) {
    query = new RenderDB({
      id: "1",
      clanlb: json,
    });
    await query.save();
  } else {
    await RenderDB.updateOne({ id: "1" }, { clanlb: json });
  }
  console.log("Clan Leaderboard saved");
  await cacheWeeklyLeaderboard();
}

async function getClanLeaderboard() {
  let leaderboard = await KirkaJS.getClanLeaderboard();
  for (let member of leaderboard.results) {
    let clan = await KirkaJS.getClan(member.name);
    //wait 1 seconds
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (clan.reason || clan.error) {
      console.log("Error: " + (clan.reason || clan.error) + "for clan: " + member.name);
      continue;
    }
    member.data = clan;
  }
  return leaderboard;
}

async function autoUpdate() {
  let test = await KirkaJS.getSoloLeaderboard();
  if (test.remainingTime == null) return;
  if (test.remainingTime <= 1800000 / 2) {
    let leaderboard = await KirkaJS.getClanLeaderboard();
    //convert leaderboard to json and write to lb.json
    let json = JSON.stringify(leaderboard);
    let query = await RenderDB.findOne({ id: "1" });
    if (query == null) {
      query = new RenderDB({
        id: "1",
        lb: json,
      });
      await query.save();
    } else {
      await RenderDB.updateOne({ id: "1" }, { lb: json });
    }
    console.log("Leaderboard updated");
  }
  //console.log(leaderboard);
}

async function pingTestEndpoint() {
  try {
    const response = await fetch("https://backend-api-2l08.onrender.com/test");
  } catch (error) {
    console.error("Error pinging test endpoint:", error.message);
  }
}

initialize();
autoUpdate();
pingTestEndpoint();
cacheWeeklyLeaderboard();
const interval2 = setInterval(autoUpdate, 5 * 60 * 1000); // 5 minutes in milliseconds
const testPingInterval = setInterval(pingTestEndpoint, 5 * 60 * 1000);
const cacheWeeklyLbInterval = setInterval(
  cacheWeeklyLeaderboard,
  15 * 60 * 1000
);

function timeUntilNextRun(lastExecution) {
  let intervalTime = 7 * 24 * 60 * 60 * 1000; // 7 days
  return Math.max(0, intervalTime - (Date.now() - lastExecution));
}

// Define the /dailylb endpoint
app.get("/dailylb", async (req, res) => {
  const { date } = req.query;
  console.log(date);
  console.log("Endpoint /dailylb hit");
  let leaderboardJson;
  let leaderboard;
  if (date === "current") {
    leaderboard = await KirkaJS.getSoloLeaderboard();
    leaderboardJson = JSON.stringify(leaderboard);
  } else {
    let list = await MemberSchema.find({ date }).exec();
    if (list.length === 0) {
      leaderboardJson = JSON.stringify({
        error: "No data found for this date",
        response: list,
      });
    } else {
      leaderboard = { results: [] };
      for (let member of list) {
        let user = await KirkaJS.getStatsLongID(member.longId);
        leaderboard.results.push({
          rank: member.rank,
          name: user.name,
          scores: member.score,
          userId: member.longId,
        });
      }
      leaderboardJson = JSON.stringify(leaderboard);
    }
  }
  res.json(leaderboardJson);
});

app.get("/pv", async (req, res) => {
  const { id } = req.query;
  console.log("Endpoint /pv hit");
  let profile = await KirkaJS.getStatsLongID(id);
  if (profile.id == null)
    profile = JSON.stringify({ error: "Api Error", response: profile });
  else profile = JSON.stringify(profile);

  res.json(profile);
});

app.get("/pvCheck", async (req, res) => {
  const { id } = req.query;
  console.log("Endpoint /pvCheck hit");
  console.log(id);
  let profile = await KirkaJS.getStats(id);
  if (profile.id == null)
    profile = JSON.stringify({ error: "Api Error", response: profile });
  else profile = JSON.stringify(profile);

  res.json(profile);
});

app.get("/getDiscordID", async (req, res) => {
  const { id } = req.query;
  console.log("Endpoint /getDiscordID hit, LongId: ");
  console.log(id);
  let query = {
    longId: id,
  };
  let profile = await MemberSchemav2.findOne(query);

  res.json(profile);
});

// Define the /clanlb endpoint
app.get("/clanlb", async (req, res) => {
  console.log("Endpoint /clanlb hit");
  const leaderboard = await KirkaJS.getClanLeaderboard();
  if (leaderboard.results == null)
    profile = JSON.stringify({ error: "Api Error", response: leaderboard });
  //read from lb.json
  let query = await RenderDB.findOne({ id: "1" });
  if (query == null) {
    console.log("No saved leaderboard found");
    return res.json(JSON.stringify({ error: "No saved leaderboard found" }));
  }
  let data = query.lb;
  let leaderboardJson = JSON.parse(data);
  for (let member of leaderboard.results) {
    //add a property to member called score diffrence
    if (
      leaderboardJson.results.find((x) => x.clanId === member.clanId) == null
    ) {
      member.scoreDiff = 0;
      continue;
    }
    member.scoreDiff =
      member.scores -
      leaderboardJson.results.find((x) => x.clanId === member.clanId).scores;
  }
  let leaderboardJsonString = JSON.stringify(leaderboard);
  res.json(leaderboardJsonString);
});

//Define the /clan endpoitn
app.get("/clan", async (req, res) => {
  console.log("Endpoint /clan hit");
  const leaderboard = await KirkaJS.getClanLeaderboard();
  if (leaderboard.results == null)
    return res.json(
      JSON.stringify({ error: "Api Error", response: leaderboard })
    );
  let leaderboardJsonString = JSON.stringify(leaderboard);
  res.json(leaderboardJsonString);
});

app.get("/playerlb", async (req, res) => {
  console.log("Endpoint /playerlb hit");
  let allList = await MemberSchema.find().exec();
  let { summedArray } = sortAndSumScores(allList);
  //get first 100 elements
  let cutArray = summedArray.slice(0, 100);
  let leaderboard = { results: cutArray };
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
  arr.forEach((obj) => {
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
