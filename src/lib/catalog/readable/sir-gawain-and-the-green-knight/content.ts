import type { VolumeContent } from '#lib/catalog/readable/types.ts';

/**
 * Complete Illustrated Companion Edition of Sir Gawain and the Green Knight.
 *
 * Organized into fourteen illustrated chapter pairs—each opening on a dedicated
 * two-page Spread with its archival plate on the left verso Page and its Chapter
 * heading on the right recto Page, linked directly in Reading Mode's Chapter menu:
 *
 *   PLOT SUMMARY
 *     - Plot Summary: The Four Fitts               (fitt-1-camelot.jpg — BL Cotton MS. Nero A.x, f. 94v)
 *
 *   MAIN CHARACTERS (5 Complete Portraits)
 *     - Character: Sir Gawain                      (char-gawain-pyle.jpg — Howard Pyle, 1903)
 *     - Character: The Green Knight & Bernlak      (fitt-4-green-chapel.jpg — Frederic Lawrence, 1912)
 *     - Character: Lady Bertilak                   (fitt-3-bedside.jpg — Frederic Lawrence, 1912)
 *     - Character: Morgan le Fay                   (fitt-2-two-ladies.jpg — Frederic Lawrence, 1912)
 *     - Characters: Arthur, Guinevere & Court      (fitt-4-return.jpg — BL Cotton MS. Nero A.x, f. 130r)
 *
 *   THE SETTING (4 Complete Locations)
 *     - Setting: Camelot at Christmastide          (setting-camelot-feast.jpg — Limbourg Brothers, c. 1415)
 *     - Setting: Logres, Wales & Wirral            (fitt-2-logres.jpg — Frederic Lawrence, 1912)
 *     - Setting: Castle Hautdesert & Woods         (setting-hautdesert-hunt.jpg — Limbourg Brothers, c. 1415)
 *     - Setting: The Green Chapel                  (setting-green-chapel.jpg — August Schwerdfeger, CC BY 4.0)
 *
 *   KEY BACKGROUND, SYMBOLS & LEGACY (4 Complete Studies)
 *     - Key Symbols: Pentangle, Girdle & Axe       (fitt-3-confession.jpg — Frederic Lawrence, 1912)
 *     - Themes: Trawthe & the Three Hunts          (ms-temptation-129r.jpg — BL Cotton MS. Nero A.x, f. 129r)
 *     - Background: Poet & Cotton MS. Nero A.x     (ms-opening-095r.jpg — BL Cotton MS. Nero A.x, f. 95r)
 *     - Background: Verse, Garter Motto & Legacy   (edition-1912-canto1.jpg — Frederic Lawrence, 1912)
 */
