/**
 * Seeds demo content so the platform can be explored right away.
 *   npm run db:seed          -> adds demo data only if there are no conferences yet
 *   npm run db:seed -- --force -> adds the demo data again
 */
import { count, eq } from "drizzle-orm";
import { db } from "./index";
import { ensureDatabase } from "./bootstrap";
import { abstracts, conferences, registrations, sessionSpeakers, sessions, speakers, sponsors, tracks, users } from "./schema";
import { generateCode } from "@/lib/codes";

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function main() {
  await ensureDatabase();
  const force = process.argv.includes("--force");
  const [existing] = await db.select({ value: count() }).from(conferences);
  if ((existing?.value ?? 0) > 0 && !force) {
    console.log("[seed] conferences already exist; use --force to add demo data anyway");
    return;
  }

  const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  const ownerId = admin?.id ?? null;
  const today = new Date();
  const start = addDays(today, 45);
  const end = addDays(start, 1);

  const [annual] = await db
    .insert(conferences)
    .values({
      ownerId,
      slug: `cmc-hub-annual-${start.getUTCFullYear()}`,
      titleAr: `مؤتمر CMC Hub السنوي ${start.getUTCFullYear()}`,
      titleEn: `CMC Hub Annual Conference ${start.getUTCFullYear()}`,
      taglineAr: "التحول الرقمي في صناعة المؤتمرات والفعاليات",
      taglineEn: "Digital transformation in the conference and events industry",
      descriptionAr:
        "يجمع المؤتمر السنوي منظمي الفعاليات والباحثين والجهات الراعية لمناقشة أحدث الممارسات في تخطيط المؤتمرات وإدارتها، من التسجيل الإلكتروني وإدارة الملخصات البحثية إلى تجربة الحضور والقياس.\n\nيتضمن البرنامج كلمات رئيسية وورش عمل تطبيقية وجلسات حوارية على مدى يومين.",
      descriptionEn:
        "The annual conference brings together event organisers, researchers and sponsors to discuss the latest practice in planning and running conferences, from online registration and abstract management to attendee experience and measurement.\n\nThe programme includes keynotes, hands-on workshops and panel discussions over two days.",
      startDate: iso(start),
      endDate: iso(end),
      venueAr: "مركز المؤتمرات الدولي",
      venueEn: "International Conference Centre",
      city: "Riyadh",
      country: "Saudi Arabia",
      website: "https://cmchub.net",
      contactEmail: "info@cmchub.net",
      status: "published",
      registrationOpen: true,
      abstractsOpen: true,
      abstractDeadline: iso(addDays(today, 20)),
      capacity: 300,
      price: 450,
      currency: "SAR",
    })
    .returning();

  const [trackA, trackB, trackC] = await db
    .insert(tracks)
    .values([
      { conferenceId: annual.id, nameAr: "إدارة الفعاليات", nameEn: "Event Management", color: "#2a807a" },
      { conferenceId: annual.id, nameAr: "التقنية والبيانات", nameEn: "Technology & Data", color: "#1d4ed8" },
      { conferenceId: annual.id, nameAr: "البحث العلمي", nameEn: "Scientific Research", color: "#b45309" },
    ])
    .returning();

  const speakerRows = await db
    .insert(speakers)
    .values([
      {
        conferenceId: annual.id,
        nameAr: "د. سارة العتيبي",
        nameEn: "Dr. Sarah Alotaibi",
        jobTitleAr: "أستاذة إدارة الفعاليات",
        jobTitleEn: "Professor of Event Management",
        organization: "King Saud University",
        bioAr: "باحثة في تخطيط المؤتمرات وتجربة الحضور، ولها أكثر من عشرين ورقة علمية في المجال.",
        bioEn: "Researcher in conference planning and attendee experience with more than twenty published papers in the field.",
        isKeynote: true,
        sortOrder: 1,
      },
      {
        conferenceId: annual.id,
        nameAr: "م. خالد الحربي",
        nameEn: "Eng. Khalid Alharbi",
        jobTitleAr: "مدير المنتجات",
        jobTitleEn: "Head of Product",
        organization: "CMC Hub",
        bioAr: "يقود تطوير منصة CMC Hub منذ انطلاقها، ويركز على أتمتة التسجيل وإدارة الملخصات.",
        bioEn: "Leads the CMC Hub platform, focusing on registration automation and abstract management.",
        isKeynote: true,
        sortOrder: 2,
      },
      {
        conferenceId: annual.id,
        nameAr: "أ. منى القحطاني",
        nameEn: "Mona Alqahtani",
        jobTitleAr: "مديرة المؤتمرات",
        jobTitleEn: "Conference Director",
        organization: "Riyadh Exhibitions",
        bioAr: "أشرفت على تنظيم أكثر من خمسين مؤتمراً دولياً في المنطقة.",
        bioEn: "Has overseen more than fifty international conferences across the region.",
        sortOrder: 3,
      },
      {
        conferenceId: annual.id,
        nameAr: "د. عمر السالم",
        nameEn: "Dr. Omar Alsalem",
        jobTitleAr: "رئيس اللجنة العلمية",
        jobTitleEn: "Chair of the Scientific Committee",
        organization: "Gulf Research Council",
        bioAr: "متخصص في تحكيم الأبحاث وإدارة اللجان العلمية للمؤتمرات.",
        bioEn: "Specialist in peer review and scientific committee management for conferences.",
        sortOrder: 4,
      },
      {
        conferenceId: annual.id,
        nameAr: "أ. ليلى يوسف",
        nameEn: "Layla Yousef",
        jobTitleAr: "خبيرة تجربة المستخدم",
        jobTitleEn: "UX Specialist",
        organization: "Design Studio",
        bioAr: "تعمل على تصميم تجارب تسجيل وحضور سلسة للفعاليات الكبرى.",
        bioEn: "Designs smooth registration and attendance experiences for large events.",
        sortOrder: 5,
      },
    ])
    .returning();
  const [sarah, khalid, mona, omar, layla] = speakerRows;

  const day1 = iso(start);
  const day2 = iso(end);
  const sessionRows = await db
    .insert(sessions)
    .values([
      { conferenceId: annual.id, titleAr: "التسجيل وافتتاح المعرض", titleEn: "Registration & exhibition opens", day: day1, startTime: "08:00", endTime: "09:00", type: "other", room: "Lobby" },
      { conferenceId: annual.id, titleAr: "الجلسة الافتتاحية", titleEn: "Opening ceremony", day: day1, startTime: "09:00", endTime: "09:30", type: "other", room: "Main Hall" },
      {
        conferenceId: annual.id,
        titleAr: "مستقبل المؤتمرات: من القاعة إلى المنصة",
        titleEn: "The future of conferences: from the hall to the platform",
        abstractAr: "كيف تغيّر المنصات الرقمية طريقة تخطيط المؤتمرات وقياس أثرها.",
        abstractEn: "How digital platforms are changing the way conferences are planned and measured.",
        day: day1,
        startTime: "09:30",
        endTime: "10:30",
        type: "keynote",
        room: "Main Hall",
        trackId: trackA.id,
      },
      { conferenceId: annual.id, titleAr: "استراحة", titleEn: "Coffee break", day: day1, startTime: "10:30", endTime: "11:00", type: "break" },
      {
        conferenceId: annual.id,
        titleAr: "أتمتة التسجيل وإدارة السعة",
        titleEn: "Automating registration and capacity management",
        abstractAr: "ورشة تطبيقية حول بناء مسارات تسجيل متعددة الفئات مع التحكم في السعة.",
        abstractEn: "Hands-on workshop on building multi-tier registration flows with capacity control.",
        day: day1,
        startTime: "11:00",
        endTime: "12:30",
        type: "workshop",
        room: "Room A",
        trackId: trackB.id,
      },
      {
        conferenceId: annual.id,
        titleAr: "تصميم تجربة الحضور",
        titleEn: "Designing the attendee experience",
        abstractAr: "من الدعوة إلى ما بعد الفعالية: رحلة المشارك كاملة.",
        abstractEn: "From invitation to post-event: the complete participant journey.",
        day: day1,
        startTime: "11:00",
        endTime: "12:30",
        type: "talk",
        room: "Room B",
        trackId: trackA.id,
      },
      { conferenceId: annual.id, titleAr: "استراحة الغداء", titleEn: "Lunch", day: day1, startTime: "12:30", endTime: "13:30", type: "break" },
      {
        conferenceId: annual.id,
        titleAr: "جلسة حوارية: الرعاية والشراكات",
        titleEn: "Panel: sponsorship and partnerships",
        abstractAr: "كيف تبني حزم رعاية جذابة وتقيس العائد للرعاة.",
        abstractEn: "Building attractive sponsorship packages and measuring sponsor return.",
        day: day1,
        startTime: "13:30",
        endTime: "14:30",
        type: "panel",
        room: "Main Hall",
        trackId: trackA.id,
      },
      {
        conferenceId: annual.id,
        titleAr: "إدارة الملخصات البحثية والتحكيم",
        titleEn: "Abstract management and peer review",
        abstractAr: "تنظيم استقبال الملخصات، وتوزيعها على المحكمين، وإصدار القرارات.",
        abstractEn: "Organising abstract submission, reviewer assignment and decisions.",
        day: day2,
        startTime: "09:00",
        endTime: "10:00",
        type: "keynote",
        room: "Main Hall",
        trackId: trackC.id,
      },
      {
        conferenceId: annual.id,
        titleAr: "البيانات والتحليلات في الفعاليات",
        titleEn: "Data and analytics for events",
        abstractAr: "ما الذي يجب قياسه قبل الفعالية وأثناءها وبعدها.",
        abstractEn: "What to measure before, during and after the event.",
        day: day2,
        startTime: "10:30",
        endTime: "11:30",
        type: "talk",
        room: "Room A",
        trackId: trackB.id,
      },
      { conferenceId: annual.id, titleAr: "الجلسة الختامية والتوصيات", titleEn: "Closing session and recommendations", day: day2, startTime: "12:00", endTime: "12:45", type: "other", room: "Main Hall" },
    ])
    .returning();

  const byTitle = new Map(sessionRows.map((s) => [s.titleEn, s]));
  await db.insert(sessionSpeakers).values([
    { sessionId: byTitle.get("The future of conferences: from the hall to the platform")!.id, speakerId: sarah.id },
    { sessionId: byTitle.get("Automating registration and capacity management")!.id, speakerId: khalid.id },
    { sessionId: byTitle.get("Designing the attendee experience")!.id, speakerId: layla.id },
    { sessionId: byTitle.get("Panel: sponsorship and partnerships")!.id, speakerId: mona.id },
    { sessionId: byTitle.get("Panel: sponsorship and partnerships")!.id, speakerId: khalid.id },
    { sessionId: byTitle.get("Abstract management and peer review")!.id, speakerId: omar.id },
    { sessionId: byTitle.get("Data and analytics for events")!.id, speakerId: khalid.id },
  ]);

  await db.insert(sponsors).values([
    { conferenceId: annual.id, name: "Riyadh Exhibitions", tier: "platinum", website: "https://example.com", sortOrder: 1 },
    { conferenceId: annual.id, name: "Gulf Research Council", tier: "gold", website: "https://example.com", sortOrder: 2 },
    { conferenceId: annual.id, name: "Design Studio", tier: "silver", sortOrder: 3 },
    { conferenceId: annual.id, name: "Events Weekly", tier: "media", sortOrder: 4 },
  ]);

  await db.insert(registrations).values([
    { conferenceId: annual.id, code: generateCode("REG"), fullName: "أحمد محمد", email: "ahmed@example.com", organization: "جامعة الملك سعود", ticketType: "standard", status: "confirmed" },
    { conferenceId: annual.id, code: generateCode("REG"), fullName: "Fatimah Ali", email: "fatimah@example.com", organization: "Gulf Research Council", ticketType: "student", status: "pending" },
    { conferenceId: annual.id, code: generateCode("REG"), fullName: "Yousef Hassan", email: "yousef@example.com", ticketType: "vip", status: "confirmed" },
  ]);

  await db.insert(abstracts).values([
    {
      conferenceId: annual.id,
      code: generateCode("ABS"),
      title: "أثر التسجيل الإلكتروني على نسبة الحضور الفعلي في المؤتمرات العلمية",
      authors: "نورة الشمري، فهد الدوسري",
      email: "noura@example.com",
      affiliation: "جامعة الأميرة نورة",
      topic: "إدارة الفعاليات",
      keywords: "التسجيل الإلكتروني، الحضور، المؤتمرات",
      body: "تهدف هذه الدراسة إلى قياس أثر اعتماد أنظمة التسجيل الإلكتروني على نسبة الحضور الفعلي مقارنة بالتسجيل اليدوي، من خلال تحليل بيانات اثني عشر مؤتمراً علمياً أقيمت بين عامي 2022 و2025. تشير النتائج الأولية إلى ارتفاع نسبة الحضور الفعلي بمعدل 18% مع استخدام رموز التأكيد والتذكير الآلي.",
      status: "under_review",
    },
    {
      conferenceId: annual.id,
      code: generateCode("ABS"),
      title: "A lightweight framework for multilingual conference websites",
      authors: "Omar Alsalem, Layla Yousef",
      email: "omar@example.com",
      affiliation: "Gulf Research Council",
      topic: "Technology & Data",
      keywords: "i18n, RTL, web platforms",
      body: "This paper proposes a lightweight framework for building bilingual (Arabic/English) conference websites with full right-to-left support. We describe the data model, the localisation approach and the results of a usability study with 42 organisers, which showed a 35% reduction in content-entry time compared with maintaining two separate sites.",
      status: "submitted",
    },
  ]);

  // A past conference, so the archive section has content.
  const pastStart = addDays(today, -300);
  await db.insert(conferences).values({
    ownerId,
    slug: `cmc-hub-annual-${pastStart.getUTCFullYear()}`,
    titleAr: `مؤتمر CMC Hub السنوي ${pastStart.getUTCFullYear()}`,
    titleEn: `CMC Hub Annual Conference ${pastStart.getUTCFullYear()}`,
    taglineAr: "الانطلاقة الجديدة لمنصة إدارة المؤتمرات",
    taglineEn: "The relaunch of the conference management platform",
    descriptionAr: "النسخة السابقة من المؤتمر السنوي، وقد ناقشت إعادة بناء منصة cmchub.net بتقنيات حديثة.",
    descriptionEn: "The previous edition of the annual conference, which discussed rebuilding cmchub.net on a modern stack.",
    startDate: iso(pastStart),
    endDate: iso(addDays(pastStart, 1)),
    venueAr: "فندق الفيصلية",
    venueEn: "Al Faisaliah Hotel",
    city: "Riyadh",
    country: "Saudi Arabia",
    status: "published",
    registrationOpen: false,
    abstractsOpen: false,
    capacity: 200,
    price: 0,
  });

  // A draft, so the admin list shows the workflow.
  await db.insert(conferences).values({
    ownerId,
    slug: "regional-events-forum",
    titleAr: "منتدى الفعاليات الإقليمي",
    titleEn: "Regional Events Forum",
    startDate: iso(addDays(today, 180)),
    endDate: iso(addDays(today, 181)),
    city: "Jeddah",
    country: "Saudi Arabia",
    status: "draft",
  });

  console.log(`[seed] demo data created (conference #${annual.id}: ${annual.slug})`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
