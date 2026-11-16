const http = require('http');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeText(str, maxLen = 60) {
  let raw = String(str || '').trim();
  if (raw.length > maxLen) {
    raw = raw.slice(0, maxLen - 3) + '...';
  }
  return escapeXml(raw);
}

function cleanCodeLines(rawCode, defaultColor = '#38bdf8') {
  if (!rawCode) return [];
  return String(rawCode)
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 5)
    .map(l => ({
      text: l,
      color: l.startsWith('//') || l.startsWith('#') ? (defaultColor === '#f87171' ? '#fca5a5' : '#86efac') : defaultColor
    }));
}

// Load Mascot Base64
let mascotUri = '';
try {
  const mascotBuf = fs.readFileSync('/home/node/mascot.png');
  mascotUri = `data:image/png;base64,${mascotBuf.toString('base64')}`;
} catch (e) {
  console.warn('Mascot file not found at /home/node/mascot.png');
}

function buildSceneSvg(params) {
  const {
    day = 20,
    sceneIndex = '01',
    scenePhase = 'the mistake',
    tagRight = 'Anti-Pattern',
    headlinePrefix = 'Stop doing this in',
    headlineAccent = 'JavaScript:',
    subtext = 'The common mistake breaking production architectures',
    cardTitle = 'flawed_pattern.js // The Trap',
    badgeType = 'danger',
    badgeLabel = 'CRITICAL FLAW: Mutating Shared State',
    codeLines = [],
    highlightPill = 'Breaks Team Sync',
    highlightIcon = 'alert',
    speechBubble = 'Wait, WHAT?! 🚨',
    activeScene = 1
  } = params;

  // 4 Dash Progress Bars
  const dashes = [1, 2, 3, 4].map(idx => {
    const x = 80 + (idx - 1) * 235;
    const color = idx === activeScene ? '#1e293b' : '#cbd5e1';
    const height = idx === activeScene ? '5' : '3';
    const y = idx === activeScene ? '148' : '149';
    return `<rect x="${x}" y="${y}" width="215" height="${height}" rx="2" fill="${color}" />`;
  }).join('\n');

  // Badge styling
  let badgeBorder = '#ef4444';
  let badgeBg = '#450a0a';
  let badgeColor = '#fca5a5';
  let iconSvg = `<circle cx="152" cy="592" r="14" fill="#ef4444"/>
    <path d="M 145 585 L 159 599 M 159 585 L 145 599" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;

  if (badgeType === 'success') {
    badgeBorder = '#10b981';
    badgeBg = '#064e3b';
    badgeColor = '#6ee7b7';
    iconSvg = `<circle cx="152" cy="592" r="14" fill="#10b981"/>
      <path d="M 145 592 L 150 597 L 160 587" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
  } else if (badgeType === 'warning') {
    badgeBorder = '#f59e0b';
    badgeBg = '#451a03';
    badgeColor = '#fde68a';
    iconSvg = `<circle cx="152" cy="592" r="14" fill="#f59e0b"/>
      <path d="M 152 584 L 152 594 M 152 598 L 152 600" stroke="#000000" stroke-width="3" stroke-linecap="round"/>`;
  } else if (badgeType === 'info') {
    badgeBorder = '#38bdf8';
    badgeBg = '#082f49';
    badgeColor = '#7dd3fc';
    iconSvg = `<circle cx="152" cy="592" r="14" fill="#38bdf8"/>
      <path d="M 152 585 L 152 587 M 152 591 L 152 599" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
  }

  // Highlight pill icon
  let pillIconSvg = `<circle cx="120" cy="1530" r="14" fill="#10b981"/>
    <path d="M 114 1530 L 118 1534 L 127 1525" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
  if (highlightIcon === 'alert') {
    pillIconSvg = `<circle cx="120" cy="1530" r="14" fill="#ef4444"/>
      <path d="M 120 1522 L 120 1532 M 120 1536 L 120 1538" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`;
  } else if (highlightIcon === 'star') {
    pillIconSvg = `<circle cx="120" cy="1530" r="14" fill="#f59e0b"/>
      <polygon points="120,1520 123,1526 130,1527 125,1532 126,1538 120,1535 114,1538 115,1532 110,1527 117,1526" fill="#ffffff"/>`;
  }

  // Two-line or one-line responsive headline
  let headlineSvg = '';
  const totalChars = (headlinePrefix || '').length + (headlineAccent || '').length;
  if (totalChars > 26) {
    headlineSvg = `
      <text x="80" y="280" font-family="sans-serif" font-weight="900" font-size="50" fill="#1c1917" letter-spacing="-1">${safeText(headlinePrefix, 30)}</text>
      <text x="80" y="340" font-family="serif" font-style="italic" font-weight="bold" font-size="52" fill="#e06d28" letter-spacing="-0.5">${safeText(headlineAccent, 30)}</text>
      <text x="80" y="390" font-family="sans-serif" font-size="26" font-weight="500" fill="#57534e">${safeText(subtext, 65)}</text>
    `;
  } else {
    headlineSvg = `
      <text x="80" y="300" font-family="sans-serif" font-weight="900" font-size="56" fill="#1c1917" letter-spacing="-1">
        ${safeText(headlinePrefix, 20)} <tspan fill="#e06d28" font-style="italic" font-weight="bold" font-family="serif">${safeText(headlineAccent, 20)}</tspan>
      </text>
      <text x="80" y="365" font-family="sans-serif" font-size="28" font-weight="500" fill="#57534e">${safeText(subtext, 65)}</text>
    `;
  }

  // Render code lines with word wrap / max length safety (truncate BEFORE escaping)
  const renderedCode = codeLines.map((line, idx) => {
    const yPos = 695 + idx * 56;
    const txt = safeText(line.text || '', 46);
    return `<text x="130" y="${yPos}" font-family="monospace" font-size="28" font-weight="600" fill="${line.color || '#e2e8f0'}">${txt}</text>`;
  }).join('\n');

  // Interactive Mascot Speech Bubble
  const bubbleSvg = `
    <!-- Speech Bubble Body -->
    <g filter="url(#softGlow)">
      <rect x="600" y="1320" width="380" height="72" rx="22" fill="#ffffff" stroke="#e06d28" stroke-width="3"/>
      <!-- Speech Pointer Triangle pointing to mascot -->
      <polygon points="760,1392 780,1418 795,1392" fill="#ffffff" stroke="#e06d28" stroke-width="3"/>
      <rect x="758" y="1388" width="38" height="8" fill="#ffffff"/>
      <text x="790" y="1366" font-family="sans-serif" font-weight="900" font-size="28" fill="#1c1917" text-anchor="middle">${safeText(speechBubble, 24)}</text>
    </g>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
    <defs>
      <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.18"/>
      </filter>
      <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000000" flood-opacity="0.10"/>
      </filter>
    </defs>

    <!-- Warm Ivory Background (Exact BuildUForward Aesthetic) -->
    <rect width="1080" height="1920" fill="#eeebe2"/>

    <!-- Subtle Dot Grid Texture -->
    <g opacity="0.30">
      ${Array.from({ length: 18 }).map((_, i) => 
        Array.from({ length: 11 }).map((_, j) => 
          `<circle cx="${70 + j * 95}" cy="${70 + i * 105}" r="1.5" fill="#a8a29e"/>`
        ).join('')
      ).join('')}
    </g>

    <!-- Top Header Bar -->
    <g>
      <text x="80" y="115" font-family="monospace" font-weight="900" font-size="30">
        <tspan fill="#e06d28">BUF</tspan>
        <tspan fill="#78716c"> · </tspan>
        <tspan fill="#1c1917">DEV MASTERY</tspan>
      </text>
      <text x="1000" y="115" font-family="monospace" font-weight="bold" font-size="26" fill="#44403c" text-anchor="end">DAY ${day} · ARCHITECTURE</text>

      <!-- 4 Dash Progress Bars -->
      ${dashes}

      <!-- Sub-header Phase Tags -->
      <text x="80" y="195" font-family="monospace" font-size="24" font-weight="bold" fill="#78716c">// ${sceneIndex} · ${safeText(scenePhase, 20)}</text>
      <text x="1000" y="195" font-family="monospace" font-size="24" font-weight="bold" fill="#e06d28" text-anchor="end">${safeText(tagRight, 20)}</text>
    </g>

    <!-- Main Editorial Headline (Sans + Italic Serif Accent) -->
    <g>
      ${headlineSvg}
    </g>

    <!-- Central Focus Card (Retro-Modern Dark Terminal Card) -->
    <g filter="url(#cardShadow)">
      <!-- Outer Card Outline Shadow Offset Border -->
      <rect x="76" y="436" width="928" height="878" rx="32" fill="none" stroke="#d6d3cb" stroke-width="2" stroke-dasharray="8 6"/>

      <!-- Main Dark Card Background -->
      <rect x="80" y="440" width="920" height="870" rx="30" fill="#121826" stroke="#2a3449" stroke-width="2"/>

      <!-- Card Top Bar with Window Controls -->
      <rect x="80" y="440" width="920" height="80" rx="30" fill="#1a2234"/>
      <rect x="80" y="480" width="920" height="40" fill="#1a2234"/>
      <line x1="80" y1="520" x2="1000" y2="520" stroke="#2a3449" stroke-width="2"/>

      <circle cx="125" cy="480" r="10" fill="#ef4444"/>
      <circle cx="155" cy="480" r="10" fill="#f59e0b"/>
      <circle cx="185" cy="480" r="10" fill="#10b981"/>

      <text x="540" y="488" font-family="monospace" font-size="22" font-weight="bold" fill="#94a3b8" text-anchor="middle">${safeText(cardTitle, 40)}</text>

      <!-- Badge Pill inside Card -->
      <rect x="120" y="560" width="840" height="64" rx="14" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="2"/>
      ${iconSvg}
      <text x="180" y="602" font-family="monospace" font-size="24" font-weight="bold" fill="${badgeColor}">${safeText(badgeLabel, 45)}</text>

      <!-- Syntax-Colored Code Lines -->
      ${renderedCode}

      <!-- Bottom Card Accent Progress Bar -->
      <rect x="120" y="1270" width="840" height="8" rx="4" fill="#1e293b"/>
      <rect x="120" y="1270" width="${activeScene * 210}" height="8" rx="4" fill="#e06d28"/>
    </g>

    <!-- Interactive Mascot Speech Bubble -->
    ${bubbleSvg}

    <!-- Bottom Left Key Takeaway Stamp/Badge -->
    <g filter="url(#softGlow)">
      <rect x="80" y="1480" width="480" height="150" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      ${pillIconSvg}
      <text x="148" y="1538" font-family="sans-serif" font-weight="900" font-size="28" fill="#0f172a">${safeText(highlightPill, 26)}</text>
      <text x="95" y="1590" font-family="sans-serif" font-weight="600" font-size="22" fill="#64748b">Verified Senior Production Pattern</text>
    </g>

    <!-- Bottom Minimal Footer Disclaimer -->
    <text x="540" y="1860" font-family="monospace" font-size="20" fill="#78716c" text-anchor="middle">60 Days of Advanced Web Development · GrowthPulse AI CMO Platform</text>
  </svg>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:5050');

  // Handle BuildUForward Unified-Screen Video Reel Render
  if (req.method === 'POST' && url.pathname === '/render-reel') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyData || '{}');
        const day = payload.day || 20;
        let topic = payload.title || 'Functional JavaScript';
        if (topic.length > 25) topic = topic.slice(0, 23) + '...';
        const headline = payload.headline || 'STOP MUTATING STATE! 🚨';
        const speech = payload.speech_text || 'Wait! Are you seriously still mutating state directly in JavaScript? Stop right now! Mutating state creates invisible side effects, race conditions, and chaotic bugs. The clean senior pattern is simple: use pure functions and immutable spread updates. Predictable, traceable, and totally bulletproof. Comment KIT to grab the full architecture guide!';
        const codeBuggy = payload.code_buggy || '// ❌ Flawed Pattern\nuser.name = "John";\nstate.push(user);\n// Unpredictable mutations!';
        const codeClean = payload.code_clean || '// ✅ Senior Clean Fix\nconst updatedUser = { ...user, name: "John" };\nconst newState = [...state, updatedUser];\n// Pure immutable update!';

        const outDir = '/tmp/buf_render_' + Date.now();
        fs.mkdirSync(outDir, { recursive: true });

        // 1. Synthesize Energetic Spoken Voiceover with ChristopherNeural
        console.log(`[BUF-Reel] Synthesizing energetic voiceover with ChristopherNeural for Day ${day}...`);
        const tts = new MsEdgeTTS();
        await tts.setMetadata('en-US-ChristopherNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        let cleanSpeech = speech
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[\r\n]+/g, ' ')
          .trim();
        if (cleanSpeech.length > 450) cleanSpeech = cleanSpeech.slice(0, 440) + '...';

        const { audioFilePath } = await tts.toFile(outDir, cleanSpeech, { rate: '+14%', pitch: '+2Hz' });

        // Measure Duration
        const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${audioFilePath}`).toString().trim();
        const duration = parseFloat(durStr) || 20;
        console.log(`[BUF-Reel] Total Audio Duration: ${duration.toFixed(2)}s`);

        // Compute 4 Scene Durations
        const d1 = (duration * 0.25).toFixed(2);
        const d2 = (duration * 0.28).toFixed(2);
        const d3 = (duration * 0.27).toFixed(2);
        const d4 = (duration - parseFloat(d1) - parseFloat(d2) - parseFloat(d3)).toFixed(2);

        // Parse Code Lines cleanly
        const buggyLines = cleanCodeLines(codeBuggy, '#f87171');
        const cleanLines = cleanCodeLines(codeClean, '#38bdf8');

        // 2. Generate 4 Scene SVGs -> 1080x1920 PNGs
        console.log('[BUF-Reel] Rendering 4 Interactive Storyboard Scenes...');

        // Scene 1: The Trap / Hook
        const svg1 = buildSceneSvg({
          day,
          sceneIndex: '01',
          scenePhase: 'the mistake',
          tagRight: 'Anti-Pattern',
          headlinePrefix: 'Stop doing this in',
          headlineAccent: `${topic}:`,
          subtext: 'The common mistake breaking production architectures',
          cardTitle: 'flawed_pattern.js // The Trap',
          badgeType: 'danger',
          badgeLabel: 'CRITICAL FLAW: Mutating State',
          codeLines: buggyLines.length ? buggyLines : [{ text: '// Mutating shared state directly', color: '#f87171' }],
          highlightPill: 'Breaks Predictability',
          highlightIcon: 'alert',
          speechBubble: 'Wait, WHAT?! 🚨',
          activeScene: 1
        });
        fs.writeFileSync(path.join(outDir, 'scene1.svg'), svg1);
        execSync(`rsvg-convert -w 1080 -h 1920 ${path.join(outDir, 'scene1.svg')} -o ${path.join(outDir, 'scene1.png')}`);

        // Scene 2: Why It Breaks
        const svg2 = buildSceneSvg({
          day,
          sceneIndex: '02',
          scenePhase: 'the root cause',
          tagRight: 'Failure Mode',
          headlinePrefix: 'Why this breaks in',
          headlineAccent: 'production:',
          subtext: 'Invisible side effects, race conditions and chaos',
          cardTitle: 'mutation_error.log // Side Effects',
          badgeType: 'warning',
          badgeLabel: 'UNEXPECTED SIDE EFFECTS DETECTED',
          codeLines: [
            { text: '1. Shared objects mutated across functions', color: '#fde68a' },
            { text: '2. Unpredictable component re-render loops', color: '#cbd5e1' },
            { text: '3. Impossible to trace state transitions', color: '#f87171' },
            { text: '# Never mutate shared global or component state', color: '#fca5a5' }
          ],
          highlightPill: 'High Debugging Cost',
          highlightIcon: 'alert',
          speechBubble: 'State broken! 🤯',
          activeScene: 2
        });
        fs.writeFileSync(path.join(outDir, 'scene2.svg'), svg2);
        execSync(`rsvg-convert -w 1080 -h 1920 ${path.join(outDir, 'scene2.svg')} -o ${path.join(outDir, 'scene2.png')}`);

        // Scene 3: Clean Pattern / Senior Fix
        const svg3 = buildSceneSvg({
          day,
          sceneIndex: '03',
          scenePhase: 'senior pattern',
          tagRight: 'Clean Code',
          headlinePrefix: 'The senior',
          headlineAccent: 'clean fix:',
          subtext: 'Deterministic, immutable, zero side effects',
          cardTitle: 'senior_solution.ts // Clean Fix',
          badgeType: 'success',
          badgeLabel: 'SENIOR ARCHITECTURE FIX',
          codeLines: cleanLines.length ? cleanLines : [{ text: '// Clean immutable fix applied', color: '#4ade80' }],
          highlightPill: 'Deterministic State ✓',
          highlightIcon: 'star',
          speechBubble: 'Boom, 10x fix! ⚡',
          activeScene: 3
        });
        fs.writeFileSync(path.join(outDir, 'scene3.svg'), svg3);
        execSync(`rsvg-convert -w 1080 -h 1920 ${path.join(outDir, 'scene3.svg')} -o ${path.join(outDir, 'scene3.png')}`);

        // Scene 4: Takeaway & CTA
        const svg4 = buildSceneSvg({
          day,
          sceneIndex: '04',
          scenePhase: 'takeaway blueprint',
          tagRight: 'Day ' + day + ' of 60',
          headlinePrefix: 'Master senior',
          headlineAccent: 'architecture:',
          subtext: 'Save 20+ engineering hours every sprint',
          cardTitle: 'senior_blueprint.md // Key Rules',
          badgeType: 'info',
          badgeLabel: '60-DAY SENIOR ARCHITECTURE BLUEPRINT',
          codeLines: [
            { text: '• Treat state as strictly immutable', color: '#38bdf8' },
            { text: '• Use pure functions for business logic', color: '#4ade80' },
            { text: '• Comment KIT for the full architecture starter pack', color: '#fde047' },
            { text: '# Link in bio: github.com/vinayak-rohila/starter-kit', color: '#94a3b8' }
          ],
          highlightPill: 'Free Architecture Kit',
          highlightIcon: 'star',
          speechBubble: 'Grab the kit! 🎁',
          activeScene: 4
        });
        fs.writeFileSync(path.join(outDir, 'scene4.svg'), svg4);
        execSync(`rsvg-convert -w 1080 -h 1920 ${path.join(outDir, 'scene4.svg')} -o ${path.join(outDir, 'scene4.png')}`);

        // 3. Assemble Final Video with Animated Mascot Overlay & Chill Lo-Fi Music
        console.log('[BUF-Reel] Assembling 1080x1920 MP4 Video with 30fps Animated Mascot Loop...');
        const mp4Path = path.join(outDir, 'builduforward_reel.mp4');
        const mascotPath = '/home/node/mascot_loop.mp4';
        const musicPath = '/home/node/lofi_groove.mp3';

        const renderCmd = `ffmpeg -y \
          -loop 1 -t ${d1} -i ${path.join(outDir, 'scene1.png')} \
          -loop 1 -t ${d2} -i ${path.join(outDir, 'scene2.png')} \
          -loop 1 -t ${d3} -i ${path.join(outDir, 'scene3.png')} \
          -loop 1 -t ${d4} -i ${path.join(outDir, 'scene4.png')} \
          -stream_loop -1 -t ${duration} -i ${mascotPath} \
          -i ${audioFilePath} \
          -stream_loop -1 -t ${duration} -i ${musicPath} \
          -filter_complex "[0:v][1:v][2:v][3:v]concat=n=4:v=1:a=0[base];[4:v]scale=390:415[mascot];[base][mascot]overlay=630:1410[v];[5:a][6:a]amix=inputs=2:weights=1.0 0.16:duration=first:dropout_transition=2[a]" \
          -map "[v]" -map "[a]" \
          -c:v libx264 -preset fast -pix_fmt yuv420p -r 30 \
          -c:a aac -b:a 192k \
          ${mp4Path}`;

        execSync(renderCmd);

        const videoBuf = fs.readFileSync(mp4Path);
        console.log(`[BUF-Reel] Finished Successfully! Size: ${(videoBuf.length / 1024 / 1024).toFixed(2)} MB`);

        // Save local copy and cover thumbnail on shared volume for instant host publishing
        fs.writeFileSync('/home/node/.n8n/latest_reel.mp4', videoBuf);
        try {
          execSync(`ffmpeg -y -i ${path.join(outDir, 'scene1.png')} -q:v 2 /home/node/.n8n/latest_thumb.jpg`);
          console.log('[BUF-Reel] Saved cover thumbnail to /home/node/.n8n/latest_thumb.jpg');
        } catch (te) {
          console.warn('[BUF-Reel] Could not generate latest_thumb.jpg:', te.message);
        }

        // Clean temp files
        try { execSync(`rm -rf ${outDir}`); } catch (e) {}

        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuf.length,
          'Content-Disposition': 'attachment; filename="reel.mp4"'
        });
        res.end(videoBuf);
      } catch (err) {
        console.error('[BUF-Reel] Render Error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(err.message);
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(5050, '127.0.0.1', () => {
  console.log('BuildUForward Unified-Screen Reel Server active on port 5050');
});
