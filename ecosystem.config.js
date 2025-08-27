module.exports = {
  apps: [{
    name: 'mushroom-tts-bot',
    script: 'index.js',
    cwd: '/home/bfdev/250827-tts-bot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      TTS_TEXT_CHANNEL_ID: process.env.TTS_TEXT_CHANNEL_ID,
      TTS_VOICE_CHANNEL_ID: process.env.TTS_VOICE_CHANNEL_ID
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};