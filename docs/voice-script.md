# Voice help — recording script

A speaker button appears next to each step of the report form once its clip
exists. Record each line below in a calm, clear voice, 2–4 seconds each.

## How to record and add the clips

1. Record on any phone in a quiet room (WhatsApp voice note quality is fine).
2. Convert each to **MP3**, mono, 64 kbps or less (keep each file under 50 KB).
3. Name the files exactly as in the table and put them in:
   - `public/audio/ne/` for Nepali
   - `public/audio/mai/` for Maithili
4. List the clips you added in `public/audio/manifest.json`, for example:
   `{ "ne": ["home", "what", "topic"], "mai": ["home"], "en": [] }`
5. Push to GitHub. The speaker buttons appear automatically for listed clips.

## Clips

| File | Nepali (ne) | Maithili (mai) — please check wording |
| --- | --- | --- |
| `home.mp3` | नमस्ते। यहाँ तपाईं आफ्नो गाउँ-टोलको समस्या HTP खबरलाई भन्न सक्नुहुन्छ। रातो बटन थिच्नुहोस्। | नमस्कार। एतय अहाँ अपन गाम-टोलक समस्या HTP खबरकेँ कहि सकैत छी। लाल बटन दबाउ। |
| `what.mp3` | के भयो? लेख्नुहोस्, वा माइकको बटन थिचेर बोल्नुहोस्। | की भेल? लिखू, वा माइकक बटन दबा कऽ बाजू। |
| `topic.mp3` | यो कुन विषयको हो? एउटा छान्नुहोस्। | ई कोन विषयक अछि? एकटा चुनू। |
| `urgency.mp3` | अहिले कसैको ज्यान खतरामा छ भने "छ" छान्नुहोस्, र प्रहरीलाई एक सय नम्बरमा फोन गर्नुहोस्। | अखन ककरो जान खतरामे अछि तँ "हँ" चुनू, आ पुलिसकेँ एक सय नम्बर पर फोन करू। |
| `where.mp3` | यो कहाँ भयो? लोकेसन दिनुहोस्। नदिए पनि हुन्छ। | ई कतय भेल? लोकेसन दिअ। नहि देलो पर होइत अछि। |
| `identity.mp3` | नाम दिनुहुन्छ कि नदिने? नाम नदिए पनि रिपोर्ट पठाउन सकिन्छ। | नाम देब कि नहि? नाम नहि देलो पर रिपोर्ट पठा सकैत छी। |

Only these six are wired in now. More steps (photo, send, tracking) can be
added the same way: tell the developer the step and the clip name.
