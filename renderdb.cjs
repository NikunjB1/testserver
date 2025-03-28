const { Schema, model } = require("mongoose");

const RenderDB = new Schema({
  id: {
    type: String,
    required: true,
  },
  clanlb: {
    type: String,
    default: "",
  },
  monthlylb: {
    type: String,
    default: "",
  },
  lb: {
    type: String,
    default: "",
  },
});

module.exports = model("RenderDB2", RenderDB);
