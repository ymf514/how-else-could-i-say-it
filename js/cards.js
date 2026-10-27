/* =============================================================
   CARD DECK — edit names / instructions / examples here.
   Keep each `id` stable once you start collecting data.
   Examples only appear when the participant taps "?" on a card.
   ============================================================= */
window.HECIS_CARDS = {
  categories: {
    language: { en: 'Language', zh: '语言' },
    logic: { en: 'Logic', zh: '逻辑' },
    identity: { en: 'Identity', zh: '身份' },
    delivery: { en: 'Delivery & Perspective', zh: '表达与视角' },
  },

  // Green Technique Cards
  techniques: [
    {
      id: 'exaggeration', category: 'language',
      name: { en: 'Exaggeration', zh: '夸张' },
      instruction: {
        en: 'Describe your experience as if it were a disaster of historic proportions.',
        zh: '把你的经历描述成一场历史级的大灾难。',
      },
      example: {
        en: 'This morning, history witnessed its darkest hour: the 8:15 bus left without me.',
        zh: '今天早上，人类历史迎来至暗时刻：8:15 的公交车丢下了我。',
      },
    },
    {
      id: 'understatement', category: 'language',
      name: { en: 'Understatement', zh: '轻描淡写' },
      instruction: {
        en: 'Tell your story while pretending nothing particularly unusual happened.',
        zh: '讲你的故事，同时假装没发生什么特别的事。',
      },
      example: {
        en: 'The bus left as I arrived, so I walked for forty minutes. A normal Tuesday.',
        zh: '我到站时车刚开走，于是走了四十分钟。很普通的周二。',
      },
    },
    {
      id: 'irony', category: 'language',
      name: { en: 'Irony', zh: '反讽' },
      instruction: {
        en: 'Describe an unpleasant experience as though it were a wonderful outcome.',
        zh: '把一段不愉快的经历说得像一个美好的结果。',
      },
      example: {
        en: 'Great news: the bus didn’t wait, so I got a free forty-minute workout.',
        zh: '好消息：公交车没等我，我白赚了四十分钟晨练。',
      },
    },
    {
      id: 'wordplay', category: 'language',
      name: { en: 'Wordplay', zh: '文字游戏' },
      instruction: {
        en: 'Find a double meaning or unexpected phrase connected to the event.',
        zh: '找一个和这件事有关的双关语或意想不到的说法。',
      },
      example: {
        en: 'I missed the bus. Honestly, I still miss it.',
        zh: '没赶上车，今天真是“车”底失败。',
      },
    },
    {
      id: 'reversal', category: 'logic',
      name: { en: 'Reversal', zh: '反转' },
      instruction: {
        en: 'Tell the story as if the opposite of what you expected were the real goal.',
        zh: '假装和你预期相反的结果，才是你真正的目标。',
      },
      example: {
        en: 'Mission accomplished: I successfully avoided the bus this morning.',
        zh: '任务完成：今天早上我成功避开了公交车。',
      },
    },
    {
      id: 'absurdity', category: 'logic',
      name: { en: 'Absurdity', zh: '荒诞' },
      instruction: {
        en: 'Add one impossible explanation to your experience and continue as if it were true.',
        zh: '给你的经历加一个不可能的解释，然后当真继续讲下去。',
      },
      example: {
        en: 'The bus left early because it is secretly training for a marathon.',
        zh: '公交车提前开走，是因为它在偷偷备战马拉松。',
      },
    },
    {
      id: 'analogy', category: 'logic',
      name: { en: 'Analogy', zh: '类比' },
      instruction: {
        en: 'Compare your experience to a completely different object, profession, or system.',
        zh: '把你的经历比作一个完全不同的物品、职业或系统。',
      },
      example: {
        en: 'Catching that bus is like replying to a group chat: the moment you’re ready, it’s gone.',
        zh: '赶公交就像回群消息：你刚准备好，话题已经过去了。',
      },
    },
    {
      id: 'repetition', category: 'logic',
      name: { en: 'Repetition & Variation', zh: '重复与变奏' },
      instruction: {
        en: 'Describe three increasingly strange ways the same problem happened.',
        zh: '用三种越来越离奇的方式，描述同一个问题是怎么发生的。',
      },
      example: {
        en: 'The first bus left. The second was full. The third one waved at me.',
        zh: '第一辆车开走了。第二辆满了。第三辆冲我挥了挥手。',
      },
    },
    {
      id: 'personification', category: 'identity',
      name: { en: 'Personification', zh: '拟人' },
      instruction: {
        en: 'Retell the experience from the perspective of a nonhuman character.',
        zh: '从一个非人类角色的视角，重讲这段经历。',
      },
      example: {
        en: 'The bus, later: “I saw them running. I chose peace.”',
        zh: '公交车事后表示：“我看见他在跑。我选择了内心的平静。”',
      },
    },
    {
      id: 'parody', category: 'identity',
      name: { en: 'Imitation / Parody', zh: '模仿 / 戏仿' },
      instruction: {
        en: 'Retell the event as a news report, product review, or documentary narration.',
        zh: '把这件事改编成新闻报道、产品测评或纪录片旁白。',
      },
      example: {
        en: 'Review: Bus 42. One star. Leaves exactly when you arrive.',
        zh: '测评：42 路公交，一星。总在你到站的那一刻准时离开。',
      },
    },
    {
      id: 'deadpan', category: 'delivery',
      name: { en: 'Deadpan', zh: '一本正经' },
      instruction: {
        en: 'Describe the event with the seriousness of an official announcement.',
        zh: '用官方公告般的严肃语气描述这件事。',
      },
      example: {
        en: 'At 8:15 a.m. the bus departed. The passenger did not. That is all.',
        zh: '上午 8:15，公交车出发。乘客未出发。特此通报。',
      },
    },
    {
      id: 'misunderstanding', category: 'delivery',
      name: { en: 'Misunderstanding', zh: '误会' },
      instruction: {
        en: 'Pretend to misunderstand a key detail of your experience.',
        zh: '假装误解了你经历中的一个关键细节。',
      },
      example: {
        en: 'Everyone says “catch the bus”, so I chased it for three stops.',
        zh: '大家都说“赶公交”，所以我认真地赶了它三站路。',
      },
    },
  ],

  // Grey Perspective Cards (optional) — who you are telling it to
  perspectives: [
    { id: 'friend', name: { en: 'To a Close Friend', zh: '对一个密友' } },
    { id: 'past-self', name: { en: 'To Your Past Self', zh: '对过去的自己' } },
    { id: 'object', name: { en: 'To an Object', zh: '对一个物品' } },
    { id: 'stranger', name: { en: 'To a Stranger', zh: '对一个陌生人' } },
    { id: 'partner', name: { en: 'To Your Partner', zh: '对你的伴侣' } },
    { id: 'family', name: { en: 'To Your Family', zh: '对你的家人' } },
  ],
};
