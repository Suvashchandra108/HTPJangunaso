// Nepal administrative geography for the demo.
// Provinces (7) and districts (77) are complete. Local levels are filled in
// only for a few Madhesh districts as a sample; every other district accepts
// a typed local-level name. Phase 4 replaces this file with the full
// 753-local-level table loaded from Survey Department boundary data.
// Local-level lists below must be checked against the official list before launch.

export interface Province { id: string; ne: string; en: string }
export interface District { id: string; province: string; ne: string; en: string }
export interface LocalLevel { id: string; district: string; ne: string; en: string; lat: number; lng: number }

export const PROVINCES: Province[] = [
  { id: 'koshi', ne: 'कोशी प्रदेश', en: 'Koshi Province' },
  { id: 'madhesh', ne: 'मधेश प्रदेश', en: 'Madhesh Province' },
  { id: 'bagmati', ne: 'बागमती प्रदेश', en: 'Bagmati Province' },
  { id: 'gandaki', ne: 'गण्डकी प्रदेश', en: 'Gandaki Province' },
  { id: 'lumbini', ne: 'लुम्बिनी प्रदेश', en: 'Lumbini Province' },
  { id: 'karnali', ne: 'कर्णाली प्रदेश', en: 'Karnali Province' },
  { id: 'sudurpashchim', ne: 'सुदूरपश्चिम प्रदेश', en: 'Sudurpashchim Province' },
];

const d = (province: string, en: string, ne: string): District =>
  ({ id: en.toLowerCase().replace(/[^a-z]+/g, '-'), province, en, ne });

export const DISTRICTS: District[] = [
  d('koshi', 'Bhojpur', 'भोजपुर'), d('koshi', 'Dhankuta', 'धनकुटा'), d('koshi', 'Ilam', 'इलाम'),
  d('koshi', 'Jhapa', 'झापा'), d('koshi', 'Khotang', 'खोटाङ'), d('koshi', 'Morang', 'मोरङ'),
  d('koshi', 'Okhaldhunga', 'ओखलढुङ्गा'), d('koshi', 'Panchthar', 'पाँचथर'), d('koshi', 'Sankhuwasabha', 'सङ्खुवासभा'),
  d('koshi', 'Solukhumbu', 'सोलुखुम्बु'), d('koshi', 'Sunsari', 'सुनसरी'), d('koshi', 'Taplejung', 'ताप्लेजुङ'),
  d('koshi', 'Terhathum', 'तेह्रथुम'), d('koshi', 'Udayapur', 'उदयपुर'),
  d('madhesh', 'Bara', 'बारा'), d('madhesh', 'Dhanusha', 'धनुषा'), d('madhesh', 'Mahottari', 'महोत्तरी'),
  d('madhesh', 'Parsa', 'पर्सा'), d('madhesh', 'Rautahat', 'रौतहट'), d('madhesh', 'Saptari', 'सप्तरी'),
  d('madhesh', 'Sarlahi', 'सर्लाही'), d('madhesh', 'Siraha', 'सिरहा'),
  d('bagmati', 'Bhaktapur', 'भक्तपुर'), d('bagmati', 'Chitwan', 'चितवन'), d('bagmati', 'Dhading', 'धादिङ'),
  d('bagmati', 'Dolakha', 'दोलखा'), d('bagmati', 'Kathmandu', 'काठमाडौं'), d('bagmati', 'Kavrepalanchok', 'काभ्रेपलाञ्चोक'),
  d('bagmati', 'Lalitpur', 'ललितपुर'), d('bagmati', 'Makwanpur', 'मकवानपुर'), d('bagmati', 'Nuwakot', 'नुवाकोट'),
  d('bagmati', 'Ramechhap', 'रामेछाप'), d('bagmati', 'Rasuwa', 'रसुवा'), d('bagmati', 'Sindhuli', 'सिन्धुली'),
  d('bagmati', 'Sindhupalchok', 'सिन्धुपाल्चोक'),
  d('gandaki', 'Baglung', 'बागलुङ'), d('gandaki', 'Gorkha', 'गोरखा'), d('gandaki', 'Kaski', 'कास्की'),
  d('gandaki', 'Lamjung', 'लमजुङ'), d('gandaki', 'Manang', 'मनाङ'), d('gandaki', 'Mustang', 'मुस्ताङ'),
  d('gandaki', 'Myagdi', 'म्याग्दी'), d('gandaki', 'Nawalpur', 'नवलपुर'), d('gandaki', 'Parbat', 'पर्वत'),
  d('gandaki', 'Syangja', 'स्याङ्जा'), d('gandaki', 'Tanahun', 'तनहुँ'),
  d('lumbini', 'Arghakhanchi', 'अर्घाखाँची'), d('lumbini', 'Banke', 'बाँके'), d('lumbini', 'Bardiya', 'बर्दिया'),
  d('lumbini', 'Dang', 'दाङ'), d('lumbini', 'Eastern Rukum', 'पूर्वी रुकुम'), d('lumbini', 'Gulmi', 'गुल्मी'),
  d('lumbini', 'Kapilvastu', 'कपिलवस्तु'), d('lumbini', 'Parasi', 'परासी'), d('lumbini', 'Palpa', 'पाल्पा'),
  d('lumbini', 'Pyuthan', 'प्युठान'), d('lumbini', 'Rolpa', 'रोल्पा'), d('lumbini', 'Rupandehi', 'रुपन्देही'),
  d('karnali', 'Dailekh', 'दैलेख'), d('karnali', 'Dolpa', 'डोल्पा'), d('karnali', 'Humla', 'हुम्ला'),
  d('karnali', 'Jajarkot', 'जाजरकोट'), d('karnali', 'Jumla', 'जुम्ला'), d('karnali', 'Kalikot', 'कालिकोट'),
  d('karnali', 'Mugu', 'मुगु'), d('karnali', 'Salyan', 'सल्यान'), d('karnali', 'Surkhet', 'सुर्खेत'),
  d('karnali', 'Western Rukum', 'पश्चिमी रुकुम'),
  d('sudurpashchim', 'Achham', 'अछाम'), d('sudurpashchim', 'Baitadi', 'बैतडी'), d('sudurpashchim', 'Bajhang', 'बझाङ'),
  d('sudurpashchim', 'Bajura', 'बाजुरा'), d('sudurpashchim', 'Dadeldhura', 'डडेलधुरा'), d('sudurpashchim', 'Darchula', 'दार्चुला'),
  d('sudurpashchim', 'Doti', 'डोटी'), d('sudurpashchim', 'Kailali', 'कैलाली'), d('sudurpashchim', 'Kanchanpur', 'कञ्चनपुर'),
];

