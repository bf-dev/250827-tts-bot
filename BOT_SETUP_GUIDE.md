# Discord TTS Bot 설정 가이드

## 목차
1. [기본 설정](#기본-설정)
2. [봇 이름 및 이미지 변경](#봇-이름-및-이미지-변경)
3. [TTS 음성 추가 방법](#tts-음성-추가-방법)
4. [새로운 기능 사용법](#새로운-기능-사용법)
5. [고급 설정](#고급-설정)

## 기본 설정

### 환경 변수 설정
`.env` 파일에 다음 변수들을 설정하세요:

```env
DISCORD_TOKEN=your_discord_bot_token
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-credentials.json
TTS_TEXT_CHANNEL_ID=optional_default_text_channel_id
TTS_VOICE_CHANNEL_ID=optional_default_voice_channel_id
```

### 초기 봇 설정
1. Discord에서 봇을 초대한 후, 관리자 권한을 가진 사용자가 다음 명령어를 사용하여 설정합니다:
   - `/설정 tts채널 #채널이름` - TTS를 읽을 텍스트 채널 설정
   - `/설정 음성채널 #음성채널이름` - TTS를 재생할 음성 채널 설정

## 봇 이름 및 이미지 변경

### Discord Developer Portal에서 변경
1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. 해당 봇 애플리케이션 선택
3. **General Information** 탭에서:
   - **Name**: 봇 이름 변경
   - **App Icon**: 봇 이미지 변경 (512x512 픽셀 권장)
4. 변경 후 **Save Changes** 클릭

### 봇 코드에서 표시되는 이름 변경
`index.js` 파일의 다음 부분을 수정:

```javascript
// 921번째 줄 근처, 상태 명령어의 제목 변경
.setTitle('🍄 버섯 봇 설정 상태')
```

위 부분을 원하는 봇 이름으로 변경하세요:
```javascript
.setTitle('🤖 내 봇 이름 설정 상태')
```

## TTS 음성 추가 방법

### Google Cloud TTS 음성 추가
1. **Google Cloud Console** 접속
2. **Text-to-Speech API** 페이지로 이동
3. 사용 가능한 한국어 음성 목록 확인

### 코드에 새 음성 추가
`index.js` 파일에서 다음 부분들을 수정:

#### 1. 슬래시 명령어에 음성 선택지 추가 (87-98번째 줄 근처):
```javascript
.addChoices(
  { name: 'Neural2-A (여성, 자연스러움)', value: 'ko-KR-Neural2-A' },
  { name: 'Neural2-B (남성, 자연스러움)', value: 'ko-KR-Neural2-B' },
  { name: 'Neural2-C (여성, 자연스러움)', value: 'ko-KR-Neural2-C' },
  { name: 'Wavenet-A (여성, 고품질)', value: 'ko-KR-Wavenet-A' },
  { name: 'Wavenet-B (남성, 고품질)', value: 'ko-KR-Wavenet-B' },
  { name: 'Wavenet-C (여성, 고품질)', value: 'ko-KR-Wavenet-C' },
  { name: 'Wavenet-D (남성, 고품질)', value: 'ko-KR-Wavenet-D' },
  // 여기에 새로운 음성 추가
  { name: '새로운 음성 (설명)', value: 'ko-KR-NewVoice-Name' }
)
```

#### 2. 개인목소리 명령어에도 동일하게 추가 (127-136번째 줄 근처)

#### 3. 음성 이름 매핑에 추가 (여러 위치에 있는 voiceNames 객체들):
```javascript
const voiceNames = {
  'ko-KR-Neural2-A': 'Neural2-A (여성, 자연스러움)',
  'ko-KR-Neural2-B': 'Neural2-B (남성, 자연스러움)',
  // ... 기존 음성들
  'ko-KR-NewVoice-Name': '새로운 음성 (설명)'
};
```

### 현재 설정된 고품질 음성들
- **Neural2 시리즈** (자연스러운 음성):
  - Neural2-A: 여성, 자연스러운 톤
  - Neural2-B: 남성, 자연스러운 톤  
  - Neural2-C: 여성, 자연스러운 톤

- **Wavenet 시리즈** (고품질 음성):
  - Wavenet-A: 여성, 고품질 합성
  - Wavenet-B: 남성, 고품질 합성
  - Wavenet-C: 여성, 고품질 합성
  - Wavenet-D: 남성, 고품질 합성

## 새로운 기능 사용법

### 1. TTS 무시 기능
- **코드블록 무시**: ` ``` ` 로 감싼 코드나 ` ` `으로 감싼 인라인 코드, `||스포일러||` 텍스트를 TTS에서 제외
- **이모지 무시**: 🔇, 🤫, 🚫 이모지가 포함된 메시지는 TTS에서 제외
- **설정 명령어**: `/설정 tts옵션`

### 2. 개인별 TTS 목소리 설정
- **설정**: `/설정 개인목소리 @사용자 음성선택`
- **초기화**: `/설정 개인목소리 @사용자 기본설정으로되돌리기`

### 3. 향상된 일괄 삭제
- **기본 삭제**: `/삭제 개수:100`
- **특정 사용자**: `/삭제 개수:50 사용자:@사용자명`
- **시간 범위**: `/삭제 개수:100 기간:1h`
- **메시지 범위**: `/삭제 개수:100 시작메시지:메시지ID 끝메시지:메시지ID`

### 4. 고급 도배 감지
- **텍스트 도배**: 유사한 메시지 반복 감지 (기본값: 30개)
- **이미지 도배**: 첨부파일 연속 업로드 감지 (기본값: 30개)
- **경고 채널**: 도배 감지시 관리자 채널에 알림 발송
- **설정 명령어**: 
  - `/설정 도배설정` - 현재 설정 확인
  - `/설정 도배설정 텍스트임계값:25 이미지임계값:20` - 임계값 변경
  - `/설정 경고채널 #관리자채널` - 경고 채널 설정

### 5. TTS 표시 옵션
- **사용자명 표시/숨김**: `/설정 tts옵션 사용자명표시켜기` 또는 `사용자명표시끄기`
- **목소리 타입 표시**: `/설정 tts옵션 목소리타입표시켜기` 또는 `목소리타입표시끄기`

## 고급 설정

### config.json 직접 편집
```json
{
  "ttsTextChannelId": "채널ID",
  "ttsVoiceChannelId": "채널ID", 
  "ttsVoice": "ko-KR-Neural2-A",
  "spamTimeout": 5,
  "spamThreshold": 3,
  "spamTimeWindow": 10,
  "greetingsEnabled": true,
  "adminRoles": [],
  "customTTSFiles": {},
  "ttsIgnoreCodeBlocks": true,
  "ttsIgnoreEmojis": ["🔇", "🤫", "🚫"],
  "ttsShowVoiceType": true,
  "ttsShowUsername": true,
  "userTTSVoices": {},
  "spamWarningChannelId": "채널ID",
  "imageSpamThreshold": 30,
  "textSpamThreshold": 30
}
```

### 무시할 이모지 추가/변경
config.json에서 `ttsIgnoreEmojis` 배열을 수정하여 추가할 수 있습니다:
```json
"ttsIgnoreEmojis": ["🔇", "🤫", "🚫", "🤐", "🙊"]
```

### 봇 실행
```bash
# 직접 실행
node index.js

# PM2로 실행 (권장)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

### 문제 해결
1. **TTS가 작동하지 않는 경우**:
   - Google Cloud 인증서 파일 경로 확인
   - Text-to-Speech API 활성화 확인
   - 권한 설정 확인

2. **명령어가 보이지 않는 경우**:
   - 봇이 해당 서버에 올바르게 초대되었는지 확인
   - 봇에 슬래시 명령어 권한이 있는지 확인

3. **도배 감지가 너무 민감한 경우**:
   - `/설정 도배설정`으로 임계값 조정
   - 시간창 설정 조정

## 추가 도움말
- `/상태` 명령어로 현재 봇 설정 상태 확인 가능
- 모든 설정 변경은 실시간으로 적용됨
- 설정은 `config.json` 파일에 자동 저장됨