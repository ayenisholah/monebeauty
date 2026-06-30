/**
 * The 9 treatments (slugs from design_handoff/04-service-page-template.md).
 * Long-form medical content is filled per the REQUIREMENTS §6 source map; any
 * field left undefined renders as "[CLINIC TO PROVIDE]" in the service template.
 * NO invented medical claims — seeded copy is a draft for clinic review.
 */

export type AppLocale = "en" | "fi" | "ru";

export type TreatmentCategory =
  "face" | "body" | "hair" | "injectable" | "device" | "laser" | "consultation";

export interface FaqItem {
  q: string;
  a: string;
}

export interface TreatmentContent {
  title: string;
  shortDesc: string;
  seoTitle?: string;
  seoDescription?: string;
  whatItIs?: string;
  suitableFor?: string[];
  benefits?: string[];
  process?: string[];
  safety?: string;
  preCare?: string;
  postCare?: string;
  contraindications?: string[];
  sessions?: string;
  results?: string;
  faq?: FaqItem[];
}

export interface Treatment {
  slug: string;
  category: TreatmentCategory;
  /** Caption shown in the placeholder hero image. */
  imageCaption: string;
  content: Record<AppLocale, TreatmentContent>;
}

export const TREATMENTS: Treatment[] = [
  {
    slug: "aesthetic-device-treatments",
    category: "device",
    imageCaption: "Device Cosmetology",
    content: {
      en: {
        title: "Aesthetic Device Treatments",
        shortDesc:
          "Apparatus cosmetology — laser, RF, and device-based protocols for face and body, using proven technologies.",
      },
      fi: {
        title: "Laitehoidot",
        shortDesc:
          "Laitekosmetologia — laser-, RF- ja laitepohjaiset hoidot kasvoille ja vartalolle todistetuilla teknologioilla.",
      },
      ru: {
        title: "Аппаратные процедуры",
        shortDesc:
          "Аппаратная косметология — лазерные, RF и аппаратные протоколы для лица и тела на проверенных технологиях.",
      },
    },
  },
  {
    slug: "laser-hair-removal",
    category: "laser",
    imageCaption: "Laser Hair Removal",
    content: {
      en: {
        title: "Laser Hair Removal",
        shortDesc:
          "Long-lasting, comfortable hair reduction with modern laser technology for face and body.",
        whatItIs:
          "Laser hair removal uses targeted light energy to reduce unwanted hair on the face and body. Modern laser technology treats the hair follicle while keeping the surrounding skin comfortable, making it a popular long-term alternative to shaving and waxing.",
        benefits: [
          "Long-lasting reduction of unwanted hair",
          "Treats face and body areas",
          "Comfortable, fast sessions",
          "Smoother skin without regular shaving or waxing",
        ],
      },
      fi: {
        title: "Laserkarvanpoisto",
        shortDesc:
          "Pitkäkestoinen ja miellyttävä karvanpoisto nykyaikaisella laserteknologialla kasvoille ja vartalolle.",
      },
      ru: {
        title: "Лазерная эпиляция",
        shortDesc:
          "Долговременное и комфортное удаление волос современным лазером для лица и тела.",
      },
    },
  },
  {
    slug: "endospheres-therapy",
    category: "body",
    imageCaption: "Endospheres Therapy",
    content: {
      en: {
        title: "Endospheres Therapy",
        shortDesc:
          "Compressive micro-vibration with radiofrequency and vacuum to improve skin tone, reduce cellulite, and boost microcirculation.",
        whatItIs:
          "Endospheres Therapy is an innovative treatment that uses a device based on compressive micro-vibration combined with radiofrequency and vacuum technology. It works on the skin and underlying tissues to improve firmness and tone, help reduce the appearance of cellulite, and support microcirculation and lymphatic drainage.",
        benefits: [
          "Improves skin firmness and tone",
          "Helps reduce the appearance of cellulite",
          "Supports microcirculation and lymphatic drainage",
          "Comfortable, non-invasive treatment with no downtime",
        ],
        suitableFor: [
          "Those looking to improve body contour and skin tone",
          "Concerns with cellulite and fluid retention",
          "Anyone seeking a comfortable, non-invasive body protocol",
        ],
        sessions:
          "A course is typically recommended; the exact number is set during your consultation. [CLINIC TO PROVIDE]",
        results:
          "Skin can feel firmer and smoother over a course of sessions; individual results vary.",
        faq: [
          {
            q: "Is Endospheres Therapy painful?",
            a: "No. The treatment is comfortable and non-invasive — most clients find it relaxing.",
          },
          {
            q: "Is there any downtime?",
            a: "There is no downtime; you can return to your normal activities right after a session.",
          },
        ],
      },
      fi: {
        title: "Endosfääriterapia",
        shortDesc:
          "Kompressiivinen mikrovärähtely radiotaajuudella ja tyhjiöllä — parantaa ihon kiinteyttä, vähentää selluliittia ja edistää mikroverenkiertoa.",
      },
      ru: {
        title: "Эндосферотерапия",
        shortDesc:
          "Компрессионная микровибрация с радиочастотой и вакуумом — улучшает тонус кожи, уменьшает целлюлит и стимулирует микроциркуляцию.",
      },
    },
  },
  {
    slug: "microneedling-rf",
    category: "device",
    imageCaption: "RF Microneedling",
    content: {
      en: {
        title: "Microneedling RF",
        shortDesc:
          "Radiofrequency microneedling for skin tightening, texture, and rejuvenation with minimal downtime.",
        whatItIs:
          "RF microneedling combines fine microneedles with radiofrequency energy to stimulate the skin's natural renewal in the deeper layers. It is used to improve skin firmness, refine texture, and support a smoother, more rejuvenated appearance with minimal downtime.",
        benefits: [
          "Improves skin firmness and tightening",
          "Refines skin texture",
          "Supports natural skin renewal",
          "Minimal downtime",
        ],
      },
      fi: {
        title: "Mikroneulaus-RF",
        shortDesc:
          "Radiotaajuusmikroneulaus ihon kiinteytykseen, rakenteeseen ja nuorennukseen lyhyellä toipumisajalla.",
      },
      ru: {
        title: "RF-микронидлинг",
        shortDesc:
          "Радиочастотный микронидлинг для подтяжки, улучшения текстуры и омоложения кожи с минимальным восстановлением.",
      },
    },
  },
  {
    slug: "facial-treatments",
    category: "face",
    imageCaption: "Facial Care",
    content: {
      en: {
        title: "Facial Treatments",
        shortDesc:
          "Deep cleansing, hydration, and rejuvenation protocols that bring out healthy, radiant skin.",
        whatItIs:
          "Our facial treatments use the most effective device-based and cosmetic methods to care for your skin — from deep cleansing and hydration to rejuvenation — helping to reveal your natural beauty and a healthy, radiant complexion.",
        benefits: [
          "Deep cleansing and hydration",
          "Brighter, more radiant complexion",
          "Rejuvenation and improved skin quality",
          "Tailored to your skin's needs",
        ],
      },
      fi: {
        title: "Kasvohoidot",
        shortDesc:
          "Syväpuhdistus-, kosteutus- ja uudistushoidot, jotka tuovat esiin terveen ja säteilevän ihon.",
      },
      ru: {
        title: "Процедуры для лица",
        shortDesc:
          "Глубокое очищение, увлажнение и омоложение для здоровой, сияющей кожи.",
      },
    },
  },
  {
    slug: "body-treatments",
    category: "body",
    imageCaption: "Body Care",
    content: {
      en: {
        title: "Body Treatments",
        shortDesc:
          "Contouring, lymphatic, and firming protocols for the whole body.",
        whatItIs:
          "Our body treatments combine effective device-based methods and professional protocols to support body contouring, skin firmness, and lymphatic care — helping you reach your goals with a comfortable, personalized approach.",
        benefits: [
          "Body contouring and shaping support",
          "Improved skin firmness and tone",
          "Lymphatic and circulation support",
          "Personalized treatment plans",
        ],
      },
      fi: {
        title: "Vartalohoidot",
        shortDesc: "Muotoilu-, imuneste- ja kiinteytyshoidot koko vartalolle.",
      },
      ru: {
        title: "Процедуры для тела",
        shortDesc:
          "Контурирование, лимфодренаж и укрепляющие протоколы для всего тела.",
      },
    },
  },
  {
    slug: "injectable-aesthetic-medicine",
    category: "injectable",
    imageCaption: "Injectable",
    content: {
      en: {
        title: "Injectable Aesthetic Medicine",
        shortDesc:
          "Botulinum therapy, dermal fillers, and biorevitalization performed by medical experts.",
      },
      fi: {
        title: "Injektioesteettinen lääketiede",
        shortDesc:
          "Botuliinihoidot, täyteaineet ja biorevitalisaatio lääketieteen asiantuntijoiden toteuttamana.",
      },
      ru: {
        title: "Инъекционная эстетическая медицина",
        shortDesc:
          "Ботулинотерапия, дермальные филлеры и биоревитализация под контролем медицинских специалистов.",
      },
    },
  },
  {
    slug: "trichology",
    category: "hair",
    imageCaption: "Trichology",
    content: {
      en: {
        title: "Trichology",
        shortDesc:
          "Diagnosis and treatment of hair and scalp health to support restoration and growth.",
        whatItIs:
          "Trichology focuses on the health of the hair and scalp. Through diagnosis and targeted protocols — including professional products and treatments — we support scalp health, hair restoration, and growth as part of a comprehensive plan.",
        benefits: [
          "Scalp and hair diagnosis",
          "Support for hair restoration and growth",
          "Professional, targeted protocols",
          "Part of a comprehensive, personalized plan",
        ],
      },
      fi: {
        title: "Trikologia",
        shortDesc:
          "Hiusten ja hiuspohjan terveyden diagnosointi ja hoito kasvun ja palautumisen tueksi.",
      },
      ru: {
        title: "Трихология",
        shortDesc:
          "Диагностика и лечение здоровья волос и кожи головы для восстановления и роста.",
      },
    },
  },
  {
    slug: "medical-consultation",
    category: "consultation",
    imageCaption: "Consultation",
    content: {
      en: {
        title: "Medical Consultation",
        shortDesc:
          "An expert consultation that builds your personalized, evidence-based treatment plan.",
      },
      fi: {
        title: "Lääkärikonsultaatio",
        shortDesc:
          "Asiantuntijakonsultaatio, joka rakentaa henkilökohtaisen, näyttöön perustuvan hoitosuunnitelmasi.",
      },
      ru: {
        title: "Медицинская консультация",
        shortDesc:
          "Экспертная консультация, на которой составляется ваш индивидуальный, научно обоснованный план лечения.",
      },
    },
  },
];

export const TREATMENT_SLUGS = TREATMENTS.map((t) => t.slug);

export function getTreatment(slug: string): Treatment | undefined {
  return TREATMENTS.find((t) => t.slug === slug);
}

/** Footer "Treatments" column (subset, per the homepage spec). */
export const FOOTER_TREATMENT_SLUGS = [
  "aesthetic-device-treatments",
  "laser-hair-removal",
  "endospheres-therapy",
  "microneedling-rf",
  "injectable-aesthetic-medicine",
];
