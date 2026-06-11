/**
 * Guahh AI - Standalone Advanced Sports & Coaching Assistant Brain
 * Handles natural language processing, fuzzy entity extraction, context memory, and live app controls.
 */
window.GuahhAI = (() => {
    // --- CONVERSATION MEMORY STATE ---
    let aiConversationState = {
        lastQueryType: null, // 'drill', 'subs', 'tactics', etc.
        lastSubGoal: 'any',
        lastSubSecondary: '',
        lastDrillIndex: -1,
        excludedOutPlayers: [],
        excludedInPlayers: []
    };

    // --- KNOWLEDGE DATABASES ---
    const coachingDatabase = {
        drills: [
            "**Three-Cone Reaction Drill (Speed & Agility)**:\n1. Place three cones in a triangle 5 meters apart.\n2. Player starts in the middle.\n3. Coach calls out a cone number (1, 2, or 3).\n4. Player must sprint to that cone, touch it, and backpedal to the center as fast as possible.",
            "**Give-and-Go Shooting Drill (Passing & Scoring)**:\n1. Shooter stands at the wing, passer at the top of the key.\n2. Shooter passes to the top, then cuts hard toward the basket.\n3. Passer delivers a quick chest pass back for a running layup or close-range bank shot.",
            "**Defensive Slide & Closeout (Defensive Positioning)**:\n1. Players line up at the baseline.\n2. On the whistle, they defensive-slide laterally to the free-throw line.\n3. On the second whistle, they sprint out to the perimeter to simulate closing out on an imaginary shooter with hands up.",
            "**Mikan Drill (Finishing & Layups)**:\n1. Player stands directly under the basket.\n2. Rebound and shoot a layup with the right hand on the right side of the rim.\n3. Catch the ball cleanly out of the net, step, and immediately shoot with the left hand on the left side.\n4. Repeat continuously for 60 seconds to build finishing touch.",
            "**Around-the-World (Shooting Consistency)**:\n1. Mark 5 spots around the key (corners, wings, top of the key).\n2. Player must make a shot from spot 1 before moving to spot 2.\n3. If they miss, they can stay, or 'risk' a second shot to advance. If they miss the risk shot, they must go back to the start.",
            "**Three-Man Weave (Full-Court Passing & Speed)**:\n1. Three players line up at the baseline (wings and center).\n2. Center passes to left wing, then sprints behind them.\n3. Left wing passes to right wing, then sprints behind them.\n4. Players run down court passing without letting ball touch floor or dribbling, finishing with a hard layup.",
            "**Star Passing Drill (Rapid Perimeter Movement)**:\n1. Set up five players around the 3-point arc (corners, wings, top).\n2. Pass ball across arc in a star pattern (e.g. Corner to opposite Wing).\n3. Follow pass and sprint to fill that teammate's vacated spot.\n4. Teammate catches, fires next pass, and relocates. Builds high-tempo perimeter movement.",
            "**Box-Out Battle (Rebounding Aggression)**:\n1. Set up three defenders around key, and three offensive players outside arc.\n2. Coach fires a shot at rim.\n3. Defensive players must locate their matchups, make physical contact, pivot, and seal them with wide arms to secure rebounding position.",
            "**Pressure Defensive Deny (Denial & Recovery)**:\n1. Set up matchup on wing (offense vs defender).\n2. Ball starts with passer at top of key.\n3. Wing defender maintains heavy 'deny' stance (hand in passing lane, back to ball).\n4. If wing player cuts, defender must slide and recover to prevent pass reception."
        ],
        tactics: {
            'defense': "**Zone Defense vs Man-to-Man**:\n- Use **2-3 Zone** if the opposing team has strong inside drivers or if you want to protect your key players from foul trouble. Focus on shifting collectively as the ball swings.\n- Use **Man-to-Man** to pressure ball handlers, deny passing lanes, and match up your quickest defenders against their top scorers directly.",
            'shooting': "**Shooting Form Tips (B.E.E.F.)**:\n- **B - Balance**: Keep your feet shoulder-width apart, dominant foot slightly forward.\n- **E - Elbow**: Keep your shooting elbow tucked in, forming an 'L' shape directly under the ball.\n- **E - Eyes**: Focus your eyes completely on the back of the rim, not the flight of the ball.\n- **F - Follow-through**: Release cleanly, flicking your wrist like reaching into a high cookie jar.",
            'rebounding': "**How to Box Out**:\n1. Locate your opponent as soon as the shot is released.\n2. Make initial physical contact with your forearm to check where they are shifting.\n3. Reverse pivot to seal them behind your hips, drop into a low stance, and keep your arms wide to secure rebound space.",
            'spacing': "**Offensive Spacing Guide**:\n- Maintain at least 12-15 feet between perimeter players at all times.\n- If a teammate drives toward you, vacate that space and relocate to an open passing lane on the arc to stretch the defense out.",
            'passing': "**Precision Passing Fundamentals**:\n- **Chest Pass**: Hold ball with both hands at chest. Step toward target and push ball out, flipping wrists so thumbs point down.\n- **Bounce Pass**: Aim to bounce ball about 2/3 of the distance to your teammate so it rises to their waist.\n- **Overhead Pass**: Perfect for passing over defenders. Keep hands back, release over head without bringing ball behind neck.",
            'fastbreak': "**Transition / Fastbreak Strategy**:\n- **Outlet Pass**: Rebounder quickly turns and clears ball with rapid outlet pass to the wings.\n- **Lane Filling**: Center runs middle while guards sprint down left/right wings to stretch defensive coverage and create numbers advantages."
        }
    };

    const casualResponses = {
        'how old are you': "I was created in 2026, which makes me quite young, but I have a wealth of sports analytics and knowledge!",
        'where do you live': "I live right here inside Coachbuddy's digital ecosystem.",
        'are you married': "No, I am completely single and entirely focused on helping you coach a winning team!",
        'meaning of life': "To help your team get as many buckets as possible! Or forty-two, depending on who you ask.",
        'are you a robot': "I am Guahh AI, an artificial intelligence. Think of me as your elite digital assistant coach.",
        'what is basketball': "Basketball is a game played between two teams of five players on a rectangular court, where the objective is to shoot a ball through a hoop.",
        'how to win': "Score more points than the opponent! Defend well, box out, limit turnovers, and maximize high-efficiency shots.",
        'who are you': "I am Guahh AI, your intelligent, standalone assistant coaching companion.",
        'your name': "My name is Guahh AI. I'm here to handle the numbers, strategy, and drills while you focus on the court.",
        'thank you': "You're welcome! Let me know if you need any other play strategies, drills, or roster adjustments.",
        'thanks': "No worries! Let's get these players rotated and win this game.",
        'good job': "Appreciate it! I'm always ready to crunch the stats to keep our squad fresh."
    };

    // --- HELPER UTILITIES ---
    function convertSpokenNumbers(text) {
        const units = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
            'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
            'seventeen': 17, 'eighteen': 18, 'nineteen': 19
        };
        const tens = { 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90 };
        let result = text;
        for (let t in tens) {
            for (let u in units) {
                if (u !== 'zero') {
                    const mathSum = parseInt(tens[t]) + parseInt(units[u]);
                    result = result.replace(new RegExp(`\\b${t}\\s+${u}\\b`, 'gi'), mathSum).replace(new RegExp(`\\b${t}-${u}\\b`, 'gi'), mathSum);
                }
            }
        }
        for (let t in tens) result = result.replace(new RegExp(`\\b${t}\\b`, 'gi'), tens[t]);
        for (let u in units) result = result.replace(new RegExp(`\\b${u}\\b`, 'gi'), units[u]);
        return result;
    }

    function timeToSeconds(timeStr) {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const parts = timeStr.split(':');
        return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
    }

    function formatTime(seconds) {
        if (seconds < 0) seconds = 0;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Unbreakable Fuzzy Entity Matcher
     * Safely finds a roster player by name, number, sub-string, or initials.
     */
    function findPlayer(query, playersArray) {
        if (!query || !playersArray) return null;
        const cleanQuery = query.toLowerCase().replace(/[\s#]/g, '').trim();
        if (!cleanQuery) return null;

        // 1. Exact match on name or number
        let found = playersArray.find(p => {
            const name = (p.name || p.playerName || "").toLowerCase().replace(/\s/g, '');
            const num = String(p.number || p.playerNumber || "").replace(/[\s#]/g, '');
            return name === cleanQuery || num === cleanQuery;
        });
        if (found) return found;

        // 2. Fuzzy contains match
        found = playersArray.find(p => {
            const name = (p.name || p.playerName || "").toLowerCase().replace(/\s/g, '');
            return name.includes(cleanQuery) || cleanQuery.includes(name);
        });
        if (found) return found;

        // 3. Initials match (e.g., "LB" for "LeBron James")
        if (cleanQuery.length >= 2 && cleanQuery.length <= 3) {
            found = playersArray.find(p => {
                const name = (p.name || p.playerName || "").toLowerCase().trim();
                const initials = name.split(/\s+/).map(word => word[0]).join('');
                return initials === cleanQuery;
            });
            if (found) return found;
        }

        return null;
    }

    // --- STRATEGIC ROTATION ALGORITHM ---
    function generateRotationStrategy(context, queryText) {
        const { players, onField, offField, recentSubs, notes } = context;
        let notesLower = (notes + " " + queryText).toLowerCase();
        
        let goal = 'any';
        if (/(win|best|lose|behind|deficit|need to win)/i.test(notesLower)) goal = 'win';
        else if (/(even|fair|playtime|equal|morale|balanced)/i.test(notesLower)) goal = 'even';

        let secondaryGoal = '';
        if (/(height|tall|size|rebound)/i.test(notesLower)) secondaryGoal = 'height';
        else if (/(speed|fast|pace|quick|run)/i.test(notesLower)) secondaryGoal = 'speed';
        else if (/(defense|defend|stop|tighten|defence)/i.test(notesLower)) secondaryGoal = 'defense';
        else if (/(shoot|scoring|3pt|three|points|shooter)/i.test(notesLower)) secondaryGoal = '3pt';

        const getRank = (name) => {
            const p = findPlayer(name, players);
            return p ? (parseInt(p.rank) || 5) : 5;
        };
        const getSkill = (name) => {
            const p = findPlayer(name, players);
            return p ? (p.skill || "") : "";
        };
        const getHeight = (name) => {
            const p = findPlayer(name, players);
            return p ? (parseInt(p.height) || 0) : 0;
        };

        let reasons = [];
        if (secondaryGoal) reasons.push(`**Tactical Override:** Prioritizing ${secondaryGoal.toUpperCase()} metrics based on your request.`);

        const evaluateSkillsScore = (skills, goalType) => {
            let score = 0;
            const s = skills.toLowerCase();
            if (s.includes('good at everything')) score += 5;
            if (s.includes('iq')) score += 3;
            
            if (goalType === 'height') {
                if (s.includes('jump height')) score += 10;
                if (s.includes('rebounding')) score += 8;
            } else if (goalType === 'speed') {
                if (s.includes('speed')) score += 10;
                if (s.includes('good handles')) score += 6;
            } else if (goalType === 'defense') {
                if (s.includes('defence')) score += 10;
                if (s.includes('rebounding')) score += 6;
            } else if (goalType === '3pt') {
                if (s.includes('3 point star')) score += 10;
                if (s.includes('shot accuracy')) score += 8;
            }
            return score;
        };

        const isUnavailable = (name) => /(injure|hurt|sick|late|absent|unwell|sore|bench)/.test(notesLower.substring(Math.max(0, notesLower.indexOf(name.toLowerCase()) - 40), notesLower.indexOf(name.toLowerCase()) + 60));

        let unavailablePlayers = [];
        [...onField, ...offField].forEach(p => { if (isUnavailable(p.name)) unavailablePlayers.push(p.name); });

        let suggestedOut = [], suggestedIn = [], reasonsList = [], candidatesOut = [...onField], candidatesIn = [...offField];
        let isWin = goal === 'win', isEven = goal === 'even';

        reasonsList.push(...reasons);

        if (aiConversationState.excludedOutPlayers.length > 0) {
            let tempOut = candidatesOut.filter(p => !aiConversationState.excludedOutPlayers.includes(p.name));
            if (tempOut.length >= 1) { candidatesOut = tempOut; reasonsList.push("**Alternate Lineup:** Choosing different players to sub out."); }
            else aiConversationState.excludedOutPlayers = [];
        }
        if (aiConversationState.excludedInPlayers.length > 0) {
            let tempIn = candidatesIn.filter(p => !aiConversationState.excludedInPlayers.includes(p.name));
            if (tempIn.length >= 1) { candidatesIn = tempIn; reasonsList.push("**Alternate Lineup:** Choosing different bench players to bring on."); }
            else aiConversationState.excludedInPlayers = [];
        }

        candidatesIn = candidatesIn.filter(p => !unavailablePlayers.includes(p.name));
        candidatesOut.forEach(p => {
            if (unavailablePlayers.includes(p.name)) { suggestedOut.push(p); reasonsList.push(`**Emergency Rest:** ${p.name} subbed off per game logs.`); }
        });

        candidatesOut = candidatesOut.filter(p => !suggestedOut.some(outP => outP.name === p.name));
        candidatesOut = candidatesOut.filter(p => !recentSubs.some(s => s.name === p.name && s.state === 'on'));
        if (candidatesOut.length === 0) candidatesOut = onField.filter(p => !suggestedOut.some(outP => outP.name === p.name));

        candidatesOut.sort((a, b) => {
            if (isWin) return (getRank(a.name) + a.points * 0.5) - (getRank(b.name) + b.points * 0.5); 
            return b.time - a.time;
        });

        candidatesIn.sort((a, b) => {
            if (secondaryGoal) {
                const scoreA = evaluateSkillsScore(getSkill(a.name), secondaryGoal) + (getHeight(a.name) / 100);
                const scoreB = evaluateSkillsScore(getSkill(b.name), secondaryGoal) + (getHeight(b.name) / 100);
                if (scoreA !== scoreB) return scoreB - scoreA;
            }
            if (isWin) return (getRank(b.name) + b.points * 0.5) - (getRank(a.name) + a.points * 0.5); 
            return a.time - b.time;
        });

        let numToSub = Math.min(2, candidatesOut.length + suggestedOut.length, candidatesIn.length + suggestedIn.length);
        while (suggestedOut.length < numToSub && candidatesOut.length > 0) suggestedOut.push(candidatesOut.shift());
        while (suggestedIn.length < suggestedOut.length && candidatesIn.length > 0) suggestedIn.push(candidatesIn.shift());

        if (suggestedOut.length === 0) {
            return { text: `No recommended substitutions needed right now.`, actions: [] };
        }

        const outNames = suggestedOut.map(p => p.name), inNames = suggestedIn.map(p => p.name);
        if (isWin) reasonsList.push("**Win Optimization:** Keeping high-value rating scorers on court.");
        else if (isEven) reasonsList.push("**Fair Play Optimization:** Rotating rest periods for balanced minutes.");
        else reasonsList.push("**Balanced Rotation:** Cycle completed to avoid over-exertion.");

        aiConversationState.excludedOutPlayers = [...outNames];
        aiConversationState.excludedInPlayers = [...inNames];
        aiConversationState.lastSubGoal = goal;
        aiConversationState.lastSubSecondary = secondaryGoal;

        const futureOnField = [...onField.map(p => p.name).filter(n => !outNames.includes(n)), ...inNames];
        
        let textResponse = `**Lineup Strategy:** Sub **${outNames.join(' & ')}** OUT, and bring **${inNames.join(' & ')}** IN.\n\n**Key Factors:**\n`;
        reasonsList.forEach(r => textResponse += `- ${r}\n`);
        textResponse += `\n**Expected Lineup:** ${futureOnField.join(', ')}`;

        return {
            text: textResponse,
            actions: [{ type: 'SUB_PLAYERS', out: outNames, in: inNames }]
        };
    }

    // --- MAIN ENGINE ENTRY POINT ---
    /**
     * @param {string} rawQuery - The user's text input.
     * @param {object} context - App state payload. 
     *      Expects: { teamId, players[], onField[], offField[], gameTimeSecs, recentSubs[], notes, apiCall }
     * @returns {object} - { text: string, actions: array }
     */
    async function processQuery(rawQuery, context) {
        let query = convertSpokenNumbers(rawQuery.trim().toLowerCase());
        if (!query) return { text: "No input detected.", actions: [] };

        const responseObj = { text: "", actions: [] };
        const allCurrentPlayers = [...context.onField, ...context.offField];

        // --- DIRECT INTEGRATED RESPONSES FOR PRESET SUGGESTION BUTTONS ---
        if (query.includes("what can you do") || query.includes("what you can do") || query.includes("features") || query === "help") {
            return {
                text: "**Here is what I can do for you on the sidelines:**\n\n" +
                      "1. **Lineup & Rotation Strategy**: Ask for \"subs suggestion\" or say \"we need defence/shooters\" to get instant player rotations.\n" +
                      "2. **Real-time Substitutions**: Say \"sub in [Name]\" or \"swap [Name] with [Name]\".\n" +
                      "3. **In-Game Point Adjustments**: Say \"[Name] scored a layup\" or \"add 3 points to [Name]\".\n" +
                      "4. **Interactive Drills & Play Tactics**: Say \"make me a drill\" or ask about \"zone defense\".\n" +
                      "5. **Sideline Data Analytics**: Ask \"who's my best player\" or \"who has played the most time overall\".\n" +
                      "6. **Game Timer Commands**: Ask me to \"pause the game\" or \"start the clock\".",
                actions: []
            };
        }

        // 1. Roster Setup: Add Default Players Action
        if (/(?:add|load|populate|import)\s+(?:default\s+)?(players|roster|team)/i.test(query)) {
            responseObj.text = "Opening the confirmation modal to import your default team roster.";
            responseObj.actions.push({ type: 'ADD_DEFAULT_PLAYERS' });
            return responseObj;
        }

        // 2. Game Lifecycle: Finish/Save Game Action
        if (/(?:finish|save|end|complete|stop)\s+(?:the\s+)?game/i.test(query)) {
            responseObj.text = "Opening the save confirmation modal to finish this game.";
            responseObj.actions.push({ type: 'FINISH_GAME' });
            return responseObj;
        }

        // 3. App Controls: Timer Manipulation Action
        const timerMatch = query.match(/(start|resume|pause|stop|reset)\s+(?:the\s+)?(timer|game|clock|match)/i);
        if (timerMatch) {
            const actionType = timerMatch[1].toLowerCase();
            let aiAction = "";
            if (['start', 'resume'].includes(actionType)) { aiAction = "TIMER_START"; responseObj.text = "Starting the game timer."; }
            else if (['pause', 'stop'].includes(actionType)) { aiAction = "TIMER_PAUSE"; responseObj.text = "Pausing the game timer."; }
            else if (['reset'].includes(actionType)) { aiAction = "TIMER_RESET"; responseObj.text = "Resetting the game timer."; }
            
            if (aiAction) responseObj.actions.push({ type: aiAction });
            return responseObj;
        }

        // 4. Substitution: Explicit Swap/Replacement Actions
        let swapMatch = query.match(/(?:sub|bring|put)\s+([a-z0-9\s#]+)\s+(?:on|in)\s+for\s+([a-z0-9\s#]+)/i);
        if (!swapMatch) {
            swapMatch = query.match(/replace\s+([a-z0-9\s#]+)\s+with\s+([a-z0-9\s#]+)/i);
            if (swapMatch) {
                const temp = swapMatch[1];
                swapMatch[1] = swapMatch[2];
                swapMatch[2] = temp;
            }
        }
        if (!swapMatch) {
            swapMatch = query.match(/swap\s+([a-z0-9\s#]+)\s+(?:with|and)\s+([a-z0-9\s#]+)/i);
        }

        if (swapMatch) {
            const rawOnTarget = swapMatch[1].trim();
            const rawOffTarget = swapMatch[2].trim();

            const onPlayer = findPlayer(rawOnTarget, context.offField);
            const offPlayer = findPlayer(rawOffTarget, context.onField);

            if (onPlayer && offPlayer) {
                responseObj.text = `Substituting **${onPlayer.name}** on for **${offPlayer.name}**.`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: [offPlayer.name], in: [onPlayer.name] });
            } else {
                if (!onPlayer && !offPlayer) {
                    responseObj.text = `I couldn't locate either player inside the active bench or court.`;
                } else if (!onPlayer) {
                    responseObj.text = `I found **${offPlayer.name}** on court, but couldn't find an available bench player matching "${rawOnTarget}".`;
                } else {
                    responseObj.text = `I found **${onPlayer.name}** on the bench, but couldn't find an active court player matching "${rawOffTarget}".`;
                }
            }
            return responseObj;
        }

        // 5. Individual Roster Actions: Solo Substitutions
        const subInMatch = query.match(/(?:sub|bring|put|play)\s+(?:in\s+)?([a-z0-9\s#]+)\s*(?:on)?/i);
        const subOutMatch = query.match(/(?:sub|take|sit|bench|rest|remove)\s+(?:out\s+)?([a-z0-9\s#]+)\s*(?:off)?/i);

        if (subInMatch && !query.includes('for') && !query.includes('with') && !query.includes('and')) {
            const target = subInMatch[1].trim();
            const p = findPlayer(target, context.offField);
            if (p) {
                responseObj.text = `Substituting **${p.name}** ON.`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: [], in: [p.name] });
            } else {
                const alreadyOn = findPlayer(target, context.onField);
                responseObj.text = alreadyOn ? `**${alreadyOn.name}** is already on the field.` : `I couldn't locate an available bench player matching "${target}".`;
            }
            return responseObj;
        }

        if (subOutMatch && !query.includes('for') && !query.includes('with') && !query.includes('and')) {
            const target = subOutMatch[1].trim();
            const p = findPlayer(target, context.onField);
            if (p) {
                responseObj.text = `Substituting **${p.name}** OFF.`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: [p.name], in: [] });
            } else {
                const alreadyOff = findPlayer(target, context.offField);
                responseObj.text = alreadyOff ? `**${alreadyOff.name}** is already resting on the bench.` : `I couldn't locate an active court player matching "${target}".`;
            }
            return responseObj;
        }

        // 6. Direct App Actions: Adjusting Points (and Natural Basketball Actions)
        let pointsAmount = 0;
        let targetNameRaw = "";
        let naturalActionLabel = "";

        const pointsMatch = query.match(/(add|give|award|plus|subtract|remove|minus|take away)\s+(\d+)\s*(?:pts|points|point)?\s*(?:to|for|from)?\s+([a-zA-Z0-9\s#]+)/i);
        const bballActionMatch = query.match(/([a-z0-9\s#]+)\s+(scored|got|made|hit)\s+(?:a\s+)?(layup|basket|jumper|shot|free\s*throw|three|3-pointer|3\s*pointer|3|2|1)/i);

        if (pointsMatch) {
            const operation = /(subtract|remove|minus|take away)/i.test(pointsMatch[1]) ? -1 : 1;
            pointsAmount = parseInt(pointsMatch[2], 10) * operation;
            targetNameRaw = pointsMatch[3].trim();
        } else if (bballActionMatch) {
            targetNameRaw = bballActionMatch[1].trim();
            const actionText = bballActionMatch[3].toLowerCase();
            
            if (actionText.includes('free') || actionText === '1') {
                pointsAmount = 1;
                naturalActionLabel = "free throw";
            } else if (actionText.includes('three') || actionText.includes('3')) {
                pointsAmount = 3;
                naturalActionLabel = "three-pointer";
            } else {
                pointsAmount = 2;
                naturalActionLabel = actionText;
            }
        }

        if (pointsAmount !== 0 && targetNameRaw !== "") {
            const targetPlayer = findPlayer(targetNameRaw, allCurrentPlayers);

            if (targetPlayer) {
                if (naturalActionLabel) {
                    responseObj.text = `Nice basket! Added **${pointsAmount}** points to **${targetPlayer.name}** for making that ${naturalActionLabel}.`;
                } else {
                    responseObj.text = `${pointsAmount > 0 ? 'Added' : 'Subtracted'} ${Math.abs(pointsAmount)} points ${pointsAmount > 0 ? 'to' : 'from'} **${targetPlayer.name}**.`;
                }
                responseObj.actions.push({ type: 'UPDATE_POINTS', targetName: targetPlayer.name, amount: pointsAmount });
            } else {
                responseObj.text = `I couldn't find a player named or numbered "${targetNameRaw}" currently in the game.`;
            }
            return responseObj;
        }

        // 7. Live Game Performance Queries
        if (/(who has|who).*(least|lowest|most|highest).*(time|minutes|playtime|points).*(this game|today|now)/i.test(query)) {
            if (allCurrentPlayers.length === 0) return { text: "There are no players currently in this game.", actions: [] };

            const isLeast = /(least|lowest)/i.test(query);
            const isPoints = /(points|pts)/i.test(query);

            allCurrentPlayers.sort((a, b) => {
                if (isPoints) return isLeast ? a.points - b.points : b.points - a.points;
                return isLeast ? a.time - b.time : b.time - a.time;
            });

            const top = allCurrentPlayers[0];
            const metricStr = isPoints ? `${top.points} points` : `${formatTime(top.time)} minutes on court`;
            responseObj.text = `**${top.name}** currently has the ${isLeast ? 'least' : 'most'} ${isPoints ? 'points' : 'playtime'} this game, with ${metricStr}.`;
            return responseObj;
        }

        // 8. Greetings & Local Casual Conversations
        const greetings = ['hello', 'hi', 'hey', 'yo', 'gday', 'g\'day', 'whats up', 'what\'s up'];
        const lowerQuery = query.toLowerCase().trim();
        if (greetings.includes(lowerQuery) || lowerQuery === "hi guahh ai" || lowerQuery === "hello guahh ai") {
            return { text: "Hello! How can I assist you today?", actions: [] };
        }

        for (const key of Object.keys(casualResponses)) {
            if (query.includes(key)) return { text: casualResponses[key], actions: [] };
        }

        // 9. Historical Server Queries & Advanced Analytics
        const isBestPlayerQuery = /(who is|who's|whos).* (best|mvp|top|star) (player|scorer|on my team|on our team)/i.test(query);
        const isHistoricalQuery = /(who has|who).*(least|lowest|most|highest).*(time|playtime|minutes|points).*(total|overall|all time|history)/i.test(query);
        const isAvgPoints = /(average|avg)\s+(?:points|pts)/i.test(query);
        const isTotalGames = /(total|how many)\s+(?:games|recorded|played)/i.test(query);
        const isBestDefender = /(best|top|strongest)\s+defender/i.test(query);
        const isBestShooter = /(best|top|strongest)\s+shooter/i.test(query);
        const isTeamSummary = /(summary|overview|status|progress|stats)/i.test(query);

        if (isBestPlayerQuery || isHistoricalQuery || isAvgPoints || isTotalGames || isBestDefender || isBestShooter || isTeamSummary) {
            if (!context.teamId) return { text: "Please select a team in the app first to analyze historical data.", actions: [] };
            
            try {
                const res = await context.apiCall('get_stats', { teamId: context.teamId });
                if (!res.stats || res.stats.length === 0) return { text: "There are no past games recorded on the server for this team yet.", actions: [] };

                let aggregate = {};
                context.players.forEach(p => {
                    aggregate[p.playerName] = { name: p.playerName, rank: parseInt(p.rank)||5, skill: p.skill||'', totalTime: 0, totalPoints: 0, games: 0 };
                });

                res.stats.forEach(game => {
                    game.players.forEach(p => {
                        if (!aggregate[p.name]) aggregate[p.name] = { name: p.name, rank: 5, skill: '', totalTime: 0, totalPoints: 0, games: 0 };
                        aggregate[p.name].totalTime += timeToSeconds(p.time);
                        aggregate[p.name].totalPoints += parseInt(p.points) || 0;
                        aggregate[p.name].games += 1;
                    });
                });

                const aggArray = Object.values(aggregate).filter(p => p.games > 0);
                if (aggArray.length === 0) return { text: "Not enough historical player data available to analyze.", actions: [] };

                // Team Games Played
                if (isTotalGames) {
                    return { text: `We have played a total of **${res.stats.length}** recorded game(s) on the server.`, actions: [] };
                }

                // Team Average PPG
                if (isAvgPoints) {
                    let totalTeamPoints = 0;
                    res.stats.forEach(game => {
                        game.players.forEach(p => { totalTeamPoints += parseInt(p.points) || 0; });
                    });
                    const avgPPG = (totalTeamPoints / res.stats.length).toFixed(1);
                    return { text: `Our team is averaging **${avgPPG} points per game** across ${res.stats.length} recorded match(es).`, actions: [] };
                }

                // Best Defender
                if (isBestDefender) {
                    const defenders = aggArray.filter(p => /(defence|defense|rebounding|block)/i.test(p.skill));
                    if (defenders.length > 0) {
                        defenders.sort((a,b) => b.rank - a.rank);
                        const anchor = defenders[0];
                        return { text: `Our defensive anchor is **${anchor.name}**. They have a base rating of ${anchor.rank}/10, designated with the skill tags: "${anchor.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `We don't have registered defense tags, but based on player ratings, **${aggArray[0].name}** is our most reliable defensive matchup.`, actions: [] };
                }

                // Best Shooter
                if (isBestShooter) {
                    const shooters = aggArray.filter(p => /(3 point|accuracy|shot|shooter)/i.test(p.skill));
                    if (shooters.length > 0) {
                        shooters.sort((a,b) => b.totalPoints - a.totalPoints);
                        const topShooter = shooters[0];
                        return { text: `Our premier sharpshooter is **${topShooter.name}**, scoring ${topShooter.totalPoints} points overall with registered skill tags: "${topShooter.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.totalPoints - a.totalPoints);
                    return { text: `Based on overall historical scoring, **${aggArray[0].name}** is our top shooting option with ${aggArray[0].totalPoints} total points.`, actions: [] };
                }

                // Team Summary Dashboard
                if (isTeamSummary) {
                    let totalTeamPoints = 0;
                    res.stats.forEach(game => {
                        game.players.forEach(p => { totalTeamPoints += parseInt(p.points) || 0; });
                    });
                    const avgPPG = (totalTeamPoints / res.stats.length).toFixed(1);
                    aggArray.sort((a,b) => b.totalPoints - a.totalPoints);
                    const topScorer = aggArray[0];

                    let summary = `### Team Progress Summary\n\n`;
                    summary += `- **Games Recorded**: ${res.stats.length} matches\n`;
                    summary += `- **Offensive Efficiency**: ${avgPPG} PPG (points per game)\n`;
                    summary += `- **Leading Scorer**: ${topScorer.name} (${topScorer.totalPoints} total points)\n`;
                    summary += `- **Active Roster Base**: ${context.players.length} players registered`;
                    return { text: summary, actions: [] };
                }

                if (isBestPlayerQuery) {
                    aggArray.forEach(p => {
                        const mins = p.totalTime / 60 || 1;
                        p.calcScore = ((p.totalPoints / mins) * 100) + (p.rank * 10);
                    });
                    aggArray.sort((a, b) => b.calcScore - a.calcScore);
                    
                    const best = aggArray[0];
                    let text = `Based on server stats, **${best.name}** is your top performing roster player. `;
                    text += `They have a rating of ${best.rank}/10, scoring ${best.totalPoints} points across ${best.games} recorded game(s).`;
                    if (best.skill) text += ` Registered skill tags: ${best.skill}.`;
                    responseObj.text = text;
                    return responseObj;
                }

                if (isHistoricalQuery) {
                    const isLeast = /(least|lowest)/i.test(query);
                    const isPoints = /(points|pts)/i.test(query);

                    aggArray.sort((a, b) => {
                        if (isPoints) return isLeast ? a.totalPoints - b.totalPoints : b.totalPoints - a.totalPoints;
                        return isLeast ? a.totalTime - b.totalTime : b.totalTime - a.totalTime;
                    });

                    const top = aggArray[0];
                    const metricStr = isPoints ? `${top.totalPoints} points` : `${formatTime(top.totalTime)} total minutes played`;
                    responseObj.text = `Historically, **${top.name}** has the ${isLeast ? 'least' : 'most'} ${isPoints ? 'points' : 'playtime'} on record, with ${metricStr} across ${top.games} game(s).`;
                    return responseObj;
                }

            } catch (err) {
                return { text: "I encountered an error connecting to the servers to fetch historical stats.", actions: [] };
            }
        }

        // 10. Conversational Memory Follow-ups
        const isFollowUp = /(another|different|next|other|change|something else|new ones|new subs|different subs|another one|different one|gimme another|give me another|different rotation)/i.test(query);
        if (isFollowUp && aiConversationState.lastQueryType) {
            if (aiConversationState.lastQueryType === 'drill') {
                aiConversationState.lastDrillIndex = (aiConversationState.lastDrillIndex + 1) % coachingDatabase.drills.length;
                return { text: "Here is another coaching drill:\n\n" + coachingDatabase.drills[aiConversationState.lastDrillIndex], actions: [] };
            }
            if (aiConversationState.lastQueryType === 'tactics') {
                const keys = Object.keys(coachingDatabase.tactics);
                const randKey = keys[Math.floor(Math.random() * keys.length)];
                return { text: "Here is another coaching tip:\n\n" + coachingDatabase.tactics[randKey], actions: [] };
            }
            if (aiConversationState.lastQueryType === 'subs') {
                query = "generate different substitutions"; 
            }
        }

        // 11. Rotation & Sub suggestions matrices (Includes shooter/defense keyword routing)
        if (/(sub|substitution|rotation|lineup|bench|roster|field|court|on-field|off-field|fair play|playtime|game state|tactics|situation|who should|bring in|put in|take off|rest|exhausted|foul|win|balanced|shooters|shooter|defense|defence)/i.test(query)) {
            aiConversationState.lastQueryType = 'subs';
            
            // Premium fallback behavior if the roster isn't set up yet
            if (allCurrentPlayers.length < 2 || context.onField.length === 0) {
                let fallbackTactics = "";
                if (/(shoot|scoring|3pt|three|points|shooter)/i.test(query)) {
                    fallbackTactics = `\n\n**Sideline Shooting Tactics:**\n${coachingDatabase.tactics.shooting}`;
                } else if (/(defense|defend|stop|tighten|defence)/i.test(query)) {
                    fallbackTactics = `\n\n**Sideline Defensive Tactics:**\n${coachingDatabase.tactics.defense}`;
                }
                
                return { 
                    text: `**Rotation Strategy Unavailable**\n\nTo generate custom substitution selections, please add at least two players to your roster (and toggle at least one player to 'ON' field status).${fallbackTactics}`, 
                    actions: [] 
                };
            }

            if (!isFollowUp) {
                aiConversationState.excludedOutPlayers = [];
                aiConversationState.excludedInPlayers = [];
            }
            
            const strategyResult = generateRotationStrategy(context, query);
            responseObj.text = strategyResult.text;
            responseObj.actions = strategyResult.actions;
            return responseObj;
        }

        // 12. Practice Coaching Drills / Tactical guides
        if (/drill|practice|training|exercise/i.test(query)) {
            aiConversationState.lastQueryType = 'drill';
            const drills = coachingDatabase.drills;
            if (/shoot|shooting/i.test(query)) { aiConversationState.lastDrillIndex = 1; return { text: drills[1] + "\n\n" + drills[4], actions: [] }; }
            if (/defense|defending|defensive/i.test(query)) { aiConversationState.lastDrillIndex = 2; return { text: drills[2], actions: [] }; }
            if (/speed|agility|footwork/i.test(query)) { aiConversationState.lastDrillIndex = 0; return { text: drills[0], actions: [] }; }
            if (/layup|finish|mikan/i.test(query)) { aiConversationState.lastDrillIndex = 3; return { text: drills[3], actions: [] }; }
            if (/passing|passing drill|pass/i.test(query)) { aiConversationState.lastDrillIndex = 5; return { text: drills[5] + "\n\n" + drills[6], actions: [] }; }
            if (/rebound|box out/i.test(query)) { aiConversationState.lastDrillIndex = 7; return { text: drills[7], actions: [] }; }
            
            const randIdx = Math.floor(Math.random() * drills.length);
            aiConversationState.lastDrillIndex = randIdx;
            return { text: "Here is a useful team drill:\n\n" + drills[randIdx], actions: [] };
        }

        if (/defense|defending|defensive|zone|man to man/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.defense, actions: [] }; }
        if (/shoot|shooting|form|beef/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.shooting, actions: [] }; }
        if (/rebound|box out|boxing out/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.rebounding, actions: [] }; }
        if (/spacing|offense spacing|offensive spacing/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.spacing, actions: [] }; }
        if (/passing|pass/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.passing, actions: [] }; }
        if (/fastbreak|transition/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.fastbreak, actions: [] }; }

        // 13. Knowledge Fallbacks: Weather Lookups
        if (/weather|temperature|temp|forecast/i.test(query)) {
            let city = "Melbourne"; 
            const match = query.match(/weather in ([a-zA-Z\s]+)/);
            if (match) city = match[1].trim();
            try {
                const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
                const geoData = await geoRes.json();
                if (geoData.results && geoData.results[0]) {
                    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${geoData.results[0].latitude}&longitude=${geoData.results[0].longitude}&current_weather=true`);
                    const temp = (await weatherRes.json()).current_weather.temperature;
                    return { text: `It is currently ${temp}°C in ${geoData.results[0].name}.`, actions: [] };
                }
            } catch (e) {}
        }

        // 14. Last Resort: Wikipedia API Search Lookups
        try {
            const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&origin=*`);
            const searchData = await searchRes.json();
            if (searchData[1] && searchData[1].length > 0) {
                const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchData[1][0])}`);
                const summaryData = await summaryRes.json();
                if (summaryData.extract) return { text: summaryData.extract, actions: [] };
            }
        } catch (e) {}

        // Custom Sideline Fallback
        return { text: "Sorry I didn't quite get that. Try asking for 'subs', 'basketball drills' or 'who has the most time total'", actions: [] };
    }

    return { processQuery };
})();