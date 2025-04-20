const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // e.g., "VIDEO_FETCH", "COMMENT_ADD", etc.
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EventLog', eventLogSchema);