const EventLog = require('../models/Eventlog');

const logEvent = async (eventType, details) => {
  try {
    const eventLog = new EventLog({ eventType, details });
    console.log(eventLog)
    await eventLog.save();
  } catch (err) {
    console.error('Error logging event:', err);
  }
};

module.exports = logEvent;