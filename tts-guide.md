# Text-to-Speech (TTS) Implementation Guide

## Overview

This Discord music bot implements Text-to-Speech functionality using Google Cloud's Text-to-Speech API to generate audio files and play them through Discord voice connections. The TTS system converts text into Korean audio files that are played alongside music playback.

## Architecture

### Core Components

1. **TTS Generator (`lib/tts.js`)** - Handles Google TTS API integration and file generation
2. **Audio Player (`lib/player.js`)** - Manages Discord audio playback and TTS announcements

## Technical Implementation

### 1. Google TTS API Integration

#### Dependencies
```json
{
  "@google-cloud/text-to-speech": "^6.1.0"
}
```

#### Authentication Setup
The bot uses Google Cloud service account authentication through environment variables:

```javascript
// lib/tts.js:14-23
if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS 경로가 유효하지 않거나 설정되지 않았습니다.',
  );
}
ttsClient = new TextToSpeechClient();
```

**Environment Variable Required:**
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account JSON file

#### TTS Generation Process

The `generateTTS()` function in `lib/tts.js:33-69` handles the complete TTS pipeline:

```javascript
async function generateTTS(text) {
  if (!ttsEnabled) {
    console.log('TTS 클라이언트가 사용 불가능하여 TTS 생성을 건너뜁니다.');
    return null;
  }

  try {
    const request = {
      input: { text },
      voice: { languageCode: 'ko-KR', name: 'ko-KR-Standard-A' },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.1 },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const writeFileAsync = util.promisify(fs.writeFile);

    const filepath = path.join(audioDir, `tts-${Date.now()}.mp3`);
    await writeFileAsync(filepath, response.audioContent, 'binary');

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      fs.unlink(filepath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error(`임시 TTS 파일 ${filepath} 삭제 실패:`, err);
        }
      });
    }, 60 * 1000 * 5);

    return filepath;
  } catch (error) {
    console.error('TTS 오디오 합성 중 오류 발생:', error);
    return null;
  }
}
```

**Key Configuration:**
- **Language**: Korean (`ko-KR`)
- **Voice**: `ko-KR-Standard-A` (Korean female voice)
- **Format**: MP3 audio encoding
- **Speed**: 1.1x speaking rate for natural flow
- **Cleanup**: Automatic file deletion after 5 minutes

### 2. Discord Audio Integration

#### Voice Connection Setup
The `MusicPlayer` class in `lib/player.js:29-103` manages Discord voice connections using `@discordjs/voice`:

```javascript
// lib/player.js:61-72
this.connection = joinVoiceChannel({
  channelId: this.voiceChannel.id,
  guildId: this.guild.id,
  adapterCreator: this.guild.voiceAdapterCreator,
  selfDeaf: true,
});

this.connection.on(VoiceConnectionStatus.Ready, () => {
  this.connection.subscribe(this.audioPlayer);
});
```

#### TTS Announcement Playback

The `playAnnouncement()` method in `lib/player.js:423-459` handles TTS audio playback with music interruption:

```javascript
async playAnnouncement(filePath) {
  if (
    !this.connection ||
    this.connection.state.status !== VoiceConnectionStatus.Ready
  ) {
    return;
  }

  // Create separate audio player for announcements
  const announcementPlayer = createAudioPlayer();
  const announcementResource = createAudioResource(filePath);

  // Temporarily switch to announcement player
  this.connection.subscribe(announcementPlayer);
  announcementPlayer.play(announcementResource);

  try {
    // Wait for announcement to complete (max 15 seconds)
    await entersState(announcementPlayer, AudioPlayerStatus.Idle, 15_000);
  } catch (error) {
    console.error(`TTS 알림 실패 또는 시간 초과`, error);
  } finally {
    // Clean up and restore music player
    announcementPlayer.stop();
    this.connection.subscribe(this.audioPlayer);

    // Delete temporary TTS file
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`TTS 파일 삭제 오류 ${filePath}:`, err);
      }
    });
  }
}
```

