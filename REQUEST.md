# Discord Bot Request

## Bot Name
"버섯" (Mushroom)

## Core Features

### 1. Text-to-Speech (TTS) Function
- Read messages from a specific text channel
- Convert text to speech in a specific voice channel
- Use Google Cloud TTS with Korean voices (30 available voices)
- Support for custom TTS files (client will record and add their own audio files)

### 2. Voice Channel Management
- Greet users when they join or leave voice channels
- Announce arrivals and departures

### 3. Bulk Message Deletion
- Delete messages in bulk by specifying a range (similar to "마늘이" chatbot functionality)
- Support deletion by date range (typically daily batches)
- Handle up to 8,000 messages per operation
- No concern about processing time due to Discord API limitations

### 4. Anti-Spam Protection
- Detect and prevent spam messages (repetitive/similar content)
- Avoid false positives on legitimate messages like "ㅋㅋㅋㅋㅋㅋㅋ" or high chat frequency
- Focus specifically on actual spam patterns
- Admin-configurable timeout duration using "/" slash commands
- Admin-only configuration access

## Technical Requirements
- No database storage needed
- 2-3 day development timeline with testing phase
- Modification period after initial testing for adjustments

## Budget
100,000 KRW (paid via secure payment system)