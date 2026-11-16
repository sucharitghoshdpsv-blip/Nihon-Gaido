export type SurvivalCategory =
  | 'Cold & Pharmacy'
  | 'IC Card & ATM'
  | 'Takkyubin Luggage'
  | 'Konbini Counter';

export interface SurvivalGuideCard {
  id: string;
  category: SurvivalCategory;
  title: string;
  japaneseShowCard: string;
  romaji: string;
  englishPrompt: string;
  practicalTip: string;
  estimatedCost: string;
}

export const SURVIVAL_GUIDE_CARDS: SurvivalGuideCard[] = [
  {
    id: 'surv-cold-meds',
    category: 'Cold & Pharmacy',
    title: 'Cold, Fever & Throat Relief',
    japaneseShowCard: '風邪薬（熱・喉の痛み）はどれがおすすめですか？',
    romaji: 'Kazegusuri (netsu / nodo no itami) wa dore ga osusume desu ka?',
    englishPrompt: 'Which cold medicine do you recommend for fever and sore throat?',
    practicalTip:
      'Look for Matsukiyo, Welcia, or Cocokara Fine drugstores. Popular OTC formulas include Pabron Gold A (総合感冒薬) and Eve Quick for headaches.',
    estimatedCost: '¥1,100–¥1,900',
  },
  {
    id: 'surv-stomach-meds',
    category: 'Cold & Pharmacy',
    title: 'Stomach Ache & Motion Sickness',
    japaneseShowCard: '胃薬と酔い止めを探しています。',
    romaji: 'Igusuri to yoidome o sagashite imasu.',
    englishPrompt: 'I am looking for stomach medicine and motion-sickness tablets.',
    practicalTip:
      'Ohta’s Isan (太田胃散) sachets work fast after heavy ramen or izakaya meals; ask for Aneron (アネロン) before mountain bus or ferry rides.',
    estimatedCost: '¥850–¥1,400',
  },
  {
    id: 'surv-ic-topup',
    category: 'IC Card & ATM',
    title: 'Top Up Suica / PASMO with Cash',
    japaneseShowCard: 'この交通系ICカードに2,000円チャージをお願いします。',
    romaji: 'Kono kōtsūkei IC kādo ni nisen-en chāji o onegaishimasu.',
    englishPrompt: 'Please charge ¥2,000 onto this IC transit card.',
    practicalTip:
      'You can recharge physical Suica/PASMO cards at any 7-Eleven 7-Bank ATM ("Charge IC Card") OR directly at the konbini register—cash only.',
    estimatedCost: '¥1,000–¥10,000 cash',
  },
  {
    id: 'surv-atm-cash',
    category: 'IC Card & ATM',
    title: 'Fee-Friendly 7-Bank / Lawson ATM',
    japaneseShowCard: '海外発行のカードが使えるATMはどこですか？',
    romaji: 'Kaigai hakkō no kādo ga tsukaeru ATM wa doko desu ka?',
    englishPrompt: 'Where is an ATM that accepts overseas bank cards?',
    practicalTip:
      '7-Eleven (7-Bank) and Lawson Bank ATMs accept Visa/Mastercard/Plus/Cirrus 24/7. Always select "JPY (Local Currency)" rather than home-currency conversion.',
    estimatedCost: '¥110–¥220 ATM fee',
  },
  {
    id: 'surv-takkyubin',
    category: 'Takkyubin Luggage',
    title: 'Hotel-to-Hotel Luggage Forwarding',
    japaneseShowCard: 'この荷物を明日のホテルまで宅急便で送りたいです。',
    romaji: 'Kono nimotsu o ashita no hoteru made Takkyūbin de okuritai desu.',
    englishPrompt: 'I would like to send this suitcase via Takkyubin to my next hotel for tomorrow.',
    practicalTip:
      'Drop bags at your hotel front desk or a 7-Eleven/FamilyMart Yamato Transport counter by 17:00 for next-morning delivery between Tokyo, Kyoto & Osaka.',
    estimatedCost: '¥2,100–¥2,600 / suitcase',
  },
  {
    id: 'surv-bag-storage',
    category: 'Takkyubin Luggage',
    title: 'Coin Locker & Hands-Free Counter',
    japaneseShowCard: '大きいスーツケースを預けられる場所はありますか？',
    romaji: 'Ōkii sūtsukēsu o azukerareru basho wa arimasu ka?',
    englishPrompt: 'Is there a counter or locker where I can store a large suitcase?',
    practicalTip:
      'Large station coin lockers fill up by 10:00 AM; look for Yamato "Hands-Free Travel" counters inside Tokyo, Kyoto, and Shin-Osaka stations.',
    estimatedCost: '¥800–¥1,000 / day',
  },
  {
    id: 'surv-konbini-heat',
    category: 'Konbini Counter',
    title: 'Warm Bento & Bag Request',
    japaneseShowCard: '温めていただけますか？袋は一枚お願いします。',
    romaji: 'Atatamete itadakemasu ka? Fukuro wa ichimai onegaishimasu.',
    englishPrompt: 'Could you warm this up? And one plastic bag, please.',
    practicalTip:
      'Cashiers automatically ask "Atatamemasu ka?" (Warm it?) and "Fukuro wa?" (Need a ¥3–¥5 bag?). Touch-screen POS pads let you tap "No Receipt" or IC/Credit.',
    estimatedCost: 'Bag ¥3–¥5',
  },
  {
    id: 'surv-konbini-print',
    category: 'Konbini Counter',
    title: 'Conbini Multi-Copy Printer & Tickets',
    japaneseShowCard: 'コピー機でPDFを印刷したいです。',
    romaji: 'Kopī-ki de PDF o insatsu shitai desu.',
    englishPrompt: 'I want to print a PDF document using the multi-copy machine.',
    practicalTip:
      '7-Eleven netprint & Lawson/FamilyMart PrintSmash let you print JR confirmations or QR vouchers for ¥20 per B&W page.',
    estimatedCost: '¥20–¥60 / page',
  },
];