**Audio Management:**
- **Dual Player System**: Separate audio players for music and TTS announcements
- **Non-blocking**: TTS plays without stopping music permanently
- **Timeout Protection**: 15-second timeout prevents hanging
- **Resource Cleanup**: Automatic file deletion after playback

### 3. Using the TTS System

To generate and play TTS audio, you can use the system as follows:

```javascript
const { generateTTS } = require('./lib/tts');

// Generate TTS audio file
const audioFilePath = await generateTTS('안녕하세요');

// Play the audio through Discord
if (audioFilePath && player) {
  await player.playAnnouncement(audioFilePath);
}
```

## Data Flow

### TTS Audio Generation and Playback Pipeline

1. **Text Input**: Receive text string to convert to speech
2. **TTS API Call**: `generateTTS()` sends request to Google TTS API
3. **Audio Synthesis**: Google TTS generates MP3 audio data
4. **File Creation**: Save MP3 audio to temporary file in `audio/` directory
5. **Discord Playback**: `playAnnouncement()` creates audio resource and plays via Discord
6. **Cleanup**: Delete temporary file after playback completion

### Audio Player Architecture

```
Text → Google TTS API → MP3 File → Discord Audio Resource → Voice Connection
  ↓         ↓             ↓              ↓                      ↓
Input   Audio Synthesis  Temp Storage   Audio Player        Discord Voice
String     (Korean)      (5min TTL)    (Isolated)           Channel
```

## Error Handling

### Graceful Degradation
- **Missing Credentials**: TTS disabled, bot continues functioning
- **API Failures**: Individual TTS requests fail silently
- **Network Issues**: Timeout protection prevents hanging
- **File System Errors**: Cleanup failures logged but don't crash bot

### Monitoring & Logging
```javascript
// lib/tts.js:25-30
try {
  ttsClient = new TextToSpeechClient();
  console.log('Google Cloud TTS 클라이언트가 성공적으로 초기화되었습니다.');
} catch (error) {
  console.warn(`[TTS 경고] Google TTS 클라이언트를 초기화할 수 없습니다: ${error.message}`);
  console.warn('[TTS 경고] TTS 기능이 비활성화됩니다.');
  ttsEnabled = false;
}
```

## Performance Considerations

### File Management
- **Temporary Storage**: Files stored in `audio/` directory
- **Auto-cleanup**: 5-minute automatic deletion via `setTimeout`
- **Unique Naming**: Timestamp-based filenames prevent conflicts

### Audio Quality vs Performance
- **MP3 Encoding**: Balanced quality/size for Discord transmission
- **Speaking Rate**: 1.1x for natural Korean pronunciation
- **Korean Voice**: Native speaker model for clarity

### Resource Usage
- **Separate Players**: Prevents music interruption
- **Timeout Limits**: 15-second maximum for TTS playback
- **Queue Management**: Config write operations queued to prevent corruption

## Setup Requirements

### Google Cloud Prerequisites
1. **Google Cloud Project** with Text-to-Speech API enabled
2. **Service Account** with Text-to-Speech API permissions
3. **Credentials JSON** file downloaded locally
4. **Environment Variable**: `GOOGLE_APPLICATION_CREDENTIALS` pointing to credentials file

### Discord Permissions
- **Connect** to voice channels
- **Speak** in voice channels
- **Use Voice Activity** for audio transmission

### Basic Implementation Example

```javascript
const { generateTTS } = require('./lib/tts');
const { createAudioResource, createAudioPlayer } = require('@discordjs/voice');

// Generate TTS file
async function createTTSAudio(text) {
  const filePath = await generateTTS(text);
  if (!filePath) {
    console.error('Failed to generate TTS audio');
    return null;
  }
  return filePath;
}

// Play TTS through Discord
async function playTTSAudio(connection, filePath) {
  const player = createAudioPlayer();
  const resource = createAudioResource(filePath);
  
  connection.subscribe(player);
  player.play(resource);
  
  // Wait for completion
  await new Promise(resolve => {
    player.on('idle', resolve);
  });
  
  // Cleanup
  fs.unlink(filePath, () => {});
}
```

This implementation provides a robust TTS system that converts text to Korean speech and plays it through Discord voice connections while maintaining performance and reliability.