window.GuahhAI = (() => {
    let aiConversationState = {
        lastQueryType: null,
        lastSubGoal: 'any',
        lastSubSecondary: '',
        lastDrillIndex: -1,
        excludedOutPlayers: [],
        excludedInPlayers: [],
        lastSuggestionDetails: null, // Remembers rotation calculations
        
        // Dynamic game-state monitors
        tiredPlayers: [],
        injuredPlayers: [],
        cardedPlayers: {} // Tracks cards or foul status (e.g. 'yellow', 'red', 'foul trouble')
    };

    function parseHeightToInches(heightStr) {
        if (!heightStr) return 0;
        const s = String(heightStr).toLowerCase().trim();
        let feet = 0;
        let inches = 0;
        
        const ftMatch = s.match(/(\d+)\s*(?:ft|feet|'|’)/i);
        if (ftMatch) {
            feet = parseInt(ftMatch[1], 10);
            const rest = s.substring(ftMatch.index + ftMatch[0].length);
            const inMatch = rest.match(/(\d+)\s*(?:in|inches|")?/i);
            if (inMatch && inMatch[1]) {
                inches = parseInt(inMatch[1], 10);
            }
        } else {
            const simpleMatch = s.match(/(\d+)\s*[-'’\s]\s*(\d+)/);
            if (simpleMatch) {
                feet = parseInt(simpleMatch[1], 10);
                inches = parseInt(simpleMatch[2], 10);
            } else {
                const singleNumMatch = s.match(/^(\d+)$/);
                if (singleNumMatch) {
                    const val = parseInt(singleNumMatch[1], 10);
                    if (val > 30) {
                        return Math.round(val / 2.54);
                    } else if (val < 10) {
                        feet = val;
                    } else {
                        inches = val;
                    }
                }
            }
        }
        return (feet * 12) + inches;
    }

    // Built-in offline knowledge database
    const generalKnowledgeDB = {
        dog: "A dog is a domesticated carnivorous mammal of the canine family. Known as 'man's best friend,' they are highly social, loyal, and possess an excellent sense of smell and hearing. They have been bred by humans for thousands of years for work, protection, and companionship!",
        apple: "An apple is a sweet, round pomaceous edible fruit produced by an apple tree (Malus domestica). Apples are high in fiber, Vitamin C, and various antioxidants. They are incredibly popular worldwide, eaten raw, baked, or made into cider.",
        butterfly: "Butterflies go through a fascinating four-stage lifecycle called complete metamorphosis: \n1. **The Egg**: Laid on a leaf.\n2. **The Larva (Caterpillar)**: Hatches and eats continuously to grow.\n3. **The Pupa (Chrysalis)**: The caterpillar spins a protective casing where its body entirely reorganizes.\n4. **The Adult Butterfly**: Emerges fully formed, spreads its wings to dry, and flies away!",
        dunk: "A dunk (or slam dunk) is a high-flying basketball shot where a player leaps high into the air and forcefully drives the ball directly down through the hoop with one or both hands, often grabbing the rim. It is one of the most exciting, high-percentage, and momentum-shifting plays in sports!",
        offside: "In soccer, a player is caught in an offside position if they are nearer to the opponent's goal line than both the ball and the second-last opponent (usually the last defender) at the exact moment the ball is passed to them. It prevents attackers from simply waiting ('cherry-picking') near the opposing goal.",
        touchdown: "In American football, a touchdown is scored when a player runs the ball into, or catches a pass within, the opponent's end zone. It is worth 6 points and is followed by an opportunity to kick an extra point or try for a 2-point conversion.",
        home_run: "In baseball, a home run occurs when a batter hits the ball far enough (usually over the outfield fence) to circle all four bases and score a run safely in a single play, along with any other players already on base.",
        netball: "Netball is a fast-paced non-contact team sport played by two teams of seven players on a court divided into thirds. The objective is to score goals through a ring. Players are assigned strict positional zones (like GK, GD, WD, C, WA, GA, GS) and cannot run with the ball.",
        afl: "Australian Rules Football (commonly called AFL or Footy) is a fast, highly physical contact sport played on a large oval field between two teams of 18 players. The ball is kicked or handpassed, and points are scored by kicking the oval ball between tall goal posts (6 points for a goal, 1 point for a behind).",
        corner_kick: "In soccer, a corner kick is awarded to the attacking team when the ball leaves the play area across the opposing end line, having last been touched by a defending player. It is taken from the nearest corner arc and is a major scoring opportunity.",
        free_throw: "In basketball, a free throw (or foul shot) is an uncontested shot worth 1 point taken from behind the free-throw line (15 feet from the hoop) while the game clock is stopped. They are awarded following personal fouls by the opposing team.",
        photosynthesis: "Photosynthesis is the process used by plants, algae, and certain bacteria to harness energy from sunlight and turn it into chemical energy. They absorb carbon dioxide and water, using light energy to produce glucose (food) and release oxygen into the atmosphere!",
        sky_blue: "The sky is blue because of a phenomenon called Rayleigh scattering. Sunlight reaches Earth's atmosphere and is scattered in all directions by gases and particles in the air. Because blue light travels in smaller, shorter waves, it is scattered much more than other colors, making the sky appear blue to our eyes!",
        gravity: "Gravity is a fundamental force of nature that pulls objects toward one another. It is the force that keeps our feet on the ground, causes apples to fall from trees, and holds the Earth and other planets in orbit around the Sun. The more massive an object is, the stronger its gravitational pull!"
    };

    // Sideline casual conversational responses
    const casualResponses = {
        "thank you": "You're welcome! Let me know if you need any more sideline assistance.",
        "thanks": "You're welcome! Always happy to assist.",
        "how are you": "I'm doing great, ready to help you manage your game! How can I assist you on the sideline?",
        "good job": "Thank you! I appreciate it. Let's keep working to get the win!",
        "great job": "Thank you! I'm here to make coaching easier for you.",
        "goodbye": "Goodbye! Best of luck with the rest of your match!",
        "bye": "Goodbye! Let me know if you need any more strategies later on."
    };

    function matchGeneralKnowledge(q) {
        if (/butterfly|butterflies/i.test(q)) return generalKnowledgeDB.butterfly;
        if (/dog/i.test(q)) return generalKnowledgeDB.dog;
        if (/apple/i.test(q)) return generalKnowledgeDB.apple;
        if (/dunk|slam\s*dunk/i.test(q)) return generalKnowledgeDB.dunk;
        if (/offside/i.test(q)) return generalKnowledgeDB.offside;
        if (/touchdown/i.test(q)) return generalKnowledgeDB.touchdown;
        if (/home\s*run/i.test(q)) return generalKnowledgeDB.home_run;
        if (/netball/i.test(q)) return generalKnowledgeDB.netball;
        if (/afl|footy|australian\s*rules/i.test(q)) return generalKnowledgeDB.afl;
        if (/corner\s*kick/i.test(q)) return generalKnowledgeDB.corner_kick;
        if (/free\s*throw/i.test(q)) return generalKnowledgeDB.free_throw;
        if (/photosynthesis/i.test(q)) return generalKnowledgeDB.photosynthesis;
        if (/sky.*blue/i.test(q)) return generalKnowledgeDB.sky_blue;
        if (/gravity/i.test(q)) return generalKnowledgeDB.gravity;
        return null;
    }

    function trySolveMath(query) {
        let s = query.toLowerCase()
            .replace(/\bwhat\s+is\s+/g, '')
            .replace(/\bwhats\s+/g, '')
            .replace(/\bcalculate\s+/g, '')
            .replace(/\bmultiply\s+/g, '')
            .replace(/\bdivided\s+by\s+/g, '/')
            .replace(/\bmultiplied\s+by\s+/g, '*')
            .replace(/\btimes\s+/g, '*')
            .replace(/\bplus\s+/g, '+')
            .replace(/\bminus\s+/g, '-')
            .replace(/\bdivided\b/g, '/')
            .trim();
        
        s = s.replace(/(\d+)\s*x\s*(\d+)/g, '$1*$2');
        const cleanMath = s.replace(/[^0-9+\-*/().\s]/g, '').trim();
        
        if (/[0-9]/.test(cleanMath) && /[+\-*/]/.test(cleanMath)) {
            try {
                const result = new Function(`return (${cleanMath})`)();
                if (result !== undefined && !isNaN(result)) {
                    const originalExpr = cleanMath.replace(/\*/g, ' x ').replace(/\//g, ' / ');
                    return {
                        text: `🔢 **Math Solver:**\n\nExpression: **${originalExpr}**\nResult: **${result}**`,
                        actions: []
                    };
                }
            } catch (e) {}
        }
        return null;
    }

    const coachingDatabase = {
        drills: {
            basketball: [
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
            soccer: [
                "**Two-Touch Passing Grid (Control & Vision)**:\n1. Set up 4 cones to make a 10x10 meter square.\n2. Two players inside pass the ball back and forth with exactly two touches (one to receive, one to pass).\n3. Focus on active receiving angles and clean contact.",
                "**Cone Dribbling Slalom (Close Ball Control)**:\n1. Line up 6 cones spaced 1 meter apart.\n2. Players weave through cones using alternating feet and surfaces (inside, outside of foot).\n3. Accelerate cleanly after passing the final cone.",
                "**Give-and-Go Shooting (Combination & Finish)**:\n1. Attacker passes to a target player at the edge of the box and cuts past them.\n2. Target player lays off a soft, angled one-touch pass into space.\n3. Attacker strikes on goal cleanly without stopping the ball.",
                "**Defensive Containment Drill (Jockeying)**:\n1. In a 5x15 meter lane, one attacker dribbles forward.\n2. Defender jockeys backward, keeping low, knees bent, maintaining a 1.5-meter distance.\n3. Defender tackles only when the attacker over-extends or reaches the end line.",
                "**Ring of Fire (Passing & Pressurized Intercepts)**:\n1. Set up a 15-meter circle of 6 players with 1 defender in the middle.\n2. Circle players must pass cleanly to one another.\n3. Middle defender works to close down angles, force turnovers, or intercept. If defender secures ball, they swap out.",
                "**Overlap Crossing Drill (Flank Runs & Volleys)**:\n1. Midfielder passes to a winger making an overlapping run down the sideline.\n2. Winger controls and crosses into the penalty box on the second touch.\n3. Strikers timing their leads must finish with a clean half-volley or header on goal.",
                "**3v2 Transition Counter-Attack**:\n1. Three attackers sprint forward against two retreating defenders.\n2. Attackers must use width, pass into space, and pull defenders out of position before taking a strike on goal.\n3. Defenders focus on communication, delaying the attack, and forcing wide shots.",
                "**Corner Kick Delivery & Defensive Marking**:\n1. Attacker places corner kick targeting the near or far post.\n2. Defenders must match up tightly, keep body contact, and clear the ball high and wide.\n3. Offensive players work on checking their runs to meet the cross cleanly.",
                "**Possession Keeper Grid (4v4 + 2 Neutral)**:\n1. Set up a 20x20 meter grid.\n2. Two teams of 4 compete for possession, assisted by 2 neutral players who always play for the team on the ball.\n3. Teaches close-quarters vision, spatial awareness, and quick-release passing."
            ],
            footy: [
                "**Kick-to-Kick Leading Drill (Accuracy & Timing)**:\n1. Passer stands at center, target player starts 20 meters away.\n2. On whistle, target sprints at a sharp angle to receive the lead.\n3. Passer must hit them directly on the chest with a drop punt.",
                "**Handpass Weave (Coordination & Speed)**:\n1. Set up a zig-zag line of 4 players.\n2. Run alongside them executing rapid handpasses from left to right.\n3. Maintain clean hands, punching through the ball with a flat fist.",
                "**Ground Ball Sweep (Contested Pick-up)**:\n1. Players stand in pairs.\n2. Coach rolls the ball hard along the ground between them.\n3. Players compete to get low, shield the ball, and gather it cleanly in stride.",
                "**Clearance Extract Drill (Stoppage & Ruck)**:\n1. Ruckman contests a tossed ball in the center circle against a defender.\n2. On the tap, midfielders must read the flight, protect the drop zone, gather cleanly, and execute a quick handball or drop punt clear of the pack.",
                "**Target Lead & Mark (Tight Defensive Shepherding)**:\n1. Lead kicker starts on the wing. Forward player checks their run and leads hard back into space.\n2. Defender plays tight, trying to spoil the mark.\n3. Kicker must execute a low, spearing drop punt into the forward’s chest.",
                "**Boundary Set Shots (Angled Pocket Kicking)**:\n1. Place cones along the boundary pocket lines, 20-30 meters out.\n2. Players execute drop punts from difficult angles, accounting for wind drift.\n3. Teaches focus, trajectory control, and reliable scoring mechanics.",
                "**Handpass Grid Under Pressure**:\n1. Define a 10x10 meter grid with 4 attackers and 2 defenders.\n2. Attackers must handpass continuously while moving.\n3. Defenders close space and apply physical tackles. Focuses on rapid vision and protecting the ball.",
                "**Spoil & Recover (Defensive Backs)**:\n1. Midfielder kicks a high ball into the 50-meter arc.\n2. Defender waits behind the forward, leaps at the peak, and fists/spoils the ball away.\n3. Surrounding players sprint to recover the loose ground ball.",
                "**Oval Switch & Transition**:\n1. Backline gathers a loose ball on the flank.\n2. Immediately kick across the face of the goal to the opposite pocket to switch play.\n3. Midfielders run hard to provide leads and transition the ball rapidly down the oval."
            ],
            netball: [
                "**Chest Pass & Relocate (Spacing & Court Agility)**:\n1. Two players stand 5 meters apart.\n2. Player A chest-passes to Player B, then immediately cuts to a new open space.\n3. Relocate rapidly while maintaining eye contact.",
                "**Goal Circle Feeding Drill (Shooting Entry)**:\n1. Midcourt feeder stands at the edge of the circle.\n2. Shooter works against a defender inside the circle to break free.\n3. Feeder delivers a quick, high lob or bounce pass for the shot.",
                "**Defensive Intercept Drill (Anticipation)**:\n1. Feeder passes back and forth with an attacker.\n2. Defender hovers behind, timing their leap to tip or secure the pass cleanly in mid-air.",
                "**Goal Circle Rotation (Dodging & Clearance)**:\n1. Goal Shooter (GS) and Goal Attack (GA) work inside the shooting circle.\n2. They must continuously rotate, swapping positions and executing screen-and-rolls to pull defenders out of position.\n3. Create open feeding space for the feeder on the ring.",
                "**Defensive Rebounding & Box Out**:\n1. Shooter takes a shot from the edge of the circle.\n2. Goal Defence (GD) and Goal Keeper (GK) must immediately block out attackers using wide stances.\n3. Track the ball off the ring and leap aggressively to pull down the rebound.",
                "**Center Pass Tactical Launch**:\n1. Center (C) prepares to pass from the center circle.\n2. Wing Attack (WA) and Goal Attack (GA) execute crossing leads across the transverse line.\n3. C fires a sharp shoulder pass to WA, who immediately pivots to feed GA entering the circle.",
                "**Shoulder Pass Drive & Intercept**:\n1. Set up two lines of players 10 meters apart.\n2. Execute hard, long shoulder passes down the court.\n3. Defender in the center lane reads the passer's eyes and leaps to secure clean intercepts.",
                "**Fast Perimeter Footwork & Jockeying**:\n1. Defender matches up on an attacker on the circle edge.\n2. Defender must use rapid lateral footwork, keeping hands behind their back, to contain the attacker's drive.\n3. Force the attacker wide and away from the feeding line.",
                "**Spatial Boundary Dodge & Catch**:\n1. Attacker drives hard toward the sideline.\n2. Feeder delivers the ball right at the edge of the court.\n3. Attacker must leap, catch, secure balance, and land safely inside the line to avoid stepping out."
            ]
        },
        tactics: {
            'defense': "**Defensive Strategy**:\n- Focus on shifting collectively as the ball/play swings.\n- Pressure ball handlers, deny passing lanes, and match up your quickest defenders against their top scorers directly.",
            'shooting': "**Shooting Form Basics**:\n- **Balance**: Keep feet shoulder-width apart.\n- **Elbow/Arms**: Keep your release aligned directly under the ball.\n- **Eyes**: Focus entirely on the target, not the ball.\n- **Follow-through**: Release cleanly, flicking your wrist with high trajectory.",
            'rebounding': "**How to Box Out / Secure Space**:\n1. Locate your opponent as soon as the shot/ball is released.\n2. Make initial contact with forearm to track them.\n3. Reverse pivot to seal them behind your hips, drop into a low stance, and keep your arms wide.",
            'spacing': "**Offensive Spacing Guide**:\n- Maintain healthy passing lanes between perimeter players at all times.\n- If a teammate drives toward you, vacate that space and relocate to an open passing lane to stretch the defense out.",
            'passing': "**Precision Passing Fundamentals**:\n- Step toward your target and push the ball out, releasing cleanly with thumbs down.\n- Aim passes to rise to your teammate's waist.\n- Keep your release balanced and track movement patterns across lanes.",
            'fastbreak': "**Transition / Fastbreak Strategy**:\n- Rebounders must quickly turn and clear the ball with a rapid outlet pass to the wings.\n- Sprints down the wings stretch defensive coverage and create numerical advantages.",
            'zone': "**Zone Defense Countering**:\n- Fast perimeter ball movement swings the zone out of alignment.\n- Cutters should target the soft spots (gaps between defenders, high post, short corners).\n- Attack the gaps with drives, then kick the ball out to open shooters.",
            'press': "**Breaking Full Court Pressure**:\n- Establish a reliable safety valve receiver behind the ball handler.\n- Use quick, balanced chest passes down the court rather than dribbling blindly.\n- Maintain strong floor spacing, utilizing the middle of the court to release pressure.",
            'clutch': "**Clutch Situations Tactic**:\n- Run high pick-and-roll screen actions to force mismatch coverage.\n- Keep your most reliable shot-creator with the ball, while floor spacers spread out to the corners.\n- Defensively, communicate every switch and secure defensive rebounds at all costs."
        }
    };

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

    function findPlayer(query, playersArray) {
        if (!query || !playersArray) return null;
        const cleanQuery = query.toLowerCase().replace(/[\s#]/g, '').trim();
        if (!cleanQuery) return null;

        let found = playersArray.find(p => {
            const name = (p.name || p.playerName || "").toLowerCase().replace(/\s/g, '');
            const num = String(p.number || p.playerNumber || "").replace(/[\s#]/g, '');
            return name === cleanQuery || num === cleanQuery;
        });
        if (found) return found;

        found = playersArray.find(p => {
            const name = (p.name || p.playerName || "").toLowerCase().replace(/\s/g, '');
            return name.includes(cleanQuery) || cleanQuery.includes(name);
        });
        if (found) return found;

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

    // --- COGNITIVE SPACE-SEPARATED TOKEN NAME PARSER ---
    function extractPlayerNames(text, playersArray) {
        if (!text || !playersArray) return [];
        const found = [];
        const sortedPlayers = [...playersArray].sort((a, b) => {
            const nameA = (a.name || a.playerName || "");
            const nameB = (b.name || b.playerName || "");
            return nameB.length - nameA.length;
        });

        let remainingText = " " + text.toLowerCase().replace(/[\s,]+/g, ' ').trim() + " ";
        sortedPlayers.forEach(p => {
            const pName = (p.name || p.playerName || "").toLowerCase();
            if (!pName) return;
            const escapedName = pName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedName}\\b`, 'i');
            
            if (regex.test(remainingText)) {
                found.push(p);
                remainingText = remainingText.replace(regex, ' ');
            } else {
                const pNum = String(p.number || p.playerNumber || "");
                if (pNum && new RegExp(`\\b#?${pNum}\\b`).test(remainingText)) {
                    found.push(p);
                    remainingText = remainingText.replace(new RegExp(`\\b#?${pNum}\\b`), ' ');
                }
            }
        });
        return found;
    }

    // --- SPORT-SPECIFIC VOCABULARY NORMALIZATION TRANSLATOR ---
    function normalizeSportInputs(q, sport) {
        q = q.replace(/\bdefence\b/g, 'defense');
        
        if (sport === 'soccer') {
            q = q.replace(/\bpitch\b/g, 'court');
            q = q.replace(/\bfield\b/g, 'court');
            q = q.replace(/\bsubstitute\b/g, 'sub');
        } else if (sport === 'footy') {
            q = q.replace(/\bground\b/g, 'court');
            q = q.replace(/\boval\b/g, 'court');
            q = q.replace(/\binterchange\b/g, 'bench');
            q = q.replace(/\bsubstitute\b/g, 'sub');
        } else if (sport === 'netball') {
            q = q.replace(/\bthirds\b/g, 'court');
            q = q.replace(/\bsubstitute\b/g, 'sub');
        }
        return q;
    }

    // --- DYNAMIC INJURY RECOGNITION AUTO-SCANNER ---
    function scanNotesAndQueryForInjuries(notesStr, queryStr, playersList) {
        const foundInjured = [];
        const combinedText = ((notesStr || "") + " " + (queryStr || "")).toLowerCase();
        playersList.forEach(p => {
            const pName = (p.name || p.playerName || "").toLowerCase();
            if (!pName) return;
            const escapedName = pName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            
            const patterns = [
                new RegExp(`\\b${escapedName}\\b\\s+(?:is\\s+)?(?:injured|hurt|sprained|broken|out|unavailable|sick|bench|sore)`, 'i'),
                new RegExp(`(?:injured|hurt|sprained|broken|out|unavailable|sick|bench|sore)\\s+\\b${escapedName}\\b`, 'i')
            ];
            
            if (patterns.some(rx => rx.test(combinedText))) {
                foundInjured.push(p.name || p.playerName);
            }
        });
        return foundInjured;
    }

    // --- DYNAMIC TALLEST PLAYER CLASSIFIER ---
    function getTallestPlayers(playersList) {
        const valid = playersList.filter(p => {
            const inches = parseHeightToInches(p.height);
            return inches > 0;
        });
        if (valid.length === 0) return [];
        valid.sort((a, b) => parseHeightToInches(b.height) - parseHeightToInches(a.height));
        const maxHeight = parseHeightToInches(valid[0].height);
        return valid.filter(p => (maxHeight - parseHeightToInches(p.height)) <= 3).map(p => p.name || p.playerName);
    }

    function generateRotationStrategy(context, queryText, onField, offField, players, recentSubs) {
        onField = onField || context.onField || [];
        offField = offField || context.offField || [];
        players = players || context.players || [];
        recentSubs = recentSubs || context.recentSubs || [];

        let notesLower = ((context.notes || "") + " " + queryText).toLowerCase();
        
        let goal = aiConversationState.lastSubGoal || 'any';
        if (/(win|best|lose|behind|deficit|need to win|clutch|tight game|down by)/i.test(notesLower)) goal = 'win';
        else if (/(even|fair|playtime|equal|morale|balanced|balance playtime|garbage time|safe lead)/i.test(notesLower)) goal = 'even';

        let secondaryGoal = '';
        if (/(height|tall|size|rebound|boards|big)/i.test(notesLower)) secondaryGoal = 'height';
        else if (/(speed|fast|pace|quick|run|transition)/i.test(notesLower)) secondaryGoal = 'speed';
        else if (/(defense|defend|stop|tighten|defence|lockdown)/i.test(notesLower)) secondaryGoal = 'defense';
        else if (/(shoot|scoring|3pt|three|points|shooter|offense|offensive)/i.test(notesLower)) secondaryGoal = '3pt';

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
            return p ? parseHeightToInches(p.height) : 0;
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

        const isUnavailable = (name) => {
            if (aiConversationState.injuredPlayers.includes(name)) return true;
            if (aiConversationState.cardedPlayers[name] === 'red') return true;
            return false;
        };

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
            if (unavailablePlayers.includes(p.name)) { suggestedOut.push(p); reasonsList.push(`**Emergency Rest:** ${p.name} subbed off due to injury or card violation.`); }
        });

        candidatesOut = candidatesOut.filter(p => !suggestedOut.some(outP => outP.name === p.name));
        candidatesOut = candidatesOut.filter(p => !recentSubs.some(s => s.name === p.name && s.state === 'on'));
        if (candidatesOut.length === 0) candidatesOut = onField.filter(p => !suggestedOut.some(outP => outP.name === p.name));

        candidatesOut.sort((a, b) => {
            let scoreA = a.time;
            let scoreB = b.time;
            if (aiConversationState.tiredPlayers.includes(a.name)) scoreA += 10000;
            if (aiConversationState.tiredPlayers.includes(b.name)) scoreB += 10000;
            if (aiConversationState.cardedPlayers[a.name] === 'yellow' || aiConversationState.cardedPlayers[a.name] === 'foul trouble') scoreA += 5000;
            if (aiConversationState.cardedPlayers[b.name] === 'yellow' || aiConversationState.cardedPlayers[b.name] === 'foul trouble') scoreB += 5000;
            
            if (isWin) return (getRank(a.name) + a.points * 0.5 - scoreA * 0.01) - (getRank(b.name) + b.points * 0.5 - scoreB * 0.01); 
            return scoreB - scoreA;
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

        const avgCourtTime = onField.reduce((acc, p) => acc + p.time, 0) / (onField.length || 1);
        let tiredPlayers = candidatesOut.filter(p => p.time >= avgCourtTime || aiConversationState.tiredPlayers.includes(p.name));
        if (tiredPlayers.length === 0) tiredPlayers = candidatesOut;

        let numToSub = Math.min(tiredPlayers.length, candidatesIn.length);
        if (numToSub < 1 && candidatesOut.length > 0 && candidatesIn.length > 0) numToSub = 1;

        while (suggestedOut.length < numToSub && candidatesOut.length > 0) suggestedOut.push(candidatesOut.shift());
        while (suggestedIn.length < suggestedOut.length && candidatesIn.length > 0) suggestedIn.push(candidatesIn.shift());

        // "One tall on at all times" Check
        const enforceOneTall = /one\s+tall\s+on|tall\s+on\s+at\s+all\s+times|keep\s+a\s+tall/i.test(notesLower);
        if (enforceOneTall) {
            const tallNames = getTallestPlayers([...onField, ...offField].map(p => ({
                name: p.name,
                height: p.height
            })));
            
            if (tallNames.length > 0) {
                let futureOnFieldNames = onField.map(p => p.name)
                    .filter(n => !suggestedOut.some(o => o.name === n))
                    .concat(suggestedIn.map(i => i.name));
                
                const hasTallOnFuture = futureOnFieldNames.some(n => tallNames.includes(n));
                if (!hasTallOnFuture) {
                    const tallProposedOff = suggestedOut.find(p => tallNames.includes(p.name));
                    if (tallProposedOff) {
                        suggestedOut = suggestedOut.filter(p => p.name !== tallProposedOff.name);
                        if (suggestedIn.length > suggestedOut.length) {
                            suggestedIn.pop();
                        }
                        reasonsList.push(`**Height Lock Override**: Kept ${tallProposedOff.name} on the court to comply with notes: *"One tall on at all times"*`);
                    } else {
                        const tallOnBench = candidatesIn.find(p => tallNames.includes(p.name));
                        if (tallOnBench) {
                            suggestedIn.push(tallOnBench);
                            candidatesIn = candidatesIn.filter(p => p.name !== tallOnBench.name);
                            if (suggestedOut.length < suggestedIn.length && candidatesOut.length > 0) {
                                const nonTallOnField = candidatesOut.find(p => !tallNames.includes(p.name)) || candidatesOut[0];
                                if (nonTallOnField) suggestedOut.push(nonTallOnField);
                            }
                            reasonsList.push(`**Height Lock Override**: Bringing ${tallOnBench.name} on from bench to comply with notes: *"One tall on at all times"*`);
                        }
                    }
                }
            }
        }

        if (suggestedOut.length === 0) {
            return { text: `No recommended substitutions needed right now.`, actions: [] };
        }

        const outNames = suggestedOut.map(p => p.name), inNames = suggestedIn.map(p => p.name);
        
        outNames.forEach(n => {
            if (aiConversationState.tiredPlayers.includes(n)) reasonsList.push(`**Fatigue Management:** Resting ${n} who is reported as tired.`);
            if (aiConversationState.cardedPlayers[n] === 'yellow' || aiConversationState.cardedPlayers[n] === 'foul trouble') reasonsList.push(`**Foul Protection:** Resting ${n} to protect them from further card violations.`);
        });

        if (isWin) reasonsList.push("**Win Optimization:** Keeping high-value rating scorers on court.");
        else if (isEven) reasonsList.push("**Fair Play Optimization:** Rotating rest periods for balanced minutes.");
        else reasonsList.push("**Balanced Rotation:** Cycle completed to avoid over-exertion.");

        aiConversationState.excludedOutPlayers = [...outNames];
        aiConversationState.excludedInPlayers = [...inNames];
        aiConversationState.lastSubGoal = goal;
        aiConversationState.lastSubSecondary = secondaryGoal;

        aiConversationState.lastSuggestionDetails = {
            out: outNames,
            in: inNames,
            reasons: reasonsList
        };

        const futureOnField = [...onField.map(p => p.name).filter(n => !outNames.includes(n)), ...inNames];
        
        let textResponse = `**Lineup Strategy:** Sub **${outNames.join(' & ')}** OUT, and bring **${inNames.join(' & ')}** IN.\n\n**Key Factors:**\n`;
        reasonsList.forEach(r => textResponse += `- ${r}\n`);
        textResponse += `\n**Expected Lineup:** ${futureOnField.join(', ')}`;

        return {
            text: textResponse,
            actions: [{ type: 'SUB_PLAYERS', out: outNames, in: inNames }]
        };
    }

    async function processQuery(rawQuery, context) {
        let responseObj = { text: "", actions: [] };
        let activeTeam = null;
        if (typeof appData !== 'undefined' && appData.teams) {
            activeTeam = appData.teams.find(t => t.teamId === context.teamId);
        } else if (typeof clubData !== 'undefined' && clubData.teams) {
            activeTeam = clubData.teams.find(t => t.teamId === context.teamId);
        }
        const currentSport = activeTeam ? (activeTeam.sport || 'basketball').toLowerCase() : 'basketball';

        let query = convertSpokenNumbers(rawQuery.trim().toLowerCase());
        query = normalizeSportInputs(query, currentSport);

        if (!query) return { text: "No input detected.", actions: [] };

        // --- MATH SOLVER CHECK ---
        const mathResult = trySolveMath(query);
        if (mathResult) return mathResult;

        // --- GENERAL KNOWLEDGE OFFLINE SEARCH ---
        const offlineAnswer = matchGeneralKnowledge(query);
        if (offlineAnswer) {
            return { text: `📖 **Knowledge Assistant:**\n\n${offlineAnswer}`, actions: [] };
        }

        const onField = context.onField || [];
        const offField = context.offField || [];
        const players = context.players || [];
        const recentSubs = context.recentSubs || [];
        const allCurrentPlayers = [...onField, ...offField];

        // Dynamic situational tags
        let notesLower = ((context.notes || "") + " " + query).toLowerCase();
        let situationTag = "";
        let isClutch = /(clutch|tight\s+game|final\s+seconds|down\s+by|must\s+win|comeback|deficit)/i.test(notesLower);
        let isGarbage = /(garbage\s+time|up\s+by\s+a\s+lot|winning\s+big|safe\s+lead)/i.test(notesLower);
        
        if (isClutch) {
            aiConversationState.lastSubGoal = 'win';
            situationTag = "\n\n⚠️ **Game Context (CLUTCH MODE Active):** The game is in a critical stage. Prioritizing top-rated players and scorers, keeping our best on-court lineup active longer.";
        } else if (isGarbage) {
            aiConversationState.lastSubGoal = 'even';
            situationTag = "\n\n💚 **Game Context (DEVELOPMENT MODE Active):** We hold a comfortable lead. Prioritizing play development by distributing court time evenly and resting our elite starters.";
        }

        if (query === "sub suggestion" || query === "subs suggestion") {
            query = "generate substitutions";
        } else if (query === "we need to win") {
            query = "generate substitutions we need to win";
        } else if (query === "balance playtime") {
            query = "generate substitutions even playtime";
        }

        const discoveredInjured = scanNotesAndQueryForInjuries(context.notes, query, allCurrentPlayers);
        discoveredInjured.forEach(name => {
            if (!aiConversationState.injuredPlayers.includes(name)) {
                aiConversationState.injuredPlayers.push(name);
            }
        });

        // ==========================================
        // 🏁 STARTING LINEUP / SQUAD SELECTOR (WITH STRATEGY TYPE)
        // ==========================================
        const isStartingLineupQuery = /(?:starting\s*(?:lineup|team|five|5|roster|eleven|11|seven|7|squad)?|start\s+me\s+off|choose\s+starters|select\s+starters|recommend\s+starters|starting\s+players)/i.test(query);
        
        if (isStartingLineupQuery) {
            const teamId = context.teamId;
            if (!teamId) {
                return { text: "Please select a team in the app before setting up your starting lineup.", actions: [] };
            }
            
            const teamPlayers = players.filter(p => p.teamId === teamId);
            if (teamPlayers.length === 0) {
                return { text: "No players registered yet for this team. Please head to the **Manage** tab to create your roster first!", actions: [] };
            }

            // Extract the desired starters limit
            let starterLimit = 5; 
            const numMatch = query.match(/starting\s*(\d+)/i);
            if (numMatch) {
                starterLimit = parseInt(numMatch[1], 10);
            } else {
                if (/\bfive\b/i.test(query)) starterLimit = 5;
                else if (/\bseven\b/i.test(query)) starterLimit = 7;
                else if (/\beleven\b/i.test(query)) starterLimit = 11;
                else if (/\bsix\b/i.test(query)) starterLimit = 6;
                else {
                    if (currentSport === 'soccer') starterLimit = 11;
                    else if (currentSport === 'netball') starterLimit = 7;
                    else if (currentSport === 'footy') starterLimit = 18;
                    else if (typeof getMaxPlayers === 'function') {
                        try { starterLimit = getMaxPlayers(); } catch(e) {}
                    }
                }
            }

            // Identify the Strategy Type
            let strategyType = "optimal"; 
            if (/(dev|newer|younger|confidence|less\s+playtime|stamina|experience|fresh|learn|confidence)/i.test(query)) {
                strategyType = "developmental";
            } else if (/(balanced|balance|mix|equal)/i.test(query)) {
                strategyType = "balanced";
            }

            const getSkill = (p) => (p.skill || '').toLowerCase();
            const getRank = (p) => parseInt(p.rank) || 5;

            let starters = [];
            if (strategyType === "developmental") {
                // Developmental: Prioritize lower ratings to build confidence
                const pool = [...teamPlayers].sort((a, b) => getRank(a) - getRank(b));
                starters = pool.slice(0, starterLimit);
            } else if (strategyType === "balanced") {
                // Balanced: Blend of veteran anchors and developmental players
                const pool = [...teamPlayers].sort((a, b) => getRank(b) - getRank(a));
                const highCount = Math.ceil(starterLimit / 2);
                const lowCount = starterLimit - highCount;
                
                const topTier = pool.slice(0, highCount);
                const lowTier = pool.slice(highCount).reverse(); // lowest ratings first
                
                starters = [...topTier, ...lowTier.slice(0, lowCount)];
            } else {
                // Optimal: Maximizes rank, incorporating skill tag filters if present
                const pool = [...teamPlayers].sort((a, b) => {
                    let scoreA = getRank(a);
                    let scoreB = getRank(b);
                    if (/(defen|stop)/i.test(query)) {
                        if (getSkill(a).includes('defence') || getSkill(a).includes('defense')) scoreA += 5;
                        if (getSkill(b).includes('defence') || getSkill(b).includes('defense')) scoreB += 5;
                    } else if (/(shoot|scor|accuracy)/i.test(query)) {
                        if (getSkill(a).includes('accuracy') || getSkill(a).includes('star') || getSkill(a).includes('shot')) scoreA += 5;
                        if (getSkill(b).includes('accuracy') || getSkill(b).includes('star') || getSkill(b).includes('shot')) scoreB += 5;
                    } else if (/(speed|fast|pace)/i.test(query)) {
                        if (getSkill(a).includes('speed')) scoreA += 5;
                        if (getSkill(b).includes('speed')) scoreB += 5;
                    }
                    return scoreB - scoreA;
                });
                starters = pool.slice(0, starterLimit);
            }

            const starterNames = starters.map(p => p.playerName);
            const currentOnFieldNames = onField.map(p => p.name);
            const outNames = currentOnFieldNames.filter(name => !starterNames.includes(name));
            const inNames = starterNames.filter(name => !currentOnFieldNames.includes(name));

            // Select matching tactical reasoning
            let strategyReasoning = "";
            let strategyTitle = "Max Performance Lineup";
            if (strategyType === "developmental") {
                strategyTitle = "Development & Confidence Lineup";
                strategyReasoning = "This developmental starting lineup intentionally prioritizes players with lower ratings. Introducing newer players early allows them to build valuable court confidence, develop safe game rhythm, and gain real match experience while stamina reserves are full.";
            } else if (strategyType === "balanced") {
                strategyTitle = "Balanced Mixture Lineup";
                strategyReasoning = "This balanced starting strategy blends seasoned roster leaders with fresh talent. It establishes a secure backbone of high-rated anchors to guide early plays, while exposing developmental players to match rhythm in a safe environment.";
            } else {
                strategyReasoning = "This high-performance starting lineup places your highest-rated match assets on-court immediately. It focuses on securing an early competitive lead, establishing offensive efficiency, and matching opposing starters with maximum skill density.";
            }

            let responseText = `🏁 **Starting Lineup Recommendation:**\n\n`;
            responseText += `Strategy: **${strategyTitle}**\n`;
            responseText += `${strategyReasoning}\n\n`;
            responseText += `**Starters (${starters.length} selected):**\n`;
            starters.forEach((p, idx) => {
                responseText += `${idx + 1}. **#${p.playerNumber || 'N/A'} ${p.playerName}** (Rating: ${p.rank}/10${p.skill ? ` | ${p.skill}` : ''})\n`;
            });

            if (starters.length < starterLimit) {
                responseText += `\n*(Note: You requested ${starterLimit} players, but only ${starters.length} are registered on the team roster)*\n`;
            }

            responseText += `\nReady to put this lineup on the court? Click **Make Substitutes** to apply this starting roster.`;

            return {
                text: responseText,
                actions: [{ type: 'SUB_PLAYERS', out: outNames, in: inNames }]
            };
        }

        // ==========================================
        // 🏢 GATED INTELLIGENCE: CLUB & CROSS-TEAM ANALYSIS INTENTS
        // ==========================================
        const isBestAcrossTeams = /(best|top|mvp|star|highest\s+scoring)\s+player\s+across\s+(all|my|the)\s+teams/i.test(query) || /(best|top|star)\s+player\s+in\s+the\s+club/i.test(query);
        const isMostPlaytimeAcrossTeams = /(most\s+playtime|most\s+minutes|highest\s+playtime|active\s+player)\s+across\s+(all|my|the)\s+teams/i.test(query) || /(most\s+active|most\s+playtime)\s+player\s+in\s+the\s+club/i.test(query);
        const isHighestScoringTeam = /(highest\s+scoring|best\s+scoring|most\s+points)\s+team/i.test(query);
        const isClubAverages = /(average\s+points|avg\s+ppg|club\s+average|overall\s+average)\s+across\s+the\s+club/i.test(query);

        if (isBestAcrossTeams || isMostPlaytimeAcrossTeams || isHighestScoringTeam || isClubAverages) {
            let clubGameRecords = [];

            if (context.recentGames && Array.isArray(context.recentGames)) {
                context.recentGames.forEach(g => {
                    clubGameRecords.push({
                        teamName: g.teamName,
                        date: g.date || 'Unknown Date',
                        notes: g.notes || '',
                        players: g.players || []
                    });
                });
            }

            if (context.teams && Array.isArray(context.teams) && typeof context.apiCall === 'function') {
                try {
                    const teamFetches = context.teams.map(t => 
                        context.apiCall('get_stats', { teamId: t.teamId })
                            .then(res => {
                                if (res && Array.isArray(res.stats)) {
                                    res.stats.forEach(g => {
                                        const exists = clubGameRecords.some(r => r.teamName === t.teamName && r.date === g.date && r.notes === g.notes);
                                        if (!exists) {
                                            clubGameRecords.push({
                                                teamName: t.teamName,
                                                date: g.date || 'Unknown Date',
                                                notes: g.notes || '',
                                                players: g.players || []
                                            });
                                        }
                                    });
                                }
                            })
                            .catch(() => {})
                    );
                    await Promise.all(teamFetches);
                } catch (e) {
                    console.warn("Could not retrieve deep remote team stats, relying on local subset.", e);
                }
            }

            let playerStats = {};
            clubGameRecords.forEach(game => {
                const tName = game.teamName;
                game.players.forEach(p => {
                    const uniqueKey = `${p.name}|${tName}`;
                    if (!playerStats[uniqueKey]) {
                        playerStats[uniqueKey] = {
                            name: p.name,
                            teamName: tName,
                            totalPoints: 0,
                            totalTimeSecs: 0,
                            gamesCount: 0
                        };
                    }
                    playerStats[uniqueKey].totalPoints += parseInt(p.points) || 0;
                    playerStats[uniqueKey].totalTimeSecs += timeToSeconds(p.time);
                    playerStats[uniqueKey].gamesCount++;
                });
            });

            const statsArray = Object.values(playerStats);

            if (isBestAcrossTeams) {
                if (statsArray.length === 0) {
                    return { text: "No statistical logs have been uploaded across any of your teams yet.", actions: [] };
                }
                
                statsArray.sort((a, b) => b.totalPoints - a.totalPoints);
                const topTotalScorer = statsArray[0];

                const statsWithPPG = statsArray.map(p => ({
                    ...p,
                    ppg: p.gamesCount > 0 ? (p.totalPoints / p.gamesCount) : 0
                })).sort((a, b) => b.ppg - a.ppg);
                const topPPGScorer = statsWithPPG[0];

                let response = `### 👑 Leaderboards Across All Teams:\n\n`;
                response += `🏆 **Overall Leading Scorer:**\n`;
                response += `- **Player:** **${topTotalScorer.name}**\n`;
                response += `- **Team:** ${topTotalScorer.teamName}\n`;
                response += `- **Total Points Scored:** ${topTotalScorer.totalPoints} points over ${topTotalScorer.gamesCount} game(s)\n`;
                response += `- **Total Playing Time:** ${formatTime(topTotalScorer.totalTimeSecs)}\n\n`;

                if (topPPGScorer.name !== topTotalScorer.name) {
                    response += `⭐ **Highest Average Scorer (PPG):**\n`;
                    response += `- **Player:** **${topPPGScorer.name}**\n`;
                    response += `- **Team:** ${topPPGScorer.teamName}\n`;
                    response += `- **Avg PPG:** ${topPPGScorer.ppg.toFixed(1)} points per game (${topPPGScorer.totalPoints} points in ${topPPGScorer.gamesCount} game(s))\n\n`;
                }
                return { text: response, actions: [] };
            }

            if (isMostPlaytimeAcrossTeams) {
                if (statsArray.length === 0) {
                    return { text: "No court minutes have been synced across any teams yet.", actions: [] };
                }
                statsArray.sort((a, b) => b.totalTimeSecs - a.totalTimeSecs);
                const topPlaytime = statsArray[0];

                let response = `### ⏱️ Most Active Players (Playtime) Across All Teams:\n\n`;
                response += `- **Player Name:** **${topPlaytime.name}**\n`;
                response += `- **Team Roster:** ${topPlaytime.teamName}\n`;
                response += `- **Total Court Time:** **${formatTime(topPlaytime.totalTimeSecs)}**\n`;
                response += `- **Games Logged:** ${topPlaytime.gamesCount} game(s) played\n`;
                response += `- **Avg Time Per Game:** ${formatTime(Math.round(topPlaytime.totalTimeSecs / topPlaytime.gamesCount))}\n\n`;
                response += `*Protect their recovery cycle to keep them at peak performance!*`;
                return { text: response, actions: [] };
            }

            if (isHighestScoringTeam) {
                let teamPoints = {};
                clubGameRecords.forEach(game => {
                    const tName = game.teamName;
                    if (!teamPoints[tName]) {
                        teamPoints[tName] = { teamName: tName, totalPoints: 0, gamesCount: 0 };
                    }
                    game.players.forEach(p => {
                        teamPoints[tName].totalPoints += parseInt(p.points) || 0;
                    });
                    teamPoints[tName].gamesCount++;
                });

                const teamsArray = Object.values(teamPoints);
                if (teamsArray.length === 0) {
                    return { text: "No team-level points data has been recorded yet.", actions: [] };
                }
                const teamPPGArray = teamsArray.map(t => ({
                    ...t,
                    ppg: t.gamesCount > 0 ? (t.totalPoints / t.gamesCount) : 0
                })).sort((a, b) => b.ppg - a.ppg);

                let response = `### 🏀 Team Scoring Performance Rankings:\n\n`;
                teamPPGArray.forEach((t, i) => {
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "▪️";
                    response += `${medal} **${t.teamName}**\n`;
                    response += `   - **Average Points Per Game:** ${t.ppg.toFixed(1)} PPG\n`;
                    response += `   - **Total Points Scored:** ${t.totalPoints} points across ${t.gamesCount} match(es)\n\n`;
                });
                return { text: response, actions: [] };
            }

            if (isClubAverages) {
                let totalClubPoints = 0;
                let totalUniquePlayers = new Set();
                
                clubGameRecords.forEach(g => {
                    g.players.forEach(p => {
                        totalClubPoints += parseInt(p.points) || 0;
                        totalUniquePlayers.add(p.name);
                    });
                });

                const avgGameScore = clubGameRecords.length > 0 ? (totalClubPoints / clubGameRecords.length).toFixed(1) : 0;

                let response = `### 📊 Club Analytics Overview:\n\n`;
                response += `- **Total Games Logged**: ${clubGameRecords.length} match(es)\n`;
                response += `- **Combined points scored**: ${totalClubPoints} points\n`;
                response += `- **Club Average Game Score**: ${avgGameScore} points/game\n`;
                response += `- **Active Rostered Base**: ${totalUniquePlayers.size} unique players synced`;
                return { text: response, actions: [] };
            }
        }

        // --- CLUB ACCOUNT ADMIN INTENTS ---
        if (context.role === "CLUB_ACCOUNT_ADMIN") {
            const isClubSummary = /(summary|overview|status|progress|stats|club)/i.test(query);
            const isCoachesList = /(coach|coaches|members|staff)/i.test(query);
            const isPendingRequests = /(pending|request|join request|applications)/i.test(query);
            const isRecentGames = /(recent game|latest game|match|last play)/i.test(query);
            
            if (isClubSummary) {
                let summary = `### Club Summary: ${context.clubName || "Your Club"}\n\n`;
                summary += `- **Total Verified Coaches**: ${context.coaches ? context.coaches.length : 0}\n`;
                summary += `- **Active Managed Teams**: ${context.teams ? context.teams.length : 0}\n`;
                summary += `- **Pending Join Requests**: ${context.pendingRequests ? context.pendingRequests.length : 0}\n`;
                if (context.recentGames && context.recentGames.length > 0) {
                    summary += `- **Games Recorded**: ${context.recentGames.length} recent match(es) loaded.\n`;
                }
                return { text: summary, actions: [] };
            }
            if (isCoachesList) {
                if (!context.coaches || context.coaches.length === 0) {
                    return { text: "There are currently no active coaches registered in your club.", actions: [] };
                }
                let text = `### Coaches in ${context.clubName || "your club"}:\n\n`;
                context.coaches.forEach(c => {
                    const roleBadge = c.role === 'ADMIN' ? '👑 Admin' : 'Coach';
                    text += `- **${c.email}** (${roleBadge})\n`;
                });
                return { text: text, actions: [] };
            }
            if (isPendingRequests) {
                if (!context.pendingRequests || context.pendingRequests.length === 0) {
                    return { text: "You have no pending coach join requests at this time.", actions: [] };
                }
                let text = `### Pending Join Requests (${context.pendingRequests.length}):\n\n`;
                context.pendingRequests.forEach(r => {
                    text += `- **${r.coachEmail}** (Requested: ${new Date(r.requestedAt).toLocaleDateString()})\n`;
                });
                return { text: text, actions: [] };
            }
            if (isRecentGames) {
                if (!context.recentGames || context.recentGames.length === 0) {
                    return { text: "No recent games recorded by any teams in this club yet.", actions: [] };
                }
                let text = `### Recent Games in ${context.clubName || "your club"}:\n\n`;
                context.recentGames.forEach(g => {
                    text += `**${g.teamName}** (${g.date})\n`;
                    text += `- Duration: ${g.duration} | Notes: ${g.notes || "None"}\n`;
                    
                    if (g.players && Array.isArray(g.players) && g.players.length > 0) {
                        const topScorer = [...g.players].sort((a,b)=>parseInt(b.points)-parseInt(a.points))[0];
                        text += `- Top Scorer: ${topScorer.name} (#${topScorer.number}) with ${topScorer.points} points\n`;
                    }
                    text += `\n`;
                });
                return { text: text, actions: [] };
            }
        }

        // ==========================================
        // 🛡️ DUAL INTERACTIVE MATCHUP SELECTOR INTENT
        // ==========================================
        if (/(who\s+should\s+guard|who\s+should\s+defend|matchup\s+recommend|guard\s+their\s+best|stop\s+their\s+star|defensive\s+matchup)/i.test(query)) {
            if (players.length === 0) return { text: "No players registered on your roster yet. Please create team players in the Manage section.", actions: [] };
            
            const sortedDefenders = [...players].sort((a, b) => {
                const sA = (a.skill || '').toLowerCase().includes('defence') ? 5 : 0;
                const sB = (b.skill || '').toLowerCase().includes('defence') ? 5 : 0;
                return (parseInt(b.rank || 5) + sB) - (parseInt(a.rank || 5) + sA);
            });
            const topDefender = sortedDefenders[0];
            const secondaryDefender = sortedDefenders[1] || topDefender;
            
            let resText = `🛡️ **Defensive Matchup Analysis:**\n\n`;
            resText += `I recommend assigning **${topDefender.playerName}** (Rating: ${topDefender.rank}/10) as your primary defender on their best offensive player.\n`;
            if (topDefender.skill) resText += `- **Key Attributes**: ${topDefender.skill}\n`;
            resText += `\n**Alternative Option:** If ${topDefender.playerName} needs rest or is in foul trouble, utilize **${secondaryDefender.playerName}** (Rating: ${secondaryDefender.rank}/10) for matchup coverage. Let me know if you would like to generate custom substitutions around this matchup.`;
            return { text: resText, actions: [] };
        }

        // ==========================================
        // 📋 SPORT FORMATION STRUCTURALS INTENT
        // ==========================================
        if (/(formation|tactical\s+setup|system|lineup\s+structure|strategy\s+layout)/i.test(query)) {
            let resText = `📋 **Tactical Setup Recommendation:**\n\n`;
            if (currentSport === 'soccer') {
                resText += `For **Soccer**, I highly recommend running a **4-4-2 balanced formation** to secure the midfield while utilizing outer wing overlaps, or a **4-3-3 attacking style** if your squad can sustain high forward pressure.`;
            } else if (currentSport === 'footy') {
                resText += `For **Australian Football (AFL)**, establish a clear **6-6-6 structure** emphasizing center square ball extractions. Focus on keeping a reliable loose sweep option in your back 50.`;
            } else if (currentSport === 'netball') {
                resText += `For **Netball**, structure your spacing to rely on fast crossing leads across the transverse lines by WA and GA to break the defense before feed entry into the goal circle.`;
            } else {
                resText += `For **Basketball**, I recommend running a **4-out 1-in spacing model** if you have reliable shooters, or a standard **motion offense** using high screens to open up pick-and-roll mismatches.`;
            }
            return { text: resText, actions: [] };
        }

        // ==========================================
        // 📊 SQUAD STRENGTH & ROSTER EVALUATOR INTENT
        // ==========================================
        if (/(evaluate\s+my\s+team|how\s+is\s+our\s+roster|team\s+analysis|roster\s+feedback|squad\s+strength)/i.test(query)) {
            if (players.length === 0) return { text: "No roster players registered yet. Create players under the Manage section.", actions: [] };
            
            const avgRank = (players.reduce((acc, p) => acc + (parseInt(p.rank) || 5), 0) / players.length).toFixed(1);
            const highRanks = players.filter(p => (parseInt(p.rank) || 5) >= 7).map(p => p.playerName);
            const specialized = players.filter(p => p.skill).length;
            
            let resText = `📊 ** Roster Evaluation Report:**\n\n`;
            resText += `- **Total Registered Roster**: ${players.length} players\n`;
            resText += `- **Roster Average Rating**: ${avgRank}/10\n`;
            resText += `- **Specialized Attributes**: ${specialized} player(s) configured with skill tags.\n\n`;
            
            if (highRanks.length > 0) {
                resText += `⭐️ **Key Star Performers**: ${highRanks.join(', ')}\n`;
            }
            resText += `\n**Coaching Advice:** Ensure you balance court time regularly to preserve the physical stamina of your key players. Ready to execute dynamic rotation algorithms whenever you ask for 'subs'!`;
            return { text: resText, actions: [] };
        }

        // ==========================================
        // 🔥 CLUTCH PLAY CALLER INTENT
        // ==========================================
        if (/(clutch\s+play|final\s+seconds|last\s+play|winning\s+shot|down\s+by\s+1|down\s+by\s+2)/i.test(query)) {
            let playText = `🔥 **Clutch Situation Play Call:**\n\n`;
            if (currentSport === 'soccer') {
                playText += `**Tactic (Overload Box):** Move your tallest players into the penalty box. Execute a fast, long aerial cross or corner delivery, utilizing shields to block out their keeper and secure an header or scrap goal.`;
            } else if (currentSport === 'footy') {
                playText += `**Tactic (Long Bomb/Boundary Boundary):** Direct your midfielders to load up the 50-meter arc. Clear long, spearing drop punts straight to the pockets, looking to execute a quick mark and boundary set shot.`;
            } else if (currentSport === 'netball') {
                playText += `**Tactic (Screen & High Lob):** Feeders maintain position right on the circle edge. GA sets a heavy screen on GK, allowing GS to break open into space for a clean, high lob catch directly under the ring.`;
            } else {
                playText += `**Tactic (High Pick-and-Roll):** Run a high ball screen at the top of the key with your best playmaker and your tallest player. Spread shooters out to both corners to empty the paint for a drive or roll option.`;
            }
            return { text: playText, actions: [] };
        }

        // ==========================================
        // 🛡️ PRESS BREAKING TACTIC INTENT
        // ==========================================
        if (/(beat\s+(?:the\s+)?press|break\s+(?:the\s+)?press|full\s+court\s+press|pressuring\s+us)/i.test(query)) {
            let resText = `🛡️ **Tactical Press-Breaking Scheme:**\n\n`;
            resText += coachingDatabase.tactics.press + `\n\n**Actionable Step:** Use quick, short passes across lanes and make sure players run *toward* the ball handler to provide safety valve check-downs. Avoid long, slow floaters which are highly vulnerable to intercepts.`;
            return { text: resText, actions: [] };
        }

        // --- MOTIVATIONAL SIDEKICK TALK GENERATOR ---
        if (/(pep\s+talk|motivate|pep|inspiration|inspiring|losing|speech|morale|talk\s+to\s+the\s+team)/i.test(query)) {
            let pepTalk = "";
            if (currentSport === 'soccer') {
                pepTalk = "**Pep Talk (Soccer Focus)**:\n\"Alright team, look at me. The pitch is wide open, but we need to own the midfield! Protect our keeper, talk to each other on switches, and make those overlapping runs count. If they press, release the ball in two touches. Keep your heads up and fight for every possession. Let's make this pitch ours! Go get 'em!\"";
            } else if (currentSport === 'footy') {
                pepTalk = "**Pep Talk (AFL Footy Focus)**:\n\"Listen up! This oval is a battleground today. Ruckmen, I need big taps to our midfielders. Midfielders, hit the ground running, scoop up the ground balls under pressure, and spear those drop punts straight to our leading forwards. No hesitation, stay low, and back each other up. Let's show them what real footy is! Let's go!\"";
            } else if (currentSport === 'netball') {
                pepTalk = "**Pep Talk (Netball Focus)**:\n\"Bring it in! We need to sharpen our court thirds right now. WA and GA, work the circle edge with fast crossing leads. Shooter, dodge and create space—make sure you're holding your ground. Defence, I want heavy hands in their passing lanes, read the chest passes, and leap for those flying intercepts. Play clean, stay focused, and own this court. Squad on three! One, two, three, SQUAD!\"";
            } else {
                pepTalk = "**Pep Talk (Basketball Focus)**:\n\"Bring it in! We are beating them on paper, now let's beat them on the hardwood. Keep your floor spacing wide, drive hard, and kick it out to our shooters if the key collapses. On defense, box out, seal the space, and pull down every board. Play as one unit. Let's win this game on three! One, two, three, WIN!\"";
            }
            return { text: pepTalk, actions: [] };
        }

        // --- GAME STATE EXPLAINER ---
        if (/(why|explain|reason|how\s+did\s+you|why\s+those)/i.test(query) && aiConversationState.lastSuggestionDetails) {
            const d = aiConversationState.lastSuggestionDetails;
            return {
                text: `I recommended subbing **${d.out.join(', ')}** out for **${d.in.join(', ')}** because:\n\n` +
                      d.reasons.map(r => `- ${r}`).join('\n') +
                      `\n\nThis keeps your rotations balanced for the current strategy goal (**${aiConversationState.lastSubGoal.toUpperCase()}**).`,
                actions: []
            };
        }

        // --- SIDELINE FATIGUE & CARD MONITOR PARSER ---
        const tiredMatch = query.match(/([a-z0-9\s#]+)\s+(?:is|are)?\s*(tired|exhausted|gasping|fatigued|needs?\s+a\s+rest|resting)/i);
        if (tiredMatch && !query.includes('sub') && !query.includes('swap')) {
            const target = tiredMatch[1].trim();
            const p = findPlayer(target, allCurrentPlayers);
            if (p) {
                if (!aiConversationState.tiredPlayers.includes(p.name)) {
                    aiConversationState.tiredPlayers.push(p.name);
                }
                const strategy = generateRotationStrategy(context, query, onField, offField, players, recentSubs);
                return {
                    text: `Flagged **${p.name}** as tired on the sideline. Generating rotation strategy to rest them:\n\n${strategy.text}`,
                    actions: strategy.actions
                };
            }
        }

        const injuryMatch = query.match(/([a-z0-9\s#]+)\s+(?:is|are)?\s*(injured|hurt|sick|late|absent|unwell|sore|sprained)/i);
        if (injuryMatch && !query.includes('sub') && !query.includes('swap')) {
            const target = injuryMatch[1].trim();
            const p = findPlayer(target, allCurrentPlayers);
            if (p) {
                if (!aiConversationState.injuredPlayers.includes(p.name)) {
                    aiConversationState.injuredPlayers.push(p.name);
                }
                const strategy = generateRotationStrategy(context, query, onField, offField, players, recentSubs);
                return {
                    text: `Flagged **${p.name}** as injured. Removing them from rotation pool:\n\n${strategy.text}`,
                    actions: strategy.actions
                };
            }
        }

        const recoverMatch = query.match(/([a-z0-9\s#]+)\s+(?:is|are)?\s*(good\s+to\s+go|recovered|healthy|fine|cleared)/i);
        if (recoverMatch) {
            const target = recoverMatch[1].trim();
            const p = findPlayer(target, allCurrentPlayers);
            if (p) {
                aiConversationState.tiredPlayers = aiConversationState.tiredPlayers.filter(n => n !== p.name);
                aiConversationState.injuredPlayers = aiConversationState.injuredPlayers.filter(n => n !== p.name);
                if (aiConversationState.cardedPlayers[p.name] === 'red') {
                    delete aiConversationState.cardedPlayers[p.name];
                }
                return { text: `Cleared **${p.name}** to healthy status. They are now fully available in rotation selections.`, actions: [] };
            }
        }

        const cardMatch = query.match(/([a-z0-9\s#]+)\s+(?:got\s+a|has\s+a|is\s+on)?\s*(yellow\s+card|red\s+card|foul\s+trouble)/i);
        const countFoulMatch = query.match(/([a-z0-9\s#]+)\s+(?:is\s+on|has)\s+(\d+)\s+fouls?/i);

        if (cardMatch) {
            const target = cardMatch[1].trim();
            const type = cardMatch[2].toLowerCase();
            const p = findPlayer(target, allCurrentPlayers);
            if (p) {
                if (type.includes('red')) {
                    aiConversationState.cardedPlayers[p.name] = 'red';
                    const strategy = generateRotationStrategy(context, query, onField, offField, players, recentSubs);
                    return {
                        text: `Flagged **${p.name}** with a red card. Ejecting them and calling rotation adjustments:\n\n${strategy.text}`,
                        actions: strategy.actions
                    };
                } else if (type.includes('yellow')) {
                    aiConversationState.cardedPlayers[p.name] = 'yellow';
                    return { text: `Recorded a yellow card on **${p.name}**. I will manage their minutes conservatively in upcoming suggestions.`, actions: [] };
                } else if (type.includes('foul')) {
                    aiConversationState.cardedPlayers[p.name] = 'foul trouble';
                    return { text: `Recorded foul trouble warning on **${p.name}**. Keeping a close eye on their court time.`, actions: [] };
                }
            }
        } else if (countFoulMatch) {
            const target = countFoulMatch[1].trim();
            const fouls = parseInt(countFoulMatch[2], 10);
            const p = findPlayer(target, allCurrentPlayers);
            if (p) {
                if (fouls >= 4) {
                    aiConversationState.cardedPlayers[p.name] = 'foul trouble';
                    const strategy = generateRotationStrategy(context, query, onField, offField, players, recentSubs);
                    return {
                        text: `Flagged **${p.name}** with foul trouble (${fouls} fouls). Generating rotation strategy to protect them:\n\n${strategy.text}`,
                        actions: strategy.actions
                    };
                } else {
                    return { text: `Recorded ${fouls} fouls on **${p.name}**. Status is safe.`, actions: [] };
                }
            }
        }

        if (query.includes("what can you do") || query.includes("what you can do") || query.includes("features") || query === "help") {
            if (context.role === "CLUB_ACCOUNT_ADMIN") {
                return {
                    text: "**Here is what I can do for you as a Club Admin:**\n\n" +
                          "1. **Club Overview**: Ask for \"club summary\" or \"club overview\" to get stats on coaches, teams, and requests.\n" +
                          "2. **Staff Tracking**: Ask \"who are my coaches\" or \"list coaches\" to see verified members.\n" +
                          "3. **Pending Approvals**: Ask \"do I have join requests\" or \"pending requests\" to monitor applicants.\n" +
                          "4. **Live Match Feed**: Ask \"show recent games\" or \"latest matches\" to review recently logged game statistics across all club teams.\n" +
                          "5. **Global Standings**: Ask \"who is the best player across all teams\" or \"highest scoring team\" to get analytical performance leaderboards.",
                    actions: []
                };
            }
            return {
                text: "**Here is what I can do for you on the sidelines:**\n\n" +
                      "1. **Lineup & Rotation Strategy**: Ask for \"subs suggestion\" or say \"we need defence/shooters\" to get instant player rotations.\n" +
                      "2. **Real-time Substitutions**: Say \"sub in [Name]\" or \"swap [Name] with [Name]\".\n" +
                      "3. **In-Game Point Adjustments**: Say \"[Name] scored a layup\" or \"add 3 points to [Name]\".\n" +
                      "4. **Interactive Drills & Play Tactics**: Say \"make me a drill\" or ask about \"zone defense\".\n" +
                      "5. **Sideline Data Analytics**: Ask \"who's my best player\", \"who is my tallest player\", or \"who's the best defender\".\n" +
                      "6. **Live Court Overviews**: Ask \"who's on court right now\" or \"who is on the bench\".\n" +
                      "7. **Game Timer Commands**: Ask me to \"pause the game\" or \"start the clock\".",
                    actions: []
            };
        }

        if (/(?:add|load|populate|import)\s+(?:default\s+)?(players|roster|team)/i.test(query)) {
            responseObj.text = "Opening the confirmation modal to import your default team roster.";
            responseObj.actions.push({ type: 'ADD_DEFAULT_PLAYERS' });
            return responseObj;
        }

        if (/(?:finish|save|end|complete|stop|wrap\s+up)\s+(?:the\s+)?game/i.test(query)) {
            responseObj.text = "Opening the save confirmation modal to finish this game.";
            responseObj.actions.push({ type: 'FINISH_GAME' });
            return responseObj;
        }

        const timerMatch = query.match(/(start|resume|pause|stop|reset|freeze|unpause)\s+(?:the\s+)?(timer|game|clock|match)/i);
        if (timerMatch) {
            const actionType = timerMatch[1].toLowerCase();
            let aiAction = "";
            if (['start', 'resume', 'unpause'].includes(actionType)) { aiAction = "TIMER_START"; responseObj.text = "Starting the game timer."; }
            else if (['pause', 'stop', 'freeze'].includes(actionType)) { aiAction = "TIMER_PAUSE"; responseObj.text = "Pausing the game timer."; }
            else if (['reset'].includes(actionType)) { aiAction = "TIMER_RESET"; responseObj.text = "Resetting the game timer."; }
            
            if (aiAction) responseObj.actions.push({ type: aiAction });
            return responseObj;
        }

        // --- GLOBAL FULL-SQUAD SWAP ACTIONS ---
        const isFullSwap = /sub\s+(?:the\s+)?bench\s+for\s+(?:the\s+)?(court|field)/i.test(query) || 
                           /swap\s+(?:the\s+)?bench\s+(?:and|with)\s+(?:the\s+)?(court|field)/i.test(query) ||
                           /swap\s+(?:the\s+)?court\s+and\s+(?:the\s+)?bench/i.test(query) ||
                           /swap\s+everyone/i.test(query) ||
                           /sub\s+everyone/i.test(query);

        if (isFullSwap) {
            let activeBench = offField.filter(p => !aiConversationState.injuredPlayers.includes(p.name) && aiConversationState.cardedPlayers[p.name] !== 'red');
            let outNames = onField.map(p => p.name);
            let inNames = activeBench.map(p => p.name);

            if (inNames.length > 0) {
                responseObj.text = `🔄 **Full Squad Swap:** Swapping the entire lineup!\n\n**Bringing ON:** ${inNames.join(', ')}\n**Taking OFF:** ${outNames.join(', ')}`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: outNames, in: inNames });
                return responseObj;
            } else {
                return { text: "There are currently no active bench players available to sub on.", actions: [] };
            }
        }

        // --- COMMA-FREE MULTI-PLAYER SWAP PARSER ---
        let multiSwapMatch = query.match(/(?:sub|bring|put|swap|replace)\s+(.+?)\s+(?:on|in)?\s*for\s+(.+)/i);
        if (!multiSwapMatch) {
            multiSwapMatch = query.match(/(?:replace|swap)\s+(.+?)\s+(?:with|and)\s+(.+)/i);
        }

        if (multiSwapMatch) {
            let incomingRaw = multiSwapMatch[1].trim();
            let outgoingRaw = multiSwapMatch[2].trim();

            let inPlayersResolved = extractPlayerNames(incomingRaw, offField);
            let outPlayersResolved = extractPlayerNames(outgoingRaw, onField);

            if (inPlayersResolved.length === 0 && outPlayersResolved.length === 0) {
                inPlayersResolved = extractPlayerNames(incomingRaw, players);
                outPlayersResolved = extractPlayerNames(outgoingRaw, players);
            }

            if (inPlayersResolved.length > 0 || outPlayersResolved.length > 0) {
                let textParts = [];
                let inNames = inPlayersResolved.map(p => p.name);
                let outNames = outPlayersResolved.map(p => p.name);

                if (inNames.length > 0 && outNames.length > 0) {
                    textParts.push(`Substituting **${inNames.join(' & ')}** ON for **${outNames.join(' & ')}** OFF.`);
                } else if (inNames.length > 0) {
                    textParts.push(`Substituting **${inNames.join(' & ')}** ON.`);
                } else if (outNames.length > 0) {
                    textParts.push(`Substituting **${outNames.join(' & ')}** OFF.`);
                }

                responseObj.text = textParts.join('\n');
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: outNames, in: inNames });
                return responseObj;
            }
        }

        const subInMatch = query.match(/(?:sub|bring|put|play)\s+(?:in\s+)?([a-z0-9\s#]+)\s*(?:on)?/i);
        const subOutMatch = query.match(/(?:sub|take|sit|bench|rest|remove)\s+(?:out\s+)?([a-z0-9\s#]+)\s*(?:off)?/i);

        if (subInMatch && !query.includes('for') && !query.includes('with') && !query.includes('and')) {
            const target = subInMatch[1].trim();
            const matchedPlayers = extractPlayerNames(target, offField);
            
            if (matchedPlayers.length > 0) {
                const names = matchedPlayers.map(p => p.name);
                responseObj.text = `Substituting **${names.join(' & ')}** ON.`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: [], in: names });
            } else {
                const alreadyOn = extractPlayerNames(target, onField);
                if (alreadyOn.length > 0) {
                    responseObj.text = `**${alreadyOn.map(p => p.name).join(' & ')}** are already on the field.`;
                } else {
                    responseObj.text = `I couldn't locate any available bench players matching "${target}".`;
                }
            }
            return responseObj;
        }

        if (subOutMatch && !query.includes('for') && !query.includes('with') && !query.includes('and')) {
            const target = subOutMatch[1].trim();
            const matchedPlayers = extractPlayerNames(target, onField);
            
            if (matchedPlayers.length > 0) {
                const names = matchedPlayers.map(p => p.name);
                responseObj.text = `Substituting **${names.join(' & ')}** OFF.`;
                responseObj.actions.push({ type: 'SUB_PLAYERS', out: names, in: [] });
            } else {
                const alreadyOff = extractPlayerNames(target, offField);
                if (alreadyOff.length > 0) {
                    responseObj.text = `**${alreadyOff.map(p => p.name).join(' & ')}** are already resting on the bench.`;
                } else {
                    responseObj.text = `I couldn't locate any active court players matching "${target}".`;
                }
            }
            return responseObj;
        }

        // --- DYNAMIC SPORT-SPECIFIC POINTS PARSER CONTROLLER ---
        let pointsAmount = 0;
        let targetNameRaw = "";
        let naturalActionLabel = "";

        if (currentSport === 'footy') {
            const footyGoalMatch = query.match(/([a-z0-9\s#]+)\s+(?:kicked|scored|got)\s+(?:a\s+)?goal/i);
            const footyBehindMatch = query.match(/([a-z0-9\s#]+)\s+(?:kicked|scored|got)\s+(?:a\s+)?behind/i);
            if (footyGoalMatch) {
                targetNameRaw = footyGoalMatch[1].trim();
                pointsAmount = 6;
                naturalActionLabel = "goal (6 points)";
            } else if (footyBehindMatch) {
                targetNameRaw = footyBehindMatch[1].trim();
                pointsAmount = 1;
                naturalActionLabel = "behind (1 point)";
            }
        } else if (currentSport === 'soccer') {
            const soccerGoalMatch = query.match(/([a-z0-9\s#]+)\s+(?:scored|kicked|headed|got)\s+(?:a\s+)?goal/i);
            if (soccerGoalMatch) {
                targetNameRaw = soccerGoalMatch[1].trim();
                pointsAmount = 1;
                naturalActionLabel = "goal (1 point)";
            }
        } else if (currentSport === 'netball') {
            const netballGoalMatch = query.match(/([a-z0-9\s#]+)\s+(?:scored|shot|sunk|got)\s+(?:a\s+)?goal/i);
            if (netballGoalMatch) {
                targetNameRaw = netballGoalMatch[1].trim();
                pointsAmount = 1;
                naturalActionLabel = "goal (1 point)";
            }
        }

        if (pointsAmount === 0 && targetNameRaw === "") {
            const pointsMatch = query.match(/(add|give|award|plus|subtract|remove|minus|take\s+away)\s+(\d+)\s*(?:pts|points|point)?\s*(?:to|for|from)?\s+([a-zA-Z0-9\s#]+)/i);
            const bballActionMatch = query.match(/([a-z0-9\s#]+)\s+(scored|got|made|hit)\s+(?:a\s+)?(layup|basket|jumper|shot|free\s*throw|three|3-pointer|3\s*pointer|3|2|1)/i);

            if (pointsMatch) {
                const operation = /(subtract|remove|minus|take\s+away)/i.test(pointsMatch[1]) ? -1 : 1;
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
        }

        if (pointsAmount !== 0 && targetNameRaw !== "") {
            const targetPlayer = findPlayer(targetNameRaw, allCurrentPlayers);

            if (targetPlayer) {
                if (naturalActionLabel) {
                    responseObj.text = `Nice! Added **${pointsAmount}** points to **${targetPlayer.name}** for scoring that ${naturalActionLabel}.`;
                } else {
                    responseObj.text = `${pointsAmount > 0 ? 'Added' : 'Subtracted'} ${Math.abs(pointsAmount)} points ${pointsAmount > 0 ? 'to' : 'from'} **${targetPlayer.name}**.`;
                }
                responseObj.actions.push({ type: 'UPDATE_POINTS', targetName: targetPlayer.name, amount: pointsAmount });
            } else {
                responseObj.text = `I couldn't find a player named or numbered "${targetNameRaw}" currently in the game.`;
            }
            return responseObj;
        }

        // --- COURT & BENCH LINEUP DETECTORS ---
        if (/(who's\s+on\s+(?:the\s+)?court|who\s+is\s+on\s+(?:the\s+)?court|court\s+players|who\s+is\s+playing|who's\s+playing|current\s+lineup|active\s+lineup|who\s+is\s+on\s+field|who's\s+on\s+field)/i.test(query)) {
            if (onField.length === 0) {
                return { text: "No players are currently assigned on the court.", actions: [] };
            }
            const activeLineup = onField.map(p => `#${p.number || p.playerNumber || ''} ${p.name}`.trim()).join('\n- ');
            return { text: `**Active Court Lineup (${onField.length} active):**\n\n- ${activeLineup}`, actions: [] };
        }

        if (/(who's\s+on\s+(?:the\s+)?bench|who\s+is\s+on\s+(?:the\s+)?bench|bench\s+players|who's\s+benched|who\s+is\s+benched|who\s+is\s+resting|who's\s+resting|show\s+(?:the\s+)?bench)/i.test(query)) {
            if (offField.length === 0) {
                return { text: "No players are currently sitting on the bench.", actions: [] };
            }
            const benchLineup = offField.map(p => `#${p.number || p.playerNumber || ''} ${p.name}`.trim()).join('\n- ');
            return { text: `**Bench Lineup (${offField.length} resting):**\n\n- ${benchLineup}`, actions: [] };
        }

        const statsQueryMatch = query.match(/(?:stats?\s+(?:for|of)\s+([a-zA-Z0-9\s#]+))|(([a-zA-Z0-9\s#]+)\s+stats?)/i);
        if (statsQueryMatch) {
            const rawTarget = (statsQueryMatch[1] || statsQueryMatch[2] || "").replace(/\bstats?\b/g, "").trim();
            const playerProfile = findPlayer(rawTarget, players);
            
            if (playerProfile) {
                let statSummary = `### Player Profile: ${playerProfile.playerName}\n`;
                statSummary += `- **Number**: #${playerProfile.playerNumber || 'N/A'}\n`;
                statSummary += `- **Rating**: ${playerProfile.rank || '5'}/10\n`;
                statSummary += `- **Height**: ${playerProfile.height ? playerProfile.height : 'N/A'}\n`;
                statSummary += `- **Registered Skills**: ${playerProfile.skill || 'None configured'}\n\n`;

                if (context.teamId) {
                    try {
                        const res = await context.apiCall('get_stats', { teamId: context.teamId });
                        if (res.stats && res.stats.length > 0) {
                            let matchesCount = 0;
                            let totalPoints = 0;
                            let totalMinutesSecs = 0;
                            
                            res.stats.forEach(game => {
                                const gameRecord = game.players.find(p => p.name.toLowerCase() === playerProfile.playerName.toLowerCase());
                                if (gameRecord) {
                                    matchesCount++;
                                    totalPoints += parseInt(gameRecord.points) || 0;
                                    totalMinutesSecs += timeToSeconds(gameRecord.time);
                                }
                            });

                            if (matchesCount > 0) {
                                statSummary += `**Server Statistics (across ${matchesCount} recorded matches):**\n`;
                                statSummary += `- **Total Points Scored**: ${totalPoints}\n`;
                                statSummary += `- **Avg PPG**: ${(totalPoints / matchesCount).toFixed(1)}\n`;
                                statSummary += `- **Total Playing Minutes**: ${formatTime(totalMinutesSecs)}`;
                            } else {
                                statSummary += `*No matches recorded for this player yet.*`;
                            }
                        }
                    } catch (e) {}
                }
                return { text: statSummary, actions: [] };
            }
        }

        if (/(tallest|highest\s+height|who\s+is\s+the\s+tallest|tallest\s+player)/i.test(query)) {
            const validHeightPlayers = players.filter(p => p.height && parseHeightToInches(p.height) > 0);
            if (validHeightPlayers.length > 0) {
                validHeightPlayers.sort((a, b) => parseHeightToInches(b.height) - parseHeightToInches(a.height));
                const tallest = validHeightPlayers[0];
                return { text: `The tallest player registered is **${tallest.playerName}** measuring **${tallest.height}** tall.`, actions: [] };
            }
            return { text: "No height parameters have been configured on the register player forms yet.", actions: [] };
        }

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

        const greetings = ['hello', 'hi', 'hey', 'yo', 'gday', 'g\'day', 'whats up', 'what\'s up'];
        const lowerQuery = query.toLowerCase().trim();
        if (greetings.includes(lowerQuery) || lowerQuery === "hi guahh ai" || lowerQuery === "hello guahh ai") {
            return { text: "Hello! How can I assist you today?", actions: [] };
        }

        for (const key of Object.keys(casualResponses)) {
            if (query.includes(key)) return { text: casualResponses[key], actions: [] };
        }

        const isBestPlayerQuery = /(who is|who's|whos).* (best|mvp|top|star) (player|scorer|on my team|on our team)/i.test(query);
        const isHistoricalQuery = /(who has|who).*(least|lowest|most|highest).*(time|playtime|minutes|points).*(total|overall|all time|history)/i.test(query);
        const isAvgPoints = /(average|avg)\s+(?:points|pts)/i.test(query);
        const isTotalGames = /(total|how many)\s+(?:games|recorded|played)/i.test(query);
        
        const isBestDefender = /(best|top|strongest|reliable|anchor)\s+defender/i.test(query);
        const isBestShooter = /(best|top|sharpshooter|deadly|shooter|scoring\s+option)/i.test(query);
        const isBestPasser = /(best|top|quickest|passer|playmaker|maker|creator|handler|hands)/i.test(query);
        const isBestRebounder = /(best|top|rebounder|board|glass)/i.test(query);
        const isFastestPlayer = /(fastest|quickest|speedster|speedy)\s+player/i.test(query);
        const isAllRounder = /(all-rounder|allrounder|good\s+at\s+everything|smartest|highest\s+iq)/i.test(query);
        
        const isTeamSummary = /(summary|overview|status|progress|stats)/i.test(query);

        if (isBestPlayerQuery || isHistoricalQuery || isAvgPoints || isTotalGames || isBestDefender || isBestShooter || isBestPasser || isBestRebounder || isFastestPlayer || isAllRounder || isTeamSummary) {
            if (!context.teamId) return { text: "Please select a team in the app first to analyze historical data.", actions: [] };
            
            try {
                const res = await context.apiCall('get_stats', { teamId: context.teamId });
                if (!res.stats || res.stats.length === 0) return { text: "There are no past games recorded on the server for this team yet.", actions: [] };

                let aggregate = {};
                players.forEach(p => {
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

                if (isTotalGames) {
                    return { text: `We have played a total of **${res.stats.length}** recorded game(s) on the server.`, actions: [] };
                }

                if (isAvgPoints) {
                    let totalTeamPoints = 0;
                    res.stats.forEach(game => {
                        game.players.forEach(p => { totalTeamPoints += parseInt(p.points) || 0; });
                    });
                    const avgPPG = (totalTeamPoints / res.stats.length).toFixed(1);
                    return { text: `Our team is averaging **${avgPPG} points per game** across ${res.stats.length} recorded match(es).`, actions: [] };
                }

                if (isBestDefender) {
                    const defenders = aggArray.filter(p => /(defence|defense|rebounding|block|containment|jockeying|intercept|tackle)/i.test(p.skill));
                    if (defenders.length > 0) {
                        defenders.sort((a,b) => b.rank - a.rank);
                        const anchor = defenders[0];
                        return { text: `Our defensive anchor is **${anchor.name}**. They have a base rating of ${anchor.rank}/10, designated with the skill tags: "${anchor.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `We don't have registered defense tags, but based on player ratings, **${aggArray[0].name}** is our most reliable defensive matchup.`, actions: [] };
                }

                if (isBestShooter) {
                    const shooters = aggArray.filter(p => /(3 point|accuracy|shot|shooter|scoring|feed)/i.test(p.skill));
                    if (shooters.length > 0) {
                        shooters.sort((a,b) => b.totalPoints - a.totalPoints);
                        const topShooter = shooters[0];
                        return { text: `Our premier sharpshooter is **${topShooter.name}**, scoring ${topShooter.totalPoints} points overall with registered skill tags: "${topShooter.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.totalPoints - a.totalPoints);
                    return { text: `Based on overall historical scoring, **${aggArray[0].name}** is our top shooting option with ${aggArray[0].totalPoints} total points.`, actions: [] };
                }

                if (isBestPasser) {
                    const passers = aggArray.filter(p => /(pass|passing|playmaker|assist|handles)/i.test(p.skill));
                    if (passers.length > 0) {
                        passers.sort((a,b) => b.rank - a.rank);
                        const topPasser = passers[0];
                        return { text: `Our top playmaker is **${topPasser.name}** (Rating: ${topPasser.rank}/10), with skill tags: "${topPasser.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `We don't have registered passing tags, but based on baseline player ratings, **${aggArray[0].name}** has the best playmaking vision.`, actions: [] };
                }

                if (isBestRebounder) {
                    const rebounders = aggArray.filter(p => /(rebounding|rebound|height|size|jump)/i.test(p.skill));
                    if (rebounders.length > 0) {
                        rebounders.sort((a,b) => b.rank - a.rank);
                        const topRebounder = rebounders[0];
                        return { text: `Our dominant rebounder on the boards is **${topRebounder.name}**, with skill tags: "${topRebounder.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `Based on ratings, **${aggArray[0].name}** is our strongest presence around the circle/key.`, actions: [] };
                }

                if (isFastestPlayer) {
                    const speedsters = aggArray.filter(p => /(speed|quick|fast|pace|sprint)/i.test(p.skill));
                    if (speedsters.length > 0) {
                        speedsters.sort((a,b) => b.rank - a.rank);
                        const sprinter = speedsters[0];
                        return { text: `The fastest player on court is **${sprinter.name}** with registered speed skills: "${sprinter.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `We don't have registered speed tags, but rating-wise, **${aggArray[0].name}** is our most agile selection on court.`, actions: [] };
                }

                if (isAllRounder) {
                    const allRounders = aggArray.filter(p => /(everything|all-round|allrounder|iq|smart)/i.test(p.skill));
                    if (allRounders.length > 0) {
                        allRounders.sort((a,b) => b.rank - a.rank);
                        const jack = allRounders[0];
                        return { text: `Our ultimate all-rounder is **${jack.name}** (Rating: ${jack.rank}/10), with skill profile: "${jack.skill}".`, actions: [] };
                    }
                    aggArray.sort((a,b) => b.rank - a.rank);
                    return { text: `Based on overall versatile ratings, **${aggArray[0].name}** is our most well-balanced player choice on the court.`, actions: [] };
                }

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
                    summary += `- **Offensive Efficiency**: ${avgPPG} PPG\n`;
                    summary += `- **Leading Scorer**: ${topScorer.name} (${topScorer.totalPoints} total points)\n`;
                    summary += `- **Active Roster Base**: ${players.length} players registered`;
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

        const isFollowUp = /(another|different|next|other|change|something else|new ones|new subs|different subs|another one|different one|gimme another|give me another|different rotation)/i.test(query);
        if (isFollowUp && aiConversationState.lastQueryType) {
            if (aiConversationState.lastQueryType === 'drill') {
                const sportDrills = coachingDatabase.drills[currentSport] || coachingDatabase.drills.basketball;
                aiConversationState.lastDrillIndex = (aiConversationState.lastDrillIndex + 1) % sportDrills.length;
                return { text: `Here is another ${currentSport} drill:\n\n` + sportDrills[aiConversationState.lastDrillIndex], actions: [] };
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

        if (/(sub|substitution|rotation|lineup|bench|roster|field|court|on-field|off-field|fair play|playtime|game state|tactics|situation|who should|bring in|put in|take off|rest|exhausted|foul|win|balanced|shooters|shooter|defense|defence|swap)/i.test(query)) {
            aiConversationState.lastQueryType = 'subs';
            
            if (allCurrentPlayers.length < 2 || onField.length === 0) {
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
            
            const strategyResult = generateRotationStrategy(context, query, onField, offField, players, recentSubs);
            responseObj.text = strategyResult.text + situationTag;
            responseObj.actions = strategyResult.actions;
            return responseObj;
        }

        if (/drill|practice|training|exercise/i.test(query)) {
            aiConversationState.lastQueryType = 'drill';
            const sportDrills = coachingDatabase.drills[currentSport] || coachingDatabase.drills.basketball;
            
            if (/shoot|shooting|goal|kick|punt/i.test(query)) {
                const pick = sportDrills.find(d => /(shoot|scoring|goal|kick|feeding)/i.test(d.toLowerCase())) || sportDrills[0];
                return { text: `**${currentSport.toUpperCase()} Shooting Focus:**\n\n${pick}`, actions: [] };
            }
            if (/defense|defending|defensive|jockey|tackle/i.test(query)) {
                const pick = sportDrills.find(d => /(defen|containment|jockeying|intercept|tackle)/i.test(d.toLowerCase())) || sportDrills[0];
                return { text: `**${currentSport.toUpperCase()} Defensive Focus:**\n\n${pick}`, actions: [] };
            }
            if (/speed|agility|footwork|weave/i.test(query)) {
                const pick = sportDrills.find(d => /(speed|agility|cone|weave)/i.test(d.toLowerCase())) || sportDrills[0];
                return { text: `**${currentSport.toUpperCase()} Speed Focus:**\n\n${pick}`, actions: [] };
            }
            if (/passing|pass|handpass/i.test(query)) {
                const pick = sportDrills.find(d => /(pass|handpass|feed|grid)/i.test(d.toLowerCase())) || sportDrills[0];
                return { text: `**${currentSport.toUpperCase()} Passing Focus:**\n\n${pick}`, actions: [] };
            }
            
            const randIdx = Math.floor(Math.random() * sportDrills.length);
            aiConversationState.lastDrillIndex = randIdx;
            return { text: `Here is a useful **${currentSport}** drill:\n\n` + sportDrills[randIdx], actions: [] };
        }

        if (/defense|defending|defensive|zone|man to man/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.defense, actions: [] }; }
        if (/shoot|shooting|form|beef/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.shooting, actions: [] }; }
        if (/rebound|box out|boxing out/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.rebounding, actions: [] }; }
        if (/spacing|offense spacing|offensive spacing/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.spacing, actions: [] }; }
        if (/passing|pass/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.passing, actions: [] }; }
        if (/fastbreak|transition/i.test(query)) { aiConversationState.lastQueryType = 'tactics'; return { text: coachingDatabase.tactics.fastbreak, actions: [] }; }

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

        return { text: "Sorry I didn't quite get that. Try asking for 'subs', 'coaching drills' or 'who's my best player''", actions: [] };
    }

    return { processQuery };
})();
