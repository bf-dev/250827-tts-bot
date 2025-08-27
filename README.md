# 🍄 버섯 (Mushroom) Discord Bot

Korean TTS Discord bot with bulk deletion and anti-spam features.

## Features

- **Text-to-Speech**: Reads messages from a specific text channel and converts them to speech in a voice channel using Google Cloud TTS
- **Voice Greetings**: Announces when users join or leave voice channels
- **Bulk Message Deletion**: Delete messages in bulk with support for up to 8,000 messages
- **Anti-Spam Protection**: Intelligent spam detection that prevents false positives
- **Admin Configuration**: Slash commands for configuring bot settings

## Setup Instructions

### Prerequisites

1. **Discord Bot Token**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot
   - Copy the bot token

2. **Google Cloud TTS Setup**
   - Create a Google Cloud project
   - Enable the Text-to-Speech API
   - Create a service account and download the JSON credentials file
   - Set up billing (required for TTS API)

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-credentials.json
   ```

3. **Bot Permissions**
   
   Invite your bot with these permissions:
   - Send Messages
   - Manage Messages
   - Connect (Voice)
   - Speak (Voice)
   - Use Slash Commands
   - Timeout Members

4. **Run the Bot**
   ```bash
   npm start
   ```

## Commands

### `/설정` (Settings) - Admin Only
- **tts채널**: Set the text channel for TTS reading
- **음성채널**: Set the voice channel for TTS playback
- **도배시간**: Configure spam timeout duration (1-60 minutes)
- **인사**: Enable/disable voice channel greetings

### `/삭제` (Delete) - Manage Messages Permission Required
- Delete messages in bulk (1-8000 messages)
- Optional time period filter (1d, 1h, etc.)

### `/상태` (Status)
- View current bot configuration

## Anti-Spam System

The bot uses intelligent spam detection that:
- Tracks message similarity using Levenshtein distance
- Avoids false positives on common expressions like "ㅋㅋㅋㅋㅋㅋㅋ"
- Configurable timeout duration
- Admin-only configuration

## TTS Features

- **Korean Voice Support**: Uses Google Cloud TTS Korean voices
- **Custom Audio**: Support for adding custom TTS files
- **Message Processing**: Handles mentions, channels, emojis, and links
- **Length Limit**: 200 character limit per message
- **Automatic Cleanup**: Temporary files deleted after 5 minutes

## File Structure

```
├── index.js           # Main bot file
├── lib/
│   ├── tts.js        # Google TTS integration
│   └── config.js     # Configuration management
├── audio/            # Temporary TTS files
├── config.json       # Bot settings (auto-generated)
└── package.json      # Dependencies
```

## Troubleshooting

- **TTS not working**: Check Google Cloud credentials and API billing
- **Slash commands not appearing**: Ensure bot has proper permissions
- **Voice connection issues**: Verify ffmpeg installation and voice permissions
- **Message deletion limits**: Discord has rate limits for old messages (>14 days)

## Custom TTS Files

To add custom TTS files:
1. Place audio files in the `audio/custom/` directory
2. Use the configuration system to map text to audio files
3. Files will be played instead of Google TTS for matching text

## Support

For issues or questions, check the configuration with `/상태` command and verify all permissions are properly set.