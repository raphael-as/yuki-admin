const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const randomNumberSchema = new Schema({
  value: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('RandomNumber', randomNumberSchema);
