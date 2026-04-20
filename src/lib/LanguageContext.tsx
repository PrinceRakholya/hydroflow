import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Nav
    'nav.home': 'Home',
    'nav.live': 'Simulation',
    'nav.dashboard': 'Monitor',
    'nav.analytics': 'Analytics',
    'nav.ai': 'Intelligence',
    'nav.settings': 'Settings',
    // Home
    'home.badge': 'Future of Farming',
    'home.title': 'Cultivate with',
    'home.titleAccent': 'Precision.',
    'home.desc': 'Empowering farmers with real-time climate intelligence, automated irrigation, and AI-driven growth strategies.',
    'home.getStarted': 'Get Started',
    'home.quickStats': 'Quick Stats',
    'home.efficiency': 'Efficiency',
    'home.waterSaved': 'Water Saved',
    'home.growth': 'Growth',
    'home.ecosystem': 'Ecosystem of Intelligence',
    'home.ecosystemDesc': "We've built a seamless bridge between nature and technology to ensure your harvest is always at its peak.",
    'home.phaseAccess': 'Phase Access',
    'home.modal.title': 'Quick System Pulse',
    'home.modal.desc': 'All sensors are online and reporting within optimal parameters. Auto-irrigation is standing by.',
    'home.feature1.title': 'Climate Pulse',
    'home.feature1.desc': 'Precise monitoring of temperature and air humidity with quantum sensors.',
    'home.feature2.title': 'Neural Watering',
    'home.feature2.desc': 'Automated irrigation based on real-time soil biometry and AI modeling.',
    'home.feature3.title': 'Bio Intelligence',
    'home.feature3.desc': 'Advanced predictive analysis to optimize your crop growth cycles.',
    // Dashboard
    'dashboard.title': 'Field Monitor',
    'dashboard.desc': 'High-fidelity sensory telemetry and system neural diagnostics.',
    'dashboard.soilHydro': 'Soil Hydro',
    'dashboard.thermal': 'Thermal',
    'dashboard.atmospheric': 'Atmospheric',
    'dashboard.optimal': 'Optimal',
    'dashboard.warning': 'Warning',
    'dashboard.critical': 'Critical',
    'dashboard.nexus.title': 'Irrigation Nexus',
    'dashboard.nexus.desc': 'Deploy automated hydration protocols via the neural simulation environment.',
    'dashboard.nexus.btn': 'Initiate Control',
    'dashboard.quantum.title': 'Quantum Analytics',
    'dashboard.quantum.desc': 'Decode temporal climate vectors and bio-signal historical patterns.',
    'dashboard.quantum.btn': 'Decrypt Intelligence',
    // Analytics
    'analytics.title': 'Graphical Analysis',
    'analytics.desc': 'Temporal climate vectors and bio-signal patterns.',
    'analytics.export': 'Export Data Stream',
    'analytics.module': 'Visualization Module',
    'analytics.layer': 'Layer',
    'analytics.matrix': 'Signal Matrix',
    'analytics.period': 'Period',
    'analytics.loading': 'Compiling Data Stream...',
    'analytics.noData': 'No telemetry found for selected period.',
    'analytics.reportTitle': 'HydroFlow Agriculture Report',
    'analytics.reportPeriod': 'Period',
    'analytics.time': 'Time',
    'analytics.temp': 'Temperature',
    'analytics.humidity': 'Humidity',
    'analytics.temporalStart': 'Temporal Start',
    'analytics.temporalEnd': 'Temporal End',
    'analytics.stage': 'Analysis Stage',
    'analytics.nodes': 'NODES_LINKED',
    // AI Insights
    'ai.title': 'Neural Advisor',
    'ai.desc': 'AI-driven agronomic intelligence and crop optimization.',
    'ai.active': 'Gemini-3 Flash Active',
    'ai.protocol': 'Protocol Recommendation',
    'ai.recalibrate': 'Recalibrate Neural Net',
    'ai.error': 'Unable to generate insights at this time. Please check your connection and API key.',
    'ai.alert.title': 'Growth Vector Alert',
    'ai.alert.desc': 'Based on current humidity (62%) and upward thermal trajectory, we predict a transpiration peak at T+18H. Initiating protocol 65-DELTA: auto-irrigation threshold elevation to 65% recommended for hydro-stabilization.',
    // Simulation
    'sim.badge': 'LIVE SIMULATION',
    'sim.title': 'Your field, breathing in real time',
    'sim.irrigating': 'Irrigating',
    'sim.zone': 'Zone',
    'sim.auto': 'Automatic',
    'sim.manual': 'Manual',
    'sim.pump': 'Pump',
    'sim.status': 'Protocol',
    'sim.stabilizing': 'Hydro-Stabilizing',
    'sim.standby': 'Standby',
    'sim.active': 'Active',
    'sim.disabled': 'Offline',
    'sim.controls': 'Hydro-Control Matrix',
    'sim.bioFeedback': 'Bio-Feedback Loop',
    'sim.bioFeedbackDesc': 'Real-time plant stress monitoring and hydration response verification.',
    'sim.stream': 'NEURAL_STREAM_01',
    'sim.uptime': 'UPTIME',
    'sim.core': 'CORE',
    // Common
    'btn.save': 'Save & Close',
    'settings.title': 'System Settings',
    'settings.notifications': 'Push Notifications',
    'settings.notificationsDesc': 'Alerts for soil moisture critical levels',
    'settings.thresholds': 'Smart Thresholds',
    'settings.thresholdsDesc': 'Allow AI to auto-calculate nutrient needs',
    'settings.contrast': 'High Contrast',
    'settings.contrastDesc': 'Better visibility for outdoor monitoring',
    'common.close': 'Close Overview',
    'footer.tagline': "The world's most advanced smart agriculture platform. Empowering the next generation of farmers with digital precision.",
    'footer.platform': 'Platform',
    'footer.company': 'Company',
    'footer.about': 'About Us',
    'footer.sustainability': 'Sustainability',
    'footer.contact': 'Contact',
    'footer.copyright': '© 2026 HydroFlow Smart Agri Systems. High-Performance Digital Earth.',
    'footer.privacy': 'Privacy Policy',
    'footer.terms': 'Terms of Service',
  },
  hi: {
    // Nav
    'nav.home': 'होम',
    'nav.live': 'सिमुलेशन',
    'nav.dashboard': 'मॉनिटर',
    'nav.analytics': 'एनालिटिक्स',
    'nav.ai': 'इंटेलिजेंस',
    'nav.settings': 'सेटिंग्स',
    // Home
    'home.badge': 'खेती का भविष्य',
    'home.title': 'सटीकता के साथ',
    'home.titleAccent': 'खेती करें।',
    'home.desc': 'किसानों को रीयल-टाइम जलवायु इंटेलिजेंस, स्वचालित सिंचाई और AI-संचालित विकास रणनीतियों के साथ सशक्त बनाना।',
    'home.getStarted': 'शुरू करें',
    'home.quickStats': 'त्वरित आंकड़े',
    'home.efficiency': 'दक्षता',
    'home.waterSaved': 'पानी की बचत',
    'home.growth': 'विकास',
    'home.ecosystem': 'इंटेलिजेंस का पारिस्थितिकी तंत्र',
    'home.ecosystemDesc': 'हमने प्रकृति और तकनीक के बीच एक सहज सेतु बनाया है ताकि यह सुनिश्चित हो सके कि आपकी फसल हमेशा अपने शिखर पर रहे।',
    'home.phaseAccess': 'चरण पहुँच',
    'home.modal.title': 'त्वरित सिस्टम पल्स',
    'home.modal.desc': 'सभी सेंसर ऑनलाइन हैं और इष्टतम मापदंडों के भीतर रिपोर्ट कर रहे हैं। ऑटो-सिंचाई स्टैंडबाय पर है।',
    'home.feature1.title': 'जलवायु पल्स',
    'home.feature1.desc': 'क्वांटम सेंसर के साथ तापमान और वायु आर्द्रता की सटीक निगरानी।',
    'home.feature2.title': 'न्यूरल सिंचाई',
    'home.feature2.desc': 'रीयल-टाइम मृदा बायोमेट्री और AI मॉडलिंग के आधार पर स्वचालित सिंचाई।',
    'home.feature3.title': 'बायो इंटेलिजेंस',
    'home.feature3.desc': 'आपकी फसल विकास चक्रों को अनुकूलित करने के लिए उन्नत पूर्वानुमान विश्लेषण।',
    // Dashboard
    'dashboard.title': 'फील्ड मॉनिटर',
    'dashboard.desc': 'उच्च-निष्ठा संवेदी टेलीमेट्री और सिस्टम न्यूरल डायग्नोस्टिक्स।',
    'dashboard.soilHydro': 'मृदा हाइड्रो',
    'dashboard.thermal': 'थर्मल',
    'dashboard.atmospheric': 'वायुमंडलीय',
    'dashboard.optimal': 'अनुकूलतम',
    'dashboard.warning': 'चेतावनी',
    'dashboard.critical': 'महत्वपूर्ण',
    'dashboard.nexus.title': 'सिंचाई नेक्सस',
    'dashboard.nexus.desc': 'न्यूरल सिमुलेशन वातावरण के माध्यम से स्वचालित हाइड्रेशन प्रोटोकॉल तैनात करें।',
    'dashboard.nexus.btn': 'नियंत्रण शुरू करें',
    'dashboard.quantum.title': 'क्वांटम एनालिटिक्स',
    'dashboard.quantum.desc': 'लौकिक जलवायु वैक्टर और जैव-संकेत ऐतिहासिक पैटर्न डीकोड करें।',
    'dashboard.quantum.btn': 'इंटेलिजेंस डिक्रिप्ट करें',
    // Analytics
    'analytics.title': 'ग्राफिकल विश्लेषण',
    'analytics.desc': 'लौकिक जलवायु वैक्टर और जैव-संकेत पैटर्न।',
    'analytics.export': 'डेटा स्ट्रीम एक्सपोर्ट करें',
    'analytics.module': 'विज़ुअलाइज़ेशन मॉड्यूल',
    'analytics.layer': 'परत',
    'analytics.matrix': 'सिग्नल मैट्रिक्स',
    'analytics.period': 'अवधि',
    'analytics.loading': 'डेटा स्ट्रीम संकलित हो रही है...',
    'analytics.noData': 'चयनित अवधि के लिए कोई टेलीमेट्री नहीं मिली।',
    'analytics.reportTitle': 'हाइड्रोफ्लो कृषि रिपोर्ट',
    'analytics.reportPeriod': 'अवधि',
    'analytics.time': 'समय',
    'analytics.temp': 'तापमान',
    'analytics.humidity': 'आर्द्रता',
    'analytics.temporalStart': 'लौकिक प्रारंभ',
    'analytics.temporalEnd': 'लौकिक अंत',
    'analytics.stage': 'विश्लेषण चरण',
    'analytics.nodes': 'नोड्स_लिंक्ड',
    // AI Insights
    'ai.title': 'न्यूरल एडवाइजर',
    'ai.desc': 'AI-संचालित कृषि इंटेलिजेंस और फसल अनुकूलन।',
    'ai.active': 'जेमिनी-3 फ्लैश सक्रिय',
    'ai.protocol': 'प्रोटोकॉल अनुशंसा',
    'ai.recalibrate': 'न्यूरल नेट रीकैलिब्रेट करें',
    'ai.error': 'इस समय अंतर्दृष्टि उत्पन्न करने में असमर्थ। कृपया अपना कनेक्शन और API कुंजी जांचें।',
    'ai.alert.title': 'ग्रोथ वेक्टर अलर्ट',
    'ai.alert.desc': 'वर्तमान आर्द्रता (62%) और ऊपर की ओर थर्मल प्रक्षेपवक्र के आधार पर, हम T+18H पर वाष्पोत्सर्जन शिखर की भविष्यवाणी करते हैं। प्रोटोकॉल 65-DELTA शुरू करना: हाइड्रो-स्थिरीकरण के लिए ऑटो-सिंचाई थ्रेसहोल्ड को 65% तक बढ़ाने की सिफारिश की गई है।',
    // Simulation
    'sim.badge': 'लाइव सिमुलेशन',
    'sim.title': 'आपका क्षेत्र, वास्तविक समय में सांस ले रहा है',
    'sim.irrigating': 'सिंचाई हो रही है',
    'sim.zone': 'ज़ोन',
    'sim.auto': 'स्वचालित',
    'sim.manual': 'मैनुअल',
    'sim.pump': 'पंप',
    'sim.status': 'प्रोटोकॉल',
    'sim.stabilizing': 'हाइड्रो-स्थिरीकरण',
    'sim.standby': 'स्टैंडबाय',
    'sim.active': 'सक्रिय',
    'sim.disabled': 'ऑफ़लाइन',
    'sim.controls': 'हाइड्रो-कंट्रोल मैट्रिक्स',
    'sim.bioFeedback': 'बायो-फीडबैक लूप',
    'sim.bioFeedbackDesc': 'रीयल-टाइम प्लांट स्ट्रेस मॉनिटरिंग और हाइड्रेशन रिस्पॉन्स वेरिफिकेशन।',
    'sim.stream': 'न्यूरल_स्ट्रीम_01',
    'sim.uptime': 'अपटाइम',
    'sim.core': 'कोर',
    // Common
    'btn.save': 'सहेजें और बंद करें',
    'settings.title': 'सिस्टम सेटिंग्स',
    'settings.notifications': 'पुश नोटिफिकेशन',
    'settings.notificationsDesc': 'मिट्टी की नमी के महत्वपूर्ण स्तरों के लिए अलर्ट',
    'settings.thresholds': 'स्मार्ट थ्रेसहोल्ड',
    'settings.thresholdsDesc': 'AI को पोषक तत्वों की जरूरतों की गणना करने दें',
    'settings.contrast': 'हाई कंट्रास्ट',
    'settings.contrastDesc': 'बाहरी निगरानी के लिए बेहतर दृश्यता',
    'common.close': 'अवलोकन बंद करें',
    'footer.tagline': 'दुनिया का सबसे उन्नत स्मार्ट कृषि मंच। डिजिटल सटीकता के साथ किसानों की अगली पीढ़ी को सशक्त बनाना।',
    'footer.platform': 'प्लेटफार्म',
    'footer.company': 'कंपनी',
    'footer.about': 'हमारे बारे में',
    'footer.sustainability': 'सस्टेनेबिलिटी',
    'footer.contact': 'संपर्क',
    'footer.copyright': '© 2026 हाइड्रोफ्लो स्मार्ट एग्री सिस्टम्स। हाई-परफॉर्मेंस डिजिटल अर्थ।',
    'footer.privacy': 'गोपनीयता नीति',
    'footer.terms': 'सेवा की शर्तें',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
