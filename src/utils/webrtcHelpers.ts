export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export const RTC_PEER_CONFIG: RTCConfiguration = {
  iceServers: ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

/**
 * Munges SDP description to force ultra-high bitrate 4K video (up to 50Mbps)
 * and studio-grade Opus stereo audio (510kbps) with speech preservation.
 */
export function optimizeSdpForHighQuality(
  sdp: string,
  options: {
    videoBitrateKbps?: number;
    audioBitrateKbps?: number;
    forceStereo?: boolean;
    lowLatency?: boolean;
  } = {}
): string {
  const {
    videoBitrateKbps = 35000, // 35 Mbps default
    audioBitrateKbps = 510, // 510 kbps default Studio Opus
    forceStereo = true,
  } = options;

  let modifiedSdp = sdp;

  // 1. Optimize Opus audio line
  // Replace fmtp for opus to set max average bitrate, fullband stereo, cbr
  const opusPayloadRegex = /a=rtpmap:(\d+) opus\/48000\/2/i;
  const match = modifiedSdp.match(opusPayloadRegex);

  if (match && match[1]) {
    const payloadType = match[1];
    const fmtpRegex = new RegExp(`a=fmtp:${payloadType} (.*)`, 'i');
    const existingFmtp = modifiedSdp.match(fmtpRegex);

    const opusParams = [
      'minptime=10',
      'useinbandfec=1',
      forceStereo ? 'stereo=1' : '',
      forceStereo ? 'sprop-stereo=1' : '',
      `maxaveragebitrate=${audioBitrateKbps * 1000}`,
      'cbr=1',
      'dtx=0', // Disable discontinuous transmission so silence/whispers are never cut off
    ]
      .filter(Boolean)
      .join(';');

    if (existingFmtp) {
      modifiedSdp = modifiedSdp.replace(fmtpRegex, `a=fmtp:${payloadType} ${opusParams}`);
    } else {
      modifiedSdp = modifiedSdp.replace(
        opusPayloadRegex,
        `a=rtpmap:${payloadType} opus/48000/2\r\na=fmtp:${payloadType} ${opusParams}`
      );
    }
  }

  // 2. Inject Video Bitrate Bandwidth Limit (b=AS and b=TIAS)
  // Find m=video and append bandwidth line
  const videoMediaRegex = /(m=video \d+ [A-Z/]+ \d+[\s\S]*?)(m=audio|m=application|$)/;
  modifiedSdp = modifiedSdp.replace(videoMediaRegex, (match, videoSection, nextSection) => {
    let newVideoSection = videoSection;

    // Remove old b= lines
    newVideoSection = newVideoSection.replace(/b=AS:\d+\r?\n?/g, '');
    newVideoSection = newVideoSection.replace(/b=TIAS:\d+\r?\n?/g, '');

    // Add high bandwidth lines
    const bandwidthLines = `b=AS:${videoBitrateKbps}\r\nb=TIAS:${videoBitrateKbps * 1000}\r\n`;
    
    // Insert after c= line or m= line
    if (newVideoSection.includes('c=IN IP4')) {
      newVideoSection = newVideoSection.replace(
        /(c=IN IP4 .*\r?\n)/,
        `$1${bandwidthLines}`
      );
    } else {
      newVideoSection = newVideoSection.replace(
        /(m=video .*\r?\n)/,
        `$1${bandwidthLines}`
      );
    }

    // Also add x-google-max-bitrate if not present
    if (!newVideoSection.includes('x-google-max-bitrate')) {
      newVideoSection = newVideoSection.replace(
        /(a=rtpmap:\d+ [^\r\n]+)/,
        `$1\r\na=fmtp:96 x-google-max-bitrate=${videoBitrateKbps};x-google-min-bitrate=5000;x-google-start-bitrate=${Math.floor(videoBitrateKbps * 0.7)}`
      );
    }

    return newVideoSection + nextSection;
  });

  return modifiedSdp;
}

/**
 * Configure RTCRtpSender parameters for high bitrate video transmission
 */
export async function setSenderParameters(
  sender: RTCRtpSender,
  bitrateMbps: number,
  fps: number = 60
): Promise<void> {
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    
    params.encodings[0].maxBitrate = bitrateMbps * 1_000_000;
    params.encodings[0].maxFramerate = fps;
    params.encodings[0].networkPriority = 'high';
    params.encodings[0].priority = 'high';

    // Disable scalability mode degradation if supported
    if ('degradationPreference' in params) {
      params.degradationPreference = 'maintain-resolution'; // Prioritize 4K/1080p resolution clarity over dropping resolution
    }

    await sender.setParameters(params);
  } catch (err) {
    console.warn('Could not set sender parameters:', err);
  }
}
