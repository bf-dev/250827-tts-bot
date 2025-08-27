const { 
  Client, 
  GatewayIntentBits, 
  Collection, 
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

const { generateTTS, playCustomTTS } = require('./lib/tts');
const { getConfig, updateConfig, isAdmin } = require('./lib/config');

require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

let voiceConnection = null;
let audioPlayer = null;

const spamTracker = new Map();

const commands = [
  new SlashCommandBuilder()
    .setName('설정')
    .setDescription('봇 설정을 관리합니다')
    .addSubcommand(subcommand =>
      subcommand
        .setName('tts채널')
        .setDescription('TTS 텍스트 채널을 설정합니다')
        .addChannelOption(option =>
          option.setName('채널')
            .setDescription('TTS를 읽을 텍스트 채널')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('음성채널')
        .setDescription('TTS 음성 채널을 설정합니다')
        .addChannelOption(option =>
          option.setName('채널')
            .setDescription('TTS를 재생할 음성 채널')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('도배시간')
        .setDescription('도배 시 타임아웃 시간을 설정합니다 (분)')
        .addIntegerOption(option =>
          option.setName('시간')
            .setDescription('타임아웃 시간 (분)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(60)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('인사')
        .setDescription('음성 채널 입장/퇴장 인사를 켜거나 끕니다')
        .addBooleanOption(option =>
          option.setName('활성화')
            .setDescription('인사 기능 활성화 여부')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('목소리')
        .setDescription('TTS 목소리를 변경합니다')
        .addStringOption(option =>
          option.setName('음성')
            .setDescription('사용할 TTS 음성을 선택하세요')
            .setRequired(true)
            .addChoices(
              { name: 'Standard-A (여성, 기본)', value: 'ko-KR-Standard-A' },
              { name: 'Standard-B (남성)', value: 'ko-KR-Standard-B' },
              { name: 'Standard-C (여성)', value: 'ko-KR-Standard-C' },
              { name: 'Standard-D (남성)', value: 'ko-KR-Standard-D' },
              { name: 'Neural2-A (여성, 자연스러움)', value: 'ko-KR-Neural2-A' },
              { name: 'Neural2-B (남성, 자연스러움)', value: 'ko-KR-Neural2-B' },
              { name: 'Neural2-C (여성, 자연스러움)', value: 'ko-KR-Neural2-C' },
              { name: 'Wavenet-A (여성, 고품질)', value: 'ko-KR-Wavenet-A' },
              { name: 'Wavenet-B (남성, 고품질)', value: 'ko-KR-Wavenet-B' },
              { name: 'Wavenet-C (여성, 고품질)', value: 'ko-KR-Wavenet-C' },
              { name: 'Wavenet-D (남성, 고품질)', value: 'ko-KR-Wavenet-D' }
            )))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  new SlashCommandBuilder()
    .setName('삭제')
    .setDescription('메시지를 일괄 삭제합니다')
    .addIntegerOption(option =>
      option.setName('개수')
        .setDescription('삭제할 메시지 개수 (1-8000)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(8000))
    .addStringOption(option =>
      option.setName('기간')
        .setDescription('삭제할 기간 (1d = 1일, 1h = 1시간)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  new SlashCommandBuilder()
    .setName('상태')
    .setDescription('봇의 현재 설정 상태를 확인합니다')
];

function checkSpam(userId, content) {
  const now = Date.now();
  const config = getConfig();
  
  if (!spamTracker.has(userId)) {
    spamTracker.set(userId, []);
  }
  
  const userMessages = spamTracker.get(userId);
  
  userMessages.push({ content, timestamp: now });
  
  const timeWindow = config.spamTimeWindow * 1000;
  const recentMessages = userMessages.filter(msg => now - msg.timestamp < timeWindow);
  spamTracker.set(userId, recentMessages);
  
  if (recentMessages.length < config.spamThreshold) {
    return false;
  }
  
  const uniqueMessages = new Set(recentMessages.map(msg => msg.content.toLowerCase().trim()));
  
  if (uniqueMessages.size === 1 && recentMessages.length >= config.spamThreshold) {
    return true;
  }
  
  const similarityThreshold = 0.8;
  for (let i = 0; i < recentMessages.length - 1; i++) {
    for (let j = i + 1; j < recentMessages.length; j++) {
      const similarity = calculateSimilarity(recentMessages[i].content, recentMessages[j].content);
      if (similarity >= similarityThreshold) {
        return true;
      }
    }
  }
  
  return false;
}

function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

async function ensureVoiceConnection() {
  const config = getConfig();
  
  if (!config.ttsVoiceChannelId) {
    console.log('음성 채널이 설정되지 않았습니다.');
    return false;
  }
  
  if (voiceConnection && voiceConnection.state.status === VoiceConnectionStatus.Ready) {
    return true;
  }
  
  try {
    const channel = client.channels.cache.get(config.ttsVoiceChannelId);
    if (!channel) {
      console.error('음성 채널을 찾을 수 없습니다:', config.ttsVoiceChannelId);
      return false;
    }
    
    if (voiceConnection) {
      voiceConnection.destroy();
    }
    
    voiceConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    
    audioPlayer = createAudioPlayer();
    voiceConnection.subscribe(audioPlayer);
    
    console.log(`음성 채널에 자동 연결되었습니다: ${channel.name}`);
    return true;
  } catch (error) {
    console.error('음성 채널 자동 연결 오류:', error);
    return false;
  }
}

async function playAnnouncement(filePath) {
  if (!(await ensureVoiceConnection())) {
    console.log('음성 연결을 설정할 수 없어 TTS를 재생하지 않습니다.');
    return;
  }
  
  const announcementPlayer = createAudioPlayer();
  const announcementResource = createAudioResource(filePath);
  
  voiceConnection.subscribe(announcementPlayer);
  announcementPlayer.play(announcementResource);
  
  try {
    await entersState(announcementPlayer, AudioPlayerStatus.Idle, 15_000);
  } catch (error) {
    console.error('TTS 알림 실패 또는 시간 초과:', error);
  } finally {
    announcementPlayer.stop();
    if (audioPlayer) {
      voiceConnection.subscribe(audioPlayer);
    }
    
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error(`TTS 파일 삭제 오류 ${filePath}:`, err);
      }
    });
  }
}

client.once('ready', async () => {
  console.log(`${client.user.tag}으로 로그인했습니다!`);
  
  try {
    console.log('슬래시 명령어를 등록하는 중...');
    await client.application?.commands.set(commands);
    console.log('슬래시 명령어 등록 완료!');
  } catch (error) {
    console.error('슬래시 명령어 등록 중 오류:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const config = getConfig();
  
  if (checkSpam(message.author.id, message.content)) {
    try {
      await message.delete();
      
      const timeoutDuration = config.spamTimeout * 60 * 1000;
      await message.member.timeout(timeoutDuration, '도배 감지');
      
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('도배 감지')
        .setDescription(`${message.author}님이 도배로 인해 ${config.spamTimeout}분간 타임아웃되었습니다.`)
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
      
      spamTracker.delete(message.author.id);
      
      console.log(`도배 감지: ${message.author.tag} - "${message.content}"`);
    } catch (error) {
      console.error('도배 처리 중 오류:', error);
    }
    return;
  }
  
  if (config.ttsTextChannelId && message.channel.id === config.ttsTextChannelId) {
    if (message.content.length > 200) {
      return;
    }
    
    const cleanContent = message.content
      .replace(/<@!?\d+>/g, '멘션')
      .replace(/<#\d+>/g, '채널')
      .replace(/<:\w+:\d+>/g, '이모지')
      .replace(/https?:\/\/[^\s]+/g, '링크')
      .trim();
    
    if (cleanContent.length === 0) return;
    
    try {
      const ttsText = `${message.author.displayName}님: ${cleanContent}`;
      const audioFilePath = await generateTTS(ttsText);
      
      if (audioFilePath) {
        await playAnnouncement(audioFilePath);
      }
    } catch (error) {
      console.error('TTS 처리 중 오류:', error);
    }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const config = getConfig();
  
  if (!config.greetingsEnabled || !config.ttsVoiceChannelId) return;
  
  const targetChannelId = config.ttsVoiceChannelId;
  
  if (newState.member?.user.bot) return;
  
  let greetingText = null;
  
  if (!oldState.channelId && newState.channelId === targetChannelId) {
    greetingText = `${newState.member.displayName}님이 들어오셨습니다.`;
  } else if (oldState.channelId === targetChannelId && !newState.channelId) {
    greetingText = `${oldState.member.displayName}님이 나가셨습니다.`;
  }
  
  if (greetingText) {
    try {
      const audioFilePath = await generateTTS(greetingText);
      if (audioFilePath) {
        await playAnnouncement(audioFilePath);
      }
    } catch (error) {
      console.error('인사 TTS 처리 중 오류:', error);
    }
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const config = getConfig();
  
  if (interaction.commandName === '설정') {
    if (!isAdmin(interaction.member)) {
      await interaction.reply({ content: '이 명령어는 관리자만 사용할 수 있습니다.', ephemeral: true });
      return;
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    switch (subcommand) {
      case 'tts채널':
        const textChannel = interaction.options.getChannel('채널');
        updateConfig('ttsTextChannelId', textChannel.id);
        await interaction.reply({ content: `TTS 텍스트 채널이 ${textChannel}로 설정되었습니다.`, ephemeral: true });
        break;
        
      case '음성채널':
        const voiceChannel = interaction.options.getChannel('채널');
        updateConfig('ttsVoiceChannelId', voiceChannel.id);
        
        try {
          if (voiceConnection) {
            voiceConnection.destroy();
          }
          
          voiceConnection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
          });
          
          audioPlayer = createAudioPlayer();
          voiceConnection.subscribe(audioPlayer);
          
          await interaction.reply({ content: `TTS 음성 채널이 ${voiceChannel}로 설정되고 연결되었습니다.`, ephemeral: true });
        } catch (error) {
          console.error('음성 채널 연결 오류:', error);
          await interaction.reply({ content: `음성 채널 설정 중 오류가 발생했습니다: ${error.message}`, ephemeral: true });
        }
        break;
        
      case '도배시간':
        const timeout = interaction.options.getInteger('시간');
        updateConfig('spamTimeout', timeout);
        await interaction.reply({ content: `도배 타임아웃 시간이 ${timeout}분으로 설정되었습니다.`, ephemeral: true });
        break;
        
      case '인사':
        const enabled = interaction.options.getBoolean('활성화');
        updateConfig('greetingsEnabled', enabled);
        await interaction.reply({ content: `음성 채널 인사 기능이 ${enabled ? '활성화' : '비활성화'}되었습니다.`, ephemeral: true });
        break;
        
      case '목소리':
        const selectedVoice = interaction.options.getString('음성');
        updateConfig('ttsVoice', selectedVoice);
        
        
        const voiceNames = {
          'ko-KR-Standard-A': 'Standard-A (여성, 기본)',
          'ko-KR-Standard-B': 'Standard-B (남성)', 
          'ko-KR-Standard-C': 'Standard-C (여성)',
          'ko-KR-Standard-D': 'Standard-D (남성)',
          'ko-KR-Neural2-A': 'Neural2-A (여성, 자연스러움)',
          'ko-KR-Neural2-B': 'Neural2-B (남성, 자연스러움)',
          'ko-KR-Neural2-C': 'Neural2-C (여성, 자연스러움)',
          'ko-KR-Wavenet-A': 'Wavenet-A (여성, 고품질)',
          'ko-KR-Wavenet-B': 'Wavenet-B (남성, 고품질)',
          'ko-KR-Wavenet-C': 'Wavenet-C (여성, 고품질)',
          'ko-KR-Wavenet-D': 'Wavenet-D (남성, 고품질)'
        };
        
        const voiceDisplayName = voiceNames[selectedVoice] || selectedVoice;
        await interaction.reply({ content: `TTS 목소리가 **${voiceDisplayName}**로 변경되었습니다.`, ephemeral: true });
        
        
        try {
          const testText = '안녕하세요! 새로운 목소리로 인사드립니다.';
          const audioFilePath = await generateTTS(testText, selectedVoice);
          if (audioFilePath) {
            await playAnnouncement(audioFilePath);
          }
        } catch (error) {
          console.error('목소리 테스트 중 오류:', error);
        }
        break;
    }
  }
  
  if (interaction.commandName === '삭제') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: '메시지 관리 권한이 필요합니다.', ephemeral: true });
      return;
    }
    
    const count = interaction.options.getInteger('개수');
    const period = interaction.options.getString('기간');
    
    await interaction.deferReply({ ephemeral: true });
    
    try {
      let messages = [];
      let before = null;
      let collected = 0;
      
      while (collected < count) {
        const fetchLimit = Math.min(100, count - collected);
        const fetchedMessages = await interaction.channel.messages.fetch({
          limit: fetchLimit,
          before: before
        });
        
        if (fetchedMessages.size === 0) break;
        
        const filteredMessages = fetchedMessages.filter(msg => {
          if (period) {
            const now = Date.now();
            const msgTime = msg.createdTimestamp;
            let timeLimit = 0;
            
            if (period.endsWith('d')) {
              timeLimit = parseInt(period) * 24 * 60 * 60 * 1000;
            } else if (period.endsWith('h')) {
              timeLimit = parseInt(period) * 60 * 60 * 1000;
            } else if (period.endsWith('m')) {
              timeLimit = parseInt(period) * 60 * 1000;
            }
            
            return (now - msgTime) <= timeLimit;
          }
          return true;
        });
        
        messages = messages.concat(Array.from(filteredMessages.values()));
        collected += filteredMessages.size;
        
        before = fetchedMessages.last()?.id;
      }
      
      messages = messages.slice(0, count);
      
      let deletedCount = 0;
      
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentMessages = batch.filter(msg => msg.createdTimestamp > twoWeeksAgo);
        const oldMessages = batch.filter(msg => msg.createdTimestamp <= twoWeeksAgo);
        
        if (recentMessages.length > 1) {
          await interaction.channel.bulkDelete(recentMessages);
          deletedCount += recentMessages.length;
        } else if (recentMessages.length === 1) {
          await recentMessages[0].delete();
          deletedCount += 1;
        }
        
        for (const msg of oldMessages) {
          try {
            await msg.delete();
            deletedCount += 1;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`메시지 삭제 오류: ${error.message}`);
          }
        }
        
        if (i + 100 < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      await interaction.editReply(`성공적으로 ${deletedCount}개의 메시지를 삭제했습니다.`);
    } catch (error) {
      console.error('메시지 삭제 중 오류:', error);
      await interaction.editReply(`메시지 삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  }
  
  if (interaction.commandName === '상태') {
    const config = getConfig();
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🍄 버섯 봇 설정 상태')
      .addFields(
        { name: 'TTS 텍스트 채널', value: config.ttsTextChannelId ? `<#${config.ttsTextChannelId}>` : '설정되지 않음', inline: true },
        { name: 'TTS 음성 채널', value: config.ttsVoiceChannelId ? `<#${config.ttsVoiceChannelId}>` : '설정되지 않음', inline: true },
        { name: 'TTS 목소리', value: (() => {
          const voiceNames = {
            'ko-KR-Standard-A': 'Standard-A (여성, 기본)',
            'ko-KR-Standard-B': 'Standard-B (남성)', 
            'ko-KR-Standard-C': 'Standard-C (여성)',
            'ko-KR-Standard-D': 'Standard-D (남성)',
            'ko-KR-Neural2-A': 'Neural2-A (여성, 자연스러움)',
            'ko-KR-Neural2-B': 'Neural2-B (남성, 자연스러움)',
            'ko-KR-Neural2-C': 'Neural2-C (여성, 자연스러움)',
            'ko-KR-Wavenet-A': 'Wavenet-A (여성, 고품질)',
            'ko-KR-Wavenet-B': 'Wavenet-B (남성, 고품질)',
            'ko-KR-Wavenet-C': 'Wavenet-C (여성, 고품질)',
            'ko-KR-Wavenet-D': 'Wavenet-D (남성, 고품질)'
          };
          return voiceNames[config.ttsVoice] || config.ttsVoice;
        })(), inline: true },
        { name: '도배 타임아웃', value: `${config.spamTimeout}분`, inline: true },
        { name: '인사 기능', value: config.greetingsEnabled ? '활성화' : '비활성화', inline: true },
        { name: '음성 연결 상태', value: voiceConnection && voiceConnection.state.status === VoiceConnectionStatus.Ready ? '연결됨' : '연결 안됨', inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
});

client.login(process.env.DISCORD_TOKEN);