'use strict';

var outputHandlers = require('./src/output-handlers');
exports.getOutputHandlers = outputHandlers.get;
exports.setOutputHandlers = outputHandlers.set;
exports.addOutputHandler = outputHandlers.add;

var uuid = 1;
var activities = Object.create(null);
var enabled = true;

// Disable writing to outputHandlers.
exports.disable = function disable() {
  enabled = false;
};

// Enable writing to outputHandlers.
exports.enable = function enable() {
  enabled = true;
};

var activityEvents = {
  start: function(activity) {
    return activity.message;
  },

  end: function(activity) {
    var firstTime = activity.timestamps[0];
    var lastTime = activity.timestamps[activity.timestamps.length - 1];
    return activity.message + ' (' + (lastTime - firstTime) + 'ms)';
  }
};

exports.setStartFormatter = function setStartFormatter(formatter) {
  activityEvents['start'] = formatter;
};

exports.setEndFormatter = function setEndFormatter(formatter) {
  activityEvents['end'] = formatter;
};

/**
 * The Activity object.
 * @typedef {{
 *   id: number,
 *   message: string,
 *   timestamps: Array.<number>
 * }} Activity
 */

/**
 * Get an Activity object if it exists. Throws if it doesn't exist.
 * @param {number} activityId Activity id.
 * @return {Activity}
 */
function getActivity(activityId) {
  var activity = activities[activityId];

  if (activity === undefined) {
    throw new Error('activity with id "' + activityId + '" not found.');
  }

  return activity;
}

/**
 * Outputs the activity message to all defined handlers.
 * @param {Function} template Template to use to format the message.
 * @param {Activity} activity Activity object.
 */
function writeActivity(template, activity) {
  if (!enabled) {
    return;
  }

  var handlers = outputHandlers.get();

  if (handlers.length === 0) {
    throw new Error('No output handlers defined.');
  }

  handlers.forEach(function(handler) {
    handler(template(activity));
  });
}

/**
 * Create a new Activity object with its own unique ID. Does not start the
 * activity.
 * @param {string} activityMessage The activity message to use.
 * @return {number} Activity ID.
 */
function createActivity(activityMessage) {
  if (activityMessage === undefined ||
      activityMessage === undefined ||
      typeof activityMessage !== 'string') {
    throw new Error('Creating a new activity requires an activity message.');
  }

  var activityId = uuid++;
  var activity = {
    id: activityId,
    message: activityMessage,
    timestamps: []
  };

  activities[activityId] = activity;

  return activityId;
}
exports.create = createActivity;

/**
 * Mark a timestamp in an activity. Adds it to the array of timestamps.
 * @param {number} activityId Activity ID.
 * @return {number} The timestamp value added.
 */
function markActivity(activityId) {
  var activity = getActivity(activityId);
  var timeNow = Date.now();
  activity.timestamps.push(timeNow);
  return timeNow;
}
exports.mark = markActivity;

/**
 * Removes Activity from our store of activities.
 * @param {number} activityId Activity ID.
 * @return {Activity} Destroyed Activity object.
 */
function destroyActivity(activityId) {
  var activity = getActivity(activityId);
  delete activities[activityId];
  return activity;
}
exports.destroy = destroyActivity;

/**
 * Create and start a new activity.
 * @param {string} activityMessage Message to use for activity.
 * @return {number} Activity id.
 */
function startActivity(activityMessage) {
  var activityId = createActivity(activityMessage);

  markActivity(activityId);

  var activity = getActivity(activityId);
  writeActivity(activityEvents.start, activity);

  return activityId;
}
exports.start = startActivity;

/**
 * End an activity. Log the time, write output, and then delete activity.
 * @param {number} activityId Activity ID.
 * @return {Activity} Return the ended activity.
 */
function endActivity(activityId) {
  markActivity(activityId);

  var activity = destroyActivity(activityId)

  writeActivity(activityEvents.end, activity);

  return activity;
}
exports.end = endActivity;