const l = (district: string, en: string, ne: string, lat: number, lng: number): LocalLevel =>
  ({ id: `${district}:${en.toLowerCase().replace(/[^a-z]+/g, '-')}`, district, en, ne, lat, lng });

// Sample local levels with approximate centre points (used for demo map markers only).
export const LOCAL_LEVELS: LocalLevel[] = [
  l('siraha', 'Lahan Municipality', 'लहान नगरपालिका', 26.721, 86.482),
  l('siraha', 'Siraha Municipality', 'सिरहा नगरपालिका', 26.654, 86.208),
  l('siraha', 'Golbazar Municipality', 'गोलबजार नगरपालिका', 26.735, 86.395),
  l('siraha', 'Mirchaiya Municipality', 'मिर्चैया नगरपालिका', 26.88, 86.25),
  l('siraha', 'Dhangadhimai Municipality', 'धनगढीमाई नगरपालिका', 26.72, 86.31),
  l('siraha', 'Kalyanpur Municipality', 'कल्याणपुर नगरपालिका', 26.62, 86.37),
  l('siraha', 'Sukhipur Municipality', 'सुखीपुर नगरपालिका', 26.66, 86.43),
  l('siraha', 'Karjanha Municipality', 'कर्जन्हा नगरपालिका', 26.79, 86.24),
  l('saptari', 'Rajbiraj Municipality', 'राजविराज नगरपालिका', 26.539, 86.748),
  l('saptari', 'Kanchanrup Municipality', 'कञ्चनरुप नगरपालिका', 26.6, 86.92),
  l('saptari', 'Bodebarsain Municipality', 'बोदेबरसाइन नगरपालिका', 26.61, 86.6),
  l('saptari', 'Shambhunath Municipality', 'शम्भुनाथ नगरपालिका', 26.66, 86.63),
  l('saptari', 'Surunga Municipality', 'सुरुङ्गा नगरपालिका', 26.62, 86.96),
  l('saptari', 'Hanumannagar Kankalini Municipality', 'हनुमाननगर कंकालिनी नगरपालिका', 26.53, 86.94),
  l('dhanusha', 'Janakpurdham Sub-Metropolitan City', 'जनकपुरधाम उपमहानगरपालिका', 26.73, 85.925),
  l('kathmandu', 'Kathmandu Metropolitan City', 'काठमाडौं महानगरपालिका', 27.708, 85.32),
];

export const districtsOf = (province?: string) => DISTRICTS.filter((x) => x.province === province);
export const localLevelsOf = (district?: string) => LOCAL_LEVELS.filter((x) => x.district === district);
export const findDistrict = (id?: string) => DISTRICTS.find((x) => x.id === id);
export const findProvince = (id?: string) => PROVINCES.find((x) => x.id === id);
export const findLocalLevel = (id?: string) => LOCAL_LEVELS.find((x) => x.id === id);

/** Display name in the current language; Maithili shows Nepali (both Devanagari). */
export const placeName = (p: { ne: string; en: string } | undefined, lang: string) =>
  !p ? '' : lang === 'en' ? p.en : p.ne;

/**
 * Demo stand-in for the PostGIS point-in-polygon lookup (Phase 2 RPC resolve_location).
 * Picks the nearest sample local level within ~25 km; otherwise returns nothing
 * and the citizen chooses from the lists.
 */
export function resolveLocation(lat: number, lng: number): LocalLevel | undefined {
  let best: LocalLevel | undefined; let bestD = Infinity;
  for (const x of LOCAL_LEVELS) {
    const dKm = Math.hypot((x.lat - lat) * 111, (x.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180));
    if (dKm < bestD) { bestD = dKm; best = x; }
  }
  return bestD <= 25 ? best : undefined;
}
