const TEAM_DATA = {
    'TLS Aces': {
        playersRanked: ['London', 'Indigo', 'Mila', 'AK', 'Aria', 'Maddie', 'Ava', 'Elektra'],
    },
    'Testing Team': {
        playersRanked: ['Tester 1', 'Tester 2', 'Tester 3', 'Tester 4'],
    }
};

// Simulated Smart Algorithm (Programmatic "AI")
async function getBuiltInAiSuggestion(teamName, onField, offField, notes, goal, timeStr, recentSubs, abortSignal) {
    // Artificial delay to simulate "thinking" and make it feel like AI
    await new Promise(resolve => setTimeout(resolve, 800));

    const teamData = TEAM_DATA[teamName] || { playersRanked: [] };
    const rankings = teamData.playersRanked.map(p => p.toLowerCase());

    const getRank = (name) => {
        const idx = rankings.indexOf(name.toLowerCase());
        return idx !== -1 ? idx : 999;
    };

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // --- GAME CLOCK AWARENESS ---
    const [minutes, seconds] = timeStr.split(':').map(Number);
    const timePlayedSec = (minutes * 60) + seconds;
    const MAX_GAME_SEC = 40 * 60; // 40 minutes (two 20min halves)
    const timeLeftSec = Math.max(0, MAX_GAME_SEC - timePlayedSec);
    const isCrunchTime = timeLeftSec <= (5 * 60); // Last 5 minutes of the game!

    // --- SMART NOTES PARSING ---
    const notesLower = notes.toLowerCase();

    const isUnavailable = (name) => {
        const n = name.toLowerCase();
        if (!notesLower.includes(n)) return false;
        const nameIdx = notesLower.indexOf(n);
        const surroundingText = notesLower.substring(Math.max(0, nameIdx - 40), nameIdx + 60);
        return /(injure|hurt|sick|late|absent|unwell|sore|pain|limp|cramp|dizzy|nausea|vomit|ill\b|not\s+well|not\s+feeling\s+well|feeling\s+sick|feeling\s+unwell|feeling\s+ill|doesn'?t\s+want\s+(to\s+)?(go\s+on|play|continue)|don'?t\s+want\s+(to\s+)?(go\s+on|play|continue)|does\s+not\s+want\s+(to\s+)?(go\s+on|play|continue)|won'?t\s+play|refuses?\s+to\s+play|can'?t\s+go\s+on|not\s+playing|sitting\s+out|needs?\s+a\s+rest|needs?\s+to\s+come\s+off|has\s+to\s+come\s+off|pull\s+(her|him)\s+off|take\s+(her|him)\s+off)/.test(surroundingText);
    };

    const hasFoulTrouble = (name) => {
        const n = name.toLowerCase();
        if (!notesLower.includes(n)) return false;
        const nameIdx = notesLower.indexOf(n);
        const surroundingText = notesLower.substring(Math.max(0, nameIdx - 30), nameIdx + 30);
        return /(3|4|three|four)\s*foul/.test(surroundingText) || surroundingText.includes('foul trouble');
    };

    const hasHotHand = (name) => {
        const n = name.toLowerCase();
        if (!notesLower.includes(n)) return false;
        const nameIdx = notesLower.indexOf(n);
        const surroundingText = notesLower.substring(Math.max(0, nameIdx - 30), nameIdx + 30);
        return /(on fire|hot|playing great|killing it|unstoppable)/.test(surroundingText);
    };

    const isExhausted = (name) => {
        const n = name.toLowerCase();
        if (!notesLower.includes(n)) return false;
        const nameIdx = notesLower.indexOf(n);
        const surroundingText = notesLower.substring(Math.max(0, nameIdx - 40), nameIdx + 60);
        return /(tired|exhausted|gassed|dead|breathing\s+heavy|worn\s+out|running\s+out|no\s+energy|fatigued|flagging|struggling)/.test(surroundingText);
    };

    // Global situational parsing
    const isLosing = /(we are|we're|team is)\s*losing/i.test(notesLower) || /losing badly/i.test(notesLower) || /behind/i.test(notesLower);
    const isWinning = /(we are|we're|team is)\s*winning/i.test(notesLower) || /winning comfortably/i.test(notesLower) || /up by/i.test(notesLower);

    let unavailablePlayers = [];
    let foulTroublePlayers = [];
    let hotPlayers = [];
    let exhaustedPlayers = [];

    const allPlayers = [...onField, ...offField];
    allPlayers.forEach(p => {
        if (isUnavailable(p.name)) unavailablePlayers.push(p.name);
        else if (hasFoulTrouble(p.name)) foulTroublePlayers.push(p.name);
        if (hasHotHand(p.name)) hotPlayers.push(p.name);
        if (isExhausted(p.name)) exhaustedPlayers.push(p.name);
    });

    let suggestedOut = [];
    let suggestedIn = [];
    let reasons = [];

    let candidatesOut = [...onField];
    let candidatesIn = [...offField];

    // --- STRATEGY PARSING ---
    let isWin = goal.toLowerCase().includes("win") || goal.toLowerCase().includes("best");
    let isEven = goal.toLowerCase().includes("even") || goal.toLowerCase().includes("fair");
    let isAny = !isWin && !isEven;

    if (isLosing) {
        isWin = true; isEven = false; isAny = false;
        reasons.push("🚨 **Score Alert:** We are behind! Activating aggressive 'Win' mode to prioritize our top scorers.");
    } else if (isWinning && isWin) {
        reasons.push("📈 **Game Flow:** We are winning! Starters can rest more while maintaining the lead.");
    } else if (isWinning && isEven) {
        reasons.push("📈 **Game Flow:** Winning comfortably. Perfect time for bench development.");
    } else if (isWinning && isAny) {
        reasons.push("📈 **Game Flow:** Solid lead. Balancing freshness with momentum.");
    }

    // --- SUB HISTORY AWARENESS ---
    const wasJustSubbedIn = (name) => recentSubs.some(s => s.name === name && s.state === 'on');

    // --- RULE: INJURIES / EXHAUSTION / FOULS ---
    candidatesIn = candidatesIn.filter(p => !unavailablePlayers.includes(p.name) && !exhaustedPlayers.includes(p.name));

    candidatesOut.forEach(p => {
        if (unavailablePlayers.includes(p.name)) {
            suggestedOut.push(p); reasons.push(`❌ **Emergency:** ${p.name} subbed out (injured/absent).`);
        } else if (exhaustedPlayers.includes(p.name)) {
            suggestedOut.push(p); reasons.push(`🥵 **Exhausted:** ${p.name} needs immediate recovery.`);
        } else if (foulTroublePlayers.includes(p.name) && !isCrunchTime) {
            suggestedOut.push(p); reasons.push(`⚠️ **Foul Trouble:** Protecting ${p.name} for the final minutes.`);
        }
    });

    if (!isCrunchTime) {
        let safeCandidatesIn = candidatesIn.filter(p => !foulTroublePlayers.includes(p.name));
        if (safeCandidatesIn.length > 0) candidatesIn = safeCandidatesIn;
    }

    // Filter out forced-out players
    candidatesOut = candidatesOut.filter(p => !suggestedOut.some(outP => outP.name === p.name));

    // --- RULE: RECENT SUB PROTECTION ---
    // Try to avoid subbing out someone who JUST got on, unless forced
    candidatesOut = candidatesOut.filter(p => {
        if (wasJustSubbedIn(p.name)) {
            // Only sub out if forced or if there's no one else to sub out
            return false;
        }
        return true;
    });
    // If we filtered out too many, add them back but prioritize them last
    if (candidatesOut.length === 0) candidatesOut = onField.filter(p => !suggestedOut.some(outP => outP.name === p.name));

    // --- RULE: HOT HAND ---
    candidatesOut = candidatesOut.filter(p => {
        if (hotPlayers.includes(p.name)) {
            reasons.push(`🔥 **Hot Hand:** Keeping ${p.name} on the floor during their streak.`);
            return false;
        }
        return true;
    });
    if (candidatesOut.length === 0) candidatesOut = onField.filter(p => !suggestedOut.some(outP => outP.name === p.name));

    // Sorting logic
    candidatesOut.sort((a, b) => {
        if (isWin) {
            const rA = getRank(a.name), rB = getRank(b.name);
            if (rA !== rB) return rB - rA;
            return b.time - a.time;
        }
        return b.time - a.time;
    });

    candidatesIn.sort((a, b) => {
        const hA = hotPlayers.includes(a.name) ? -1 : 0, hB = hotPlayers.includes(b.name) ? -1 : 0;
        if (hA !== hB) return hA - hB;
        if (isWin) {
            const rA = getRank(a.name), rB = getRank(b.name);
            if (rA !== rB) return rA - rB;
            return a.time - b.time;
        }
        return a.time - b.time;
    });

    // Sub count
    let numToSub = 2;
    if (candidatesOut.length > 0 && candidatesIn.length > 0) {
        let maxOut = Math.max(...candidatesOut.map(p => p.time)), minIn = Math.min(...candidatesIn.map(p => p.time));
        if (maxOut - minIn > 300 && candidatesIn.length >= 3) numToSub = 3;
    }
    if (suggestedOut.length > numToSub) numToSub = suggestedOut.length;
    numToSub = Math.min(numToSub, candidatesOut.length + suggestedOut.length, candidatesIn.length + suggestedIn.length);

    while (suggestedOut.length < numToSub && candidatesOut.length > 0) suggestedOut.push(candidatesOut.shift());
    while (suggestedIn.length < suggestedOut.length && candidatesIn.length > 0) suggestedIn.push(candidatesIn.shift());
    while (suggestedOut.length > suggestedIn.length) suggestedOut.pop();
    while (suggestedIn.length > suggestedOut.length) suggestedIn.pop();

    if (suggestedOut.length === 0) return `No balanced substitutions recommended.\n\n[SUB_ACTION] {"out": [], "in": []}`;

    const outNames = suggestedOut.map(p => p.name), inNames = suggestedIn.map(p => p.name);

    // Randomized Reasons (2)
    const variantIndex = Math.floor(Math.random() * 3);
    if (isWin && !isLosing) {
        const v = [
            ["🏆 **Strategy (Win):** Fielding our most dominant lineup.", "⚡ **Focus:** Prioritizing firepower over equal minutes."],
            ["🏆 **Strategy (Win):** Leaning on top performers to secure victory.", "⚡ **Focus:** Maximizing scoring potential and defense."],
            ["🏆 **Strategy (Win):** Aggressive push with best available roster.", "🔄 **Rotation:** Cycling stars to maintain pressure."]
        ];
        reasons.push(...v[variantIndex]);
    } else if (isEven && !isWinning) {
        const v = [
            ["⚖️ **Strategy (Fairness):** Subbing based strictly on playtime.", "🔋 **Focus:** Equal opportunity for all players."],
            ["⚖️ **Strategy (Fairness):** Keeping minutes perfectly balanced.", "🔋 **Focus:** Valuing team morale and development."],
            ["⚖️ **Strategy (Fairness):** Guaranteed fair share of court time.", "🔄 **Rotation:** Systematically resting high-minute players."]
        ];
        reasons.push(...v[variantIndex]);
    } else {
        const v = [
            ["⚖️ **Strategy (Balanced):** Sweet spot between competitive and rest.", "🔋 **Focus:** Steady rhythm and high energy levels."],
            ["⚖️ **Strategy (Balanced):** Blended lineup to keep the team fresh.", "🔄 **Rotation:** Swapping tired legs for energetic subs."],
            ["⚖️ **Strategy (Balanced):** Merging top talent with bench depth.", "🔋 **Focus:** Avoiding over-exhaustion."]
        ];
        reasons.push(...v[variantIndex]);
    }

    let waitTimeMins = isCrunchTime ? 2 : (offField.length >= 4 ? 2 : (offField.length === 3 ? 3 : 4));
    if (isWin) waitTimeMins++; if (isLosing) waitTimeMins--;
    waitTimeMins = Math.max(2, Math.min(4, waitTimeMins));

    const futureOnField = [...onField.map(p => p.name).filter(n => !outNames.includes(n)), ...inNames];
    let textResponse = `**Suggestion:** Sub **${outNames.join(' & ')}** OUT, and bring **${inNames.join(' & ')}** IN.\n\n**Reasoning:**\n`;
    reasons.forEach(r => textResponse += `- ${r}\n`);
    textResponse += `\n⏱️ **Timing:** Wait about ${waitTimeMins} minutes.\n🏀 **Lineup:** ${futureOnField.join(', ')}\n\n[SUB_ACTION] {"out": ${JSON.stringify(outNames)}, "in": ${JSON.stringify(inNames)}}`;
    return textResponse;
}
