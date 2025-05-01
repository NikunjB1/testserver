const { Schema, model } = require("mongoose");

const May2025MemberSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  kirkaId: {
    type: String,
    required: true,
  },
  longId: {
    type: String,
    required: true,
  },
  discord: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    default: 0,
  },
  startScore: {
    type: Number,
    default: 0,
  },
  dailyStartScore: {
    type: Number,
    default: 0,
  },
  monthlyScore: {
    type: Number,
    default: 0,
  },
  alltimeScore: {
    type: Number,
    default: 0,
  },
  other: {
    type: Object,
    default: {},
  },
});

module.exports = model("May-2025-Member-List", May2025MemberSchema);