export const content: VolumeContent = {
	title: 'Sir Gawain and the Green Knight',
	author: 'Anonymous (The Gawain Poet)',
	subtitle: 'An Illustrated Companion · Presented by Jorge Benidict C. Licup',
	translator: 'Rev. Ernest J. B. Kirtlan (1912)',
	sourceNote:
		'Complete illustrated companion based on Rev. Ernest J. B. Kirtlan’s 1912 public-domain edition of BL Cotton MS. Nero A.x.',
	colophonNote:
		'Curated and presented by Jorge Benidict C. Licup. Illustrated with public-domain illuminations from BL Cotton MS. Nero A.x (c. 1400), Les Très Riches Heures (c. 1415), Howard Pyle (1903), Frederic Lawrence (1912), and Lud’s Church by August Schwerdfeger (CC BY 4.0).',
	sections: [
		// =========================================================================
		// PLOT SUMMARY
		// =========================================================================
		{
			kind: 'illustration',
			title: 'Plate — Plot Summary: The Four Fitts',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-1-camelot.jpg',
			caption: 'The Beheading Wager at Camelot — BL Cotton MS. Nero A.x, f. 94v (c. 1400).'
		},
		{
			kind: 'prose',
			title: 'Plot Summary: The Four Fitts',
			epigraph: 'A New Year’s covenant of honour, temptation, and mercy across four cantos.',
			paragraphs: [
				'Fitt I (The New Year’s Challenge) — At Camelot’s Yuletide feast, a giant knight clad wholly in bright green rides unarmed into Arthur’s hall holding a holly bough of peace and a massive Danish axe. He proposes a “Christmas game”: strike him one blow today, and take an equal blow at the Green Chapel in a year and a day. Gawain beheads him in Arthur’s stead—yet the headless rider lifts his speaking head and gallops off.',
				'Fitt II (The Winter Quest) — After All Hallows Day, Gawain rides north on Gringolet bearing Solomon’s golden Pentangle on his crimson shield. Enduring freezing sleet across North Wales and wild Wirral, he prays on Christmas Eve and beholds Castle Hautdesert. Its jovial lord welcomes him beside his radiant wife and a veiled elder dame, proposing a three-day “Exchange of Winnings” before Gawain’s nearby tryst.',
				'Fitt III (The Three Temptations) — While the host hunts deer, boar, and fox outdoors, his lady visits Gawain’s bedside to test his courtesy. Twice Gawain parries her advances, trading one kiss for venison and two for the boar; on day three he refuses her gold ring, yet secretly keeps her life-saving green silk girdle.',
				'Fitt IV (The Reckoning) — At the hollow mound of the Green Chapel, the Green Knight feints twice and lightly nicks Gawain’s neck on the third swing. Revealing himself as Lord Bernlak acting for Gawain’s aunt Morgan le Fay, he explains the nick answered the hidden belt. Humbled, Gawain wears the green sash home, where Camelot adopts it in fellowship.'
			]
		},

		// =========================================================================
		// MAIN CHARACTERS (5 CHAPTER PAIRS)
		// =========================================================================
		{
			kind: 'illustration',
			title: 'Portrait — Sir Gawain',
			src: 'volumes/sir-gawain-and-the-green-knight/char-gawain-pyle.jpg',
			caption: 'Portrait of Sir Gawain, Son of King Lot — Engraving by Howard Pyle (1903).'
		},
		{
			kind: 'prose',
			title: 'Character: Sir Gawain',
			epigraph: 'Arthur’s modest nephew, knight of the golden Pentangle and mirror of courtesy.',
			paragraphs: [
				'In medieval English tradition—long before later French prose cycles diminished him beside Lancelot—Sir Gawain stood as the finest flower of the Round Table. Eldest son of King Lot of Orkney and Arthur’s sister Morgause, he introduces himself at Camelot as the weakest and least worthy of knights, claiming honour solely because his uncle’s royal blood flows in his veins. That graceful self-effacement immediately marks his true nobility when he rescues Arthur from the Green Knight’s wager.',
				'Gawain’s outward arms reflect an exacting inward ideal. On the outside of his crimson shield shines the golden Pentangle, symbolizing five interlocking groups of five virtues, while on the inner board faces painted images of the Virgin Mary remind him whence his courage springs in battle. Courtiers at Castle Hautdesert marvel at him as the “fine father of nurture,” expecting every word from his lips to teach faultless courtly speech and gentle manners.',
				'Yet the Gawain Poet tests his hero not through dragon-slaying spectacle, but in the quiet pressure of bedroom conversation and winter solitude. Caught between offending his hostess, betraying his host, and preserving his mortal life, Gawain flinches once by concealing the green silk girdle—not out of lust or greed for gold, as Bernlak observes, but simply because “he loved his own life.”',
				'What makes Gawain unforgettable is his fierce moral honesty afterward. Refusing to excuse himself rapidly as others offer, he blushes crimson, confesses his fault openly, and wears the green sash forever as a check against knightly pride, growing wiser through humility than he ever was in unblemished perfection.'
			]
		},

		{
			kind: 'illustration',
			title: 'Portrait — The Green Knight & Bernlak',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-4-green-chapel.jpg',
			caption: 'The Green Knight Wielding His Axe — Woodcut by Frederic Lawrence (1912).'
		},
		{
			kind: 'prose',
			title: 'Character: The Green Knight & Bernlak',
			epigraph: 'Uncanny winter challenger, booming castle host, and merciful judge.',
			paragraphs: [
				'No figure in Middle English literature commands an entrance like the Green Knight. Half-giant in stature yet shapely of waist and limb, he rides into Camelot enamelled in bright emerald from his flowing hair and bush-like beard down to the gold-threaded greenery of his tunic and steed. Wearing neither helmet nor hauberk, he embodies a startling paradox: untamed winter vitality wedded to dazzling courtly craft.',
				'In Fitt II and Fitt III, this supernatural challenger reappears in warm human guise as Bernlak de Haudesert, the broad-shouldered, reddish-bearded lord of Castle Hautdesert. Boisterous, hospitable, and tireless in the saddle, Bernlak commands his household with infectious laughter, rises before daylight to lead his hounds through frost-bound woods, and binds Gawain in playful legal oaths over hearthside wine.',
				'Unlike a sinister demon bent on Gawain’s ruin, Bernlak acts throughout as an upright arbiter of truth. Even when swinging his four-foot blade at the Green Chapel, he checks his mighty arms twice the instant he sees Gawain hold steady, playfully chiding him when Gawain’s shoulders twitch under the whistling steel.',
				'When the third blow draws only a bead of blood upon the snow, Bernlak leans calmly on his axe-shaft and laughs aloud with genuine affection. Acting almost like a wise confessor, he pronounces Gawain clean as polished pearl beside white pease, inviting him back to Hautdesert in friendship and proving that true judgment tempers strict law with human understanding.'
			]
		},

		{
			kind: 'illustration',
			title: 'Portrait — Lady Bertilak',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-3-bedside.jpg',
			caption: 'Lady Bertilak at Gawain’s Bedside — Woodcut by Frederic Lawrence (1912).'
		},
		{
			kind: 'prose',
			title: 'Character: Lady Bertilak',
			epigraph: 'The radiant chatelaine whose courtly wit proves sharper than any spear.',
			paragraphs: [
				'Known simply as “the lady” throughout the poem, Bernlak’s young wife dazzles Gawain the moment she steps from her castle pew on Christmas Eve. With fair skin glowing rose-bright beneath pearls and open kerchiefs, Gawain privately judges her lovelier even than Queen Guinevere. Seated beside him at supper, her warm glances and effortless charm seem at first the height of gracious hospitality.',
				'Behind closed chamber doors on the final three mornings of the year, however, Lady Bertilak reveals herself as the poem’s most formidable strategist. Slipping quietly inside Gawain’s bed-curtains and latching them playfully behind her, she turns Gawain’s own celebrity as a master of courtly romance into a delicate trap: if he truly is Sir Gawain, how can he sit beside an admiring lady without speaking of love or claiming a kiss?',
				'Across all three interviews she matches Gawain thrust for parry like an expert fencer, testing first his poise, next his chivalric pride, and finally his deepest instinct for survival. When he refuses her rich gold ring because he has no treasure to offer in return, she pivots effortlessly to her simple green silk girdle—and unlocks his secret consent by promising magical protection against steel.',
				'In Fitt IV Bernlak reveals that his wife acted entirely with his knowledge to assay Camelot’s champion. Far from a stock temptress, Lady Bertilak embodies the brilliance, poise, and moral complexity of medieval aristocratic speech.'
			]
		},

		{
			kind: 'illustration',
			title: 'Portrait — Morgan le Fay',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-2-two-ladies.jpg',
			caption: 'Veiled Morgan le Fay Beside Lady Bertilak — Woodcut by Frederic Lawrence (1912).'
		},
		{
			kind: 'prose',
			title: 'Character: Morgan le Fay',
			epigraph: 'The silent veiled elder dame revealed at last as architect of the marvel.',
			paragraphs: [
				'When Gawain first meets the ladies of Castle Hautdesert, the poet contrasts Lady Bertilak’s youthful radiance with a striking companion whom she leads by the hand: an ancient, yellow-complexioned matron swathed from chin to brow in chalk-white veils and pearl-studded gorgets, leaving only her dark eyes, nose, and bare lips visible. Though silent, she sits at the very highest seat on Lord Bernlak’s daïs and receives deeper reverence than anyone else in the hall.',
				'For two full cantos the poet withholds her identity, allowing the reader—like Gawain himself—to treat her merely as a venerable dowager of the northern marches. Only after the return blow at the Green Chapel does Bernlak unveil the truth: that ancient lady is “Morgne la Faye,” mistress of Hautdesert, Arthur’s half-sister, and Gawain’s own blood aunt, daughter of the Duchess of Tintagel.',
				'Schooled long ago in deep clerical lore and shape-shifting magic through her love affair with Merlin, Morgan holds the power to humble even the fiercest knight on earth. It was she who transformed Bernlak into emerald splendour and dispatched him southward to Arthur’s New Year feast.',
				'Her motives blend dynastic rivalry with pointed moral satire: she sought both to frighten Queen Guinevere to death at the sight of a speaking severed head and to test whether the Round Table’s sky-high renown survived mortal terror. Through Morgan, the outward chivalric quest folds back into an intimate family reckoning at the heart of Arthur’s house.'
			]
		},

		{
			kind: 'illustration',
			title: 'Portrait — Arthur, Guinevere & Court',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-4-return.jpg',
			caption: 'Arthur and Guinevere Welcome Gawain Home — BL Cotton MS. Nero A.x, f. 130r (c. 1400).'
		},
		{
			kind: 'prose',
			title: 'Characters: Arthur, Guinevere & Court',
			epigraph: 'A youthful royal fellowship that turns private shame into shared grace.',
			paragraphs: [
				'Unlike twilight romances depicting an aging king and fractured realm, Sir Gawain presents King Arthur and his court in the “first age” of their youth. Restless, high-spirited, and bold of heart, Arthur refuses to sit down to his New Year’s banquet until he hears some adventurous tale or witnesses a feat of arms—a custom the Green Knight’s sudden arrival answers far more literally than anyone imagined.',
				'Stung when the giant mocks his silent knights as beardless children, Arthur proves his personal mettle by striding forward and swinging the heavy green axe himself until Gawain persuades the council that such an unseemly game belongs to a vassal rather than a sovereign. Beside him at the high table sits Queen Guinevere beneath a jewel-set canopy of Tarsian silk, grey-eyed and composed even as the severed head addresses her directly.',
				'Surrounding the royal pair stands a roll-call of beloved Arthurian figures—Lancelot, Ywain, Eric, Sir Dodinel, the Duke of Clarence, Bishop Baldwin, and Gawain’s brother Agravain “of the Hard Hand.” When Gawain arms himself on All Saints’ Morrow, these courtiers weep openly behind their laughter, grieving that perilous pride should cost so noble a comrade his life.',
				'That same warmth defines the poem’s sunlit close. When Gawain returns bearing his neck-scar and confesses his fault in anguish, Arthur comforts him with gentle laughter, and every lord and lady of the Round Table binds on a slantwise sash of bright green silk—refusing to let their champion carry the burden of human imperfection alone.'
			]
		},

		// =========================================================================
		// THE SETTING (4 CHAPTER PAIRS)
		// =========================================================================
		{
			kind: 'illustration',
			title: 'Scene — Camelot at Christmastide',
			src: 'volumes/sir-gawain-and-the-green-knight/setting-camelot-feast.jpg',
			caption: 'A Medieval New Year’s Feast (January) — Limbourg Brothers, Très Riches Heures (c. 1415).'
		},
		{
			kind: 'prose',
			title: 'Setting: Camelot at Christmastide',
			epigraph: 'Candlelit tapestries, silver fanfares, and fifteen days of Yuletide ceremony.',
			paragraphs: [
				'The poem’s framing setting is King Arthur’s legendary capital of Camelot during the high winter feast stretching from Christmas Day to New Year’s Day. Inside its vaulted great hall, rich tapestries of Toulouse and Tarsia embroidered with bright gems line the walls above rushes and blazing hearths, sheltering Britain’s noblest knights and loveliest ladies from the December cold.',
				'Every sensory detail evokes courtly order and liturgical abundance. After chanting Mass in the royal chapel and exchanging New Year’s “handsels” (holiday gifts), guests wash and take their ranked seats at trestle tables while silver trumpets, pipes, and kettledrums herald double portions of rare meats, stews, and spiced wines.',
				'Because Camelot represents civilised harmony at its most radiant, the intrusion of the uninvited Green Knight shatters more than banquet etiquette. Bringing wild holly and cold steel straight up to the royal daïs, he forces Camelot to prove that its chivalry is more than festive pageantry and tournament play.',
				'Returning to Camelot at the close of Fitt IV completes the poem’s structural circle. Yet the hall Gawain re-enters has subtly matured: enriched by his hard-won self-knowledge, Camelot’s celebration shifts from untested youthful boastfulness to compassionate solidarity symbolized by the green baldric.'
			]
		},

		{
			kind: 'illustration',
			title: 'Scene — Logres, Wales & Wirral',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-2-logres.jpg',
			caption: 'Sir Gawain Riding Through the Winter Wilds — Woodcut by Frederic Lawrence (1912).'
		},
		{
			kind: 'prose',
			title: 'Setting: Logres, Wales & Wirral',
			epigraph: 'A solitary November ride across real fourteenth-century Welsh and Cheshire borders.',
			paragraphs: [
				'Where continental Arthurian romances wander through nameless enchanted forests, the Gawain Poet anchors Fitt II in startlingly concrete British geography. Riding northward out of Arthur’s southern realm of Logres after All Hallows Day, Gawain travels utterly alone save for his horse Gringolet, finding no soul along the road who has ever heard of a Green Knight or a Green Chapel.',
				'Pressing into North Wales, he keeps the Isles of Anglesey on his left hand, skirts coastal marshes, and crosses the river fords near the Holy Head before climbing onto the rugged headland of the Wilderness of Wirral—a real royal forest peninsula in fourteenth-century Cheshire notorious in contemporary chronicles as a haven for outlaws “where few dwelt who loved either God or good men.”',
				'Along riverbanks and limestone cliffs Gawain battles serpents, wolves, wild bulls, bears, boars, and crag-dwelling giants, yet the poet wryly remarks that bitter winter weather hurt him far worse than all those monsters combined. Cold clear water plunges from frozen clouds, icicles hang overhead, and Gawain sleeps in full iron mail among bare rocks while freezing sleet pelts him.',
				'By tracing an itinerary straight into the Northwest Midlands—the dialect region of the poet’s own audience—the landscape bridges mythic romance and lived medieval reality, stripping Gawain down to exhausted prayer on Christmas Eve.'
			]
		},

		{
			kind: 'illustration',
			title: 'Scene — Castle Hautdesert & Woods',
			src: 'volumes/sir-gawain-and-the-green-knight/setting-hautdesert-hunt.jpg',
			caption: 'Forest Boar Hunt Before White Castle Turrets — Limbourg Brothers (c. 1415).'
		},
		{
			kind: 'prose',
			title: 'Setting: Castle Hautdesert & Woods',
			epigraph: 'Chalk-white pinnacles above an oak park, framed by frost-bound hunting valleys.',
			paragraphs: [
				'The instant Gawain crosses himself thrice on Christmas Morn, Bernlak’s stronghold shimmers into view through tangled oaks, hazels, and hawthorns. Surrounded by a broad park pale and a deep double moat, Castle Hautdesert rises from solid rock with a crenellated barbican, tall watchtowers, chalk-white chimneys, and so many painted pinnacles that it gleams against the winter sky “as if pared out of paper.”',
				'Inside, Hautdesert surrounds the weary traveller with late-medieval aristocratic luxury: a chair cushioned in quilted silk beside a charcoal brazier, squirrel-furred mantles, candlelit vespers in a richly appointed chapel, and a curtained four-poster bed hung with gold-hemmed tapestries. Ironically, this warm sanctuary conceals a far subtler danger than the frozen Wirral outside.',
				'Throughout Fitt III the poet cuts cinematically between two contrasting arenas of Hautdesert’s estate. Outdoors, bugles echo across frost-rimed valleys, cliffside thickets, and rushing crag-streams as Bernlak and a hundred beaters drive barren hinds on Day One, corner a ferocious tusker boar in a rocky stream on Day Two, and track Reynard the red fox through spinneys on Day Three.',
				'Indoors, quiet chamber curtains enclose a parallel hunt conducted entirely in whispers and courtly wit, turning castle architecture itself into an unforgettable stage of moral suspense.'
			]
		},

		{
			kind: 'illustration',
			title: 'Scene — The Green Chapel',
			src: 'volumes/sir-gawain-and-the-green-knight/setting-green-chapel.jpg',
			caption: 'Lud’s Church in Staffordshire, Real-World Analog of the Green Chapel (CC BY 4.0).'
		},
		{
			kind: 'prose',
			title: 'Setting: The Green Chapel',
			epigraph: 'No stone cathedral, but a hollow turf-covered mound beside a boiling winter stream.',
			paragraphs: [
				'On New Year’s morning Gawain rides two miles from Hautdesert behind a castle guide through drifting snow and mist-shrouded cliffs where every hillside wears “a huge cloak of mist.” At the bottom of a wild, rugged valley, the guide reins in and warns that no peasant, priest, or proud knight passes the Green Chapel alive—offering to swear secrecy if Gawain turns back. Refusing cowardice, Gawain descends alone.',
				'Expecting a timbered chapel or stone priory, Gawain scans the gorge in bafflement until he spots a strange, smooth-swelling earthen mound beside a foaming waterfall where a winter brook boils over stones. Overgrown with patches of coarse turf and hollow inside “like nothing save an old cave or the crevice of an old crag,” it opens at each end and one side.',
				'Climbing onto its grassy roof while icy wind howls through the valley, Gawain shudders that this is an eerie oratory wrought for the Fiend to mutter midnight matins—just before the ear-splitting scream of a grindstone sharpening steel rings out from a cliff beyond the stream.',
				'Scholars of Northwest Midlands topography link the Green Chapel directly to dramatic gritstone and limestone ravines along the Staffordshire–Cheshire border, above all Lud’s Church near Gradbach—a deep, moss-green forest chasm that captures the poem’s stark meeting place of wild earth, mortal dread, and truth.'
			]
		},

		// =========================================================================
		// KEY BACKGROUND, SYMBOLS & LEGACY (4 CHAPTER PAIRS)
		// =========================================================================
		{
			kind: 'illustration',
			title: 'Plate — Key Symbols & Emblems',
			src: 'volumes/sir-gawain-and-the-green-knight/fitt-3-confession.jpg',
			caption: 'Gawain in the Chapel Between Two Emblems — Woodcut by Frederic Lawrence (1912).'
		},
		{
			kind: 'prose',
			title: 'Key Symbols: Pentangle, Girdle & Axe',
			epigraph: 'Gold geometry, green silk, winter holly, and crimson blood on snow.',
			paragraphs: [
				'The Golden Pentangle — Painted in pure gold upon Gawain’s red shield, King Solomon’s five-pointed star forms what the English call “the endless knot.” Each of its five unbroken lines represents a quintet of excellence: Gawain’s faultless five senses, never-failing five fingers, devotion to Christ’s five wounds, fortitude drawn from Mary’s five joys, and five chivalric virtues—generosity, fellowship, cleanness, courtesy, and compassion. Because every line locks seamlessly into the next, a single compromise tugs at the whole ideal.',
				'The Green Silk Girdle — Woven of green silk braided with gold at its edges, Lady Bertilak’s belt evolves across three distinct meanings. Accepted in secret as a magical charm to preserve Gawain’s body, it becomes after the third axe-stroke a stinging badge of “cowardice and covetousness” in Gawain’s eyes, before Camelot transforms it into a shared emblem of humble brotherhood.',
				'The Holly Bough & Danish Axe — Carried in opposite hands by the Green Knight in Fitt I, the berry-hung winter holly proclaims peaceful seasonal goodwill while the four-foot razor blade honed for decapitation dares violent pride—inviting Camelot to choose which half of his message it will answer.',
				'Green, Gold, and Red on White — Throughout the romance, wild regenerative green collides with refined courtly gold, culminating in the vivid visual shock of Gawain’s bright red blood gleaming against pure New Year snow.'
			]
		},

		{
			kind: 'illustration',
			title: 'Plate — Trawthe & the Three Hunts',
			src: 'volumes/sir-gawain-and-the-green-knight/ms-temptation-129r.jpg',
			caption: 'The Bedroom Test — Original Illumination, BL Cotton MS. Nero A.x, f. 129r (c. 1400).'
		},
		{
			kind: 'prose',
			title: 'Themes: Trawthe & the Three Hunts',
			epigraph: 'Keeping faith when courtesy, guest-friendship, and survival pull apart.',
			paragraphs: [
				'Trawthe (Integrity of Word and Deed) — Above battle-prowess, the poem exalts the Middle English virtue of trawthe: wholeness of character in which a knight’s sworn promise, Christian faith, loyalty to his host, and inward honesty align without split. Gawain passes the supreme test of courage by riding to his apparent death on time, yet discovers in the Exchange of Winnings how hard absolute trawthe is for mortal flesh.',
				'The Double Bind of Courtesy — Medieval cortaysye encompassed far more than polite manners; it linked courtly service to ladies with refined Christian charity. Inside his bedchamber Gawain walks a razor’s edge—refusing adultery and treason against Lord Bernlak while never speaking a harsh or boorish syllable to Lady Bertilak.',
				'Symmetry of the Three Hunts — Fitt III’s celebrated triptych pairs each outdoor quarry with Gawain’s indoor conduct. On Day One, Gawain timidly feigns sleep and sidesteps like the fleeing deer; on Day Two, he stands his ground and parries boldly like the charging wild boar; on Day Three, cornered like wily Reynard the fox, he swerves from the lady’s ring straight into the snare of the green girdle.',
				'Comedy and Christian Mercy — Rather than ending in tragic bloodshed like Malory’s Morte Darthur, the poem resolves in laughter and grace, affirming that honest contrition restores human dignity.'
			]
		},

		{
			kind: 'illustration',
			title: 'Plate — Poet & Cotton MS. Nero A.x',
			src: 'volumes/sir-gawain-and-the-green-knight/ms-opening-095r.jpg',
			caption: 'Opening Leaf of Sir Gawain — BL Cotton MS. Nero A.x, f. 95r (c. 1400, Public Domain).'
		},
		{
			kind: 'prose',
			title: 'Background: Poet & Cotton MS. Nero A.x',
			epigraph: 'An unknown Northwest Midlands genius and a single manuscript saved from fire.',
			paragraphs: [
				'The Anonymous Gawain Poet (c. 1375–1400) — Composed during the reign of King Richard II, Sir Gawain and the Green Knight belongs to the same golden generation of English poetry as Geoffrey Chaucer’s Canterbury Tales and William Langland’s Piers Plowman. Yet its unknown author wrote some one hundred and fifty miles northwest of London in the rugged dialect of eastern Cheshire or northern Staffordshire, blending deep scriptural theology with intimate knowledge of aristocratic hunting, armour, architecture, and courtly law.',
				'Four Poems in One Hand — Scholars call him both the Gawain Poet and the Pearl Poet because the same manuscript preserves three companion masterpieces in his distinctive voice: Pearl (a moving dream-elegy for a lost infant daughter), Cleanness, and Patience (vivid biblical meditations on purity and Jonah’s humility), followed last by Sir Gawain.',
				'British Library Cotton MS. Nero A.x — Every word of all four poems survives in a single unpretentious parchment codex measuring barely seven by five inches, illustrated with twelve full-page colour miniatures—four depicting Gawain’s adventure.',
				'Rescue from the Flames — Acquired in the seventeenth century by antiquary Sir Robert Cotton and shelved beneath a bust of Emperor Nero, the volume narrowly escaped destruction in the 1731 Ashburnham House fire before Sir Frederic Madden published the landmark first printed edition in 1839.'
			]
		},

		{
			kind: 'illustration',
			title: 'Plate — Verse Form & Legacy',
			src: 'volumes/sir-gawain-and-the-green-knight/edition-1912-canto1.jpg',
			caption: 'Decorated Opening of Canto the First — Frederic Lawrence in Kirtlan’s 1912 Edition.'
		},
		{
			kind: 'prose',
			title: 'Background: Verse, Garter Motto & Legacy',
			epigraph: 'Muscular alliterative music, the Order of the Garter, and six centuries of renewal.',
			paragraphs: [
				'The Alliterative Revival & “Bob and Wheel” — Across 101 stanzas and 2,530 lines, the Gawain Poet revitalizes native Old English sound-craft. Each stanza marches through unrhymed, four-beat alliterative long lines split by a medial pause, rich in crisp consonance for ringing axes, whistling sleet, and baying hounds—then snaps shut with a signature “bob and wheel”: one tiny two-syllable line (the bob) followed by four trimeter lines rhyming ABAB (the wheel) that crystallize or gently ironize the scene.',
				'The Trojan Frame — Both the poem’s very first line (“After the siege and the assault were ceased at Troy”) and its closing stanza frame Arthur’s court within legendary British history descending from Aeneas and Felix Brutus, situating Camelot’s youthful glory inside the rise and fall of earthly empires.',
				'The Order of the Garter Postscript — Immediately below the final line in Cotton MS. Nero A.x, a medieval hand added Hony soyt qui mal pence (“Shame be to him who thinks evil thereof”), the French motto of King Edward III’s chivalric Order of the Garter (founded c. 1348), linking Camelot’s green baldric to English court ceremony.',
				'Modern Editions & Translations — Rev. Ernest J. B. Kirtlan’s 1912 translation, embellished with Arts-and-Crafts woodcuts by Frederic Lawrence, helped introduce general readers to the poem ahead of celebrated modern renderings by J. R. R. Tolkien, Marie Borroff, and Simon Armitage.'
			]
		}
	]
};
