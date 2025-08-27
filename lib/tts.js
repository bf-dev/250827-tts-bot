const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');

const audioDir = path.join(__dirname, '..', 'audio');

let ttsClient;
let ttsEnabled = true;

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
) {
  console.warn('[TTS 경고] Google TTS 클라이언트를 초기화할 수 없습니다: GOOGLE_APPLICATION_CREDENTIALS가 설정되지 않았거나 파일이 존재하지 않습니다.');
  console.warn('[TTS 경고] TTS 기능이 비활성화됩니다.');
  ttsEnabled = false;
} else {
  try {
    ttsClient = new TextToSpeechClient();
    console.log('Google Cloud TTS 클라이언트가 성공적으로 초기화되었습니다.');
  } catch (error) {
    console.warn(`[TTS 경고] Google TTS 클라이언트를 초기화할 수 없습니다: ${error.message}`);
    console.warn('[TTS 경고] TTS 기능이 비활성화됩니다.');
    ttsEnabled = false;
  }
}

async function generateTTS(text, voice = null) {
  if (!ttsEnabled) {
    console.log('TTS 클라이언트가 사용 불가능하여 TTS 생성을 건너뜁니다.');
    return null;
  }

  
  if (!voice) {
    const { getConfig } = require('./config');
    const config = getConfig();
    voice = config.ttsVoice || 'ko-KR-Standard-A';
  }

  try {
    const request = {
      input: { text },
      voice: { languageCode: 'ko-KR', name: voice },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.1 },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    const writeFileAsync = util.promisify(fs.writeFile);

    const filepath = path.join(audioDir, `tts-${Date.now()}.mp3`);
    await writeFileAsync(filepath, response.audioContent, 'binary');

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

function playCustomTTS(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`커스텀 TTS 파일을 찾을 수 없습니다: ${filePath}`);
    return null;
  }
  return filePath;
}

module.exports = {
  generateTTS,
  playCustomTTS,
  ttsEnabled
};