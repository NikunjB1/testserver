const {Schema, model} = require('mongoose');

const DailyLB = new Schema({
    name: {
        type: String,
        required: true,
    },
    longId: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        default: 0,
    },
    date: {
        type: String,
        required: true,
    },
    rank: {
        type: Number,
        default: 0,
    },
});

module.exports = model('Daily Leaderboard2', DailyLB);