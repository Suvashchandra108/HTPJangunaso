import { useTranslation } from 'react-i18next';
import { PageHead } from '../components/Layout';

// DRAFT for legal review (Phase 1 launch gate). Not final policy text.
const TEXT = {
  ne: {
    title: 'गोपनीयता नीति (मस्यौदा)',
    items: [
      ['रिपोर्टहरू जाँचपछि मात्र सार्वजनिक', 'तपाईंले पठाएको कुनै पनि कुरा आफैं प्रकाशित हुँदैन। HTP खबरले जाँच गरेर सार्वजनिक चासोको सारांश मात्र प्रकाशित गर्न सक्छ।'],
      ['नाम नदिई रिपोर्ट', 'नाम, फोन वा इमेल नदिई रिपोर्ट गर्न सकिन्छ। तर इन्टरनेट प्रयोग गर्दा केही प्राविधिक जानकारी बन्ने भएकाले हामी पूर्ण गुमनामीको ग्यारेन्टी गर्दैनौं।'],
      ['तपाईंको सम्पर्क', 'दिनुभएको फोन वा इमेल कहिल्यै सार्वजनिक हुँदैन। HTP खबरका प्रमुख सम्पादक मात्र हेर्न सक्छन्, र हरेक पटक हेरेको अभिलेख राखिन्छ।'],
      ['स्थान', 'तपाईंको ठ्याक्कै GPS स्थान गोप्य रहन्छ। सार्वजनिक पृष्ठमा जिल्ला वा स्थानीय तह मात्र देखिन्छ। फोटोभित्रको स्थान जानकारी पठाउनुअघि नै तपाईंको फोनमै हटाइन्छ।'],
      ['ट्र्याक गर्ने लिंक', 'तपाईंको गोप्य लिंक हामी पढ्न सकिने रूपमा राख्दैनौं। हराए हामी फेरि दिन सक्दैनौं।'],
      ['डेमो संस्करण', 'यो डेमोमा डेटा तपाईंकै ब्राउजरमा मात्र बस्छ। वास्तविक रिपोर्ट नपठाउनुहोस्।'],
    ],
  },
  en: {
    title: 'Privacy policy (draft)',
    items: [
      ['Nothing is published automatically', 'HTP Khabar checks every report and may publish only an editor-written summary of public-interest issues.'],
      ['Anonymous reporting', 'You can report without a name, phone or email. Because internet use creates some technical records, we do not promise absolute anonymity.'],
      ['Your contact details', 'A phone or email you give is never published. Only the Admin Head can see it, and every view is logged.'],
      ['Location', 'Your exact GPS point stays private; public pages show only the district or local level. Location data inside photos is removed on your phone before upload.'],
      ['Tracking link', 'We store your private link only in a form we cannot read back, so we cannot resend it if lost.'],
      ['Demo version', 'In this demo, data stays only in your own browser. Please do not send real reports.'],
    ],
  },
};

export default function PrivacyPage() {
  const { i18n } = useTranslation();
  const c = i18n.language === 'en' ? TEXT.en : TEXT.ne;
  return (
    <div className="app">
      <PageHead title={c.title} />
      <main className="page" style={{ gap: 16 }}>
        {c.items.map(([h, p]) => (
          <section key={h} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{h}</h2>
            <p style={{ margin: 0, color: 'var(--text-2)' }}>{p}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
