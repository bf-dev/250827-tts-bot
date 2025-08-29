const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

const defaultConfig = {
  ttsTextChannelId: process.env.TTS_TEXT_CHANNEL_ID || null,
  ttsVoiceChannelId: process.env.TTS_VOICE_CHANNEL_ID || null,
  ttsVoice: 'ko-KR-Neural2-B',
  spamTimeout: 5,
  spamThreshold: 3,
  spamTimeWindow: 10,
  greetingsEnabled: true,
  adminRoles: [],
  customTTSFiles: {},
  ttsIgnoreCodeBlocks: true,
  ttsIgnoreEmojis: ['🔇', '🤫', '🚫'],
  ttsShowVoiceType: true,
  ttsShowUsername: true,
  userTTSVoices: {},
  spamWarningChannelId: null,
  imageSpamThreshold: 30,
  textSpamThreshold: 30
};

let config = { ...defaultConfig };

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      const loadedConfig = JSON.parse(data);
      config = { ...defaultConfig, ...loadedConfig };
      console.log('설정 파일이 로드되었습니다.');
    } else {
      console.log('설정 파일이 없습니다. 기본 설정을 사용합니다.');
      saveConfig();
    }
  } catch (error) {
    console.error('설정 파일 로드 중 오류:', error);
    config = { ...defaultConfig };
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('설정 파일이 저장되었습니다.');
  } catch (error) {
    console.error('설정 파일 저장 중 오류:', error);
  }
}

function getConfig() {
  return config;
}

function updateConfig(key, value) {
  config[key] = value;
  saveConfig();
}

function isAdmin(member) {
  if (member.permissions.has('Administrator')) return true;
  if (config.adminRoles.length === 0) return false;
  return member.roles.cache.some(role => config.adminRoles.includes(role.id));
}

loadConfig();

module.exports = {
  getConfig,
  updateConfig,
  isAdmin,
  loadConfig,
  saveConfig
};