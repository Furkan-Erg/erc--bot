const musicManager = require('../music/musicManager');

module.exports = {
  name: 'voiceStateUpdate',
  execute(oldState, newState) {
    const guild = newState.guild ?? oldState.guild;
    musicManager.checkEmptyChannel(guild);
  },
};
