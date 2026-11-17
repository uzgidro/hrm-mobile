import dayjs from 'dayjs';
import {
  clampProgress,
  courseAction,
  curriculumPlan,
  deadlineState,
  fileKind,
  flatCurriculum,
  groupCurriculum,
  hasCurriculumApi,
  initialPlayerView,
  isSafeLink,
  lessonDone,
  nextLesson,
  nextOptionId,
  nudgeLesson,
  nudgeSection,
  planBody,
  playsInApp,
} from '../learning';

describe('learning utils (v2 LearningPage / CoursePlayer)', () => {
  it('kurs amali: yozilgan — «yozilgan»; ochiq yozilish — «yozilish»; aks holda yopiq', () => {
    const enrolled = new Set([1]);
    expect(courseAction({ id: 1, is_open_enrollment: true }, enrolled)).toBe('enrolled');
    expect(courseAction({ id: 2, is_open_enrollment: true }, enrolled)).toBe('enroll');
    expect(courseAction({ id: 3, is_open_enrollment: false }, enrolled)).toBe('closed');
    expect(courseAction({ id: 4 }, enrolled)).toBe('closed');
  });

  it("progress 0..100 ga qisiladi; yo'q/NaN — 0 (darssiz kurs buzuq ko'rinmasin)", () => {
    expect(clampProgress(42)).toBe(42);
    expect(clampProgress(140)).toBe(100);
    expect(clampProgress(-5)).toBe(0);
    expect(clampProgress(null)).toBe(0);
    expect(clampProgress('abc' as never)).toBe(0);
    expect(clampProgress('55.5' as never)).toBe(55.5);
  });

  it('dars bajarilganmi / keyingi bajarilmagan dars', () => {
    const lessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(lessonDone(2, [2, 3])).toBe(true);
    expect(lessonDone(1, undefined)).toBe(false);
    expect(nextLesson(lessons, [1])?.id).toBe(2);
    expect(nextLesson(lessons, [1, 2, 3])).toBeNull();
    expect(nextLesson([], [])).toBeNull();
  });

  it('havolalar faqat http(s)', () => {
    expect(isSafeLink('https://cdn/x.mp4')).toBe(true);
    expect(isSafeLink('javascript:alert(1)')).toBe(false);
    expect(isSafeLink('intent://x')).toBe(false);
    expect(isSafeLink(null)).toBe(false);
  });

  it("yangi API aniqlanishi: `sections` massivi bor/yo'q", () => {
    expect(hasCurriculumApi({ sections: [] })).toBe(true);
    expect(hasCurriculumApi({})).toBe(false);
    expect(hasCurriculumApi(null)).toBe(false);
  });

  const sections = [
    { id: 20, title: 'B', position: 1 },
    { id: 10, title: 'A', position: 0 },
  ];
  const lessons = [
    { id: 3, section_id: 20, position: 0 },
    { id: 2, section_id: 10, position: 1 },
    { id: 1, section_id: 10, position: 0 },
    { id: 9, section_id: null, position: 0 },
    { id: 8, section_id: 999, position: 1 },
  ];

  it("o'quv dasturi: avval bo'limsiz bloki, keyin bo'limlar tartibda; eski API — tekis ro'yxat", () => {
    const g = groupCurriculum(sections, lessons);
    expect(g.map((x) => x.section?.id ?? null)).toEqual([null, 10, 20]);
    expect(g[0]!.lessons.map((l) => l.id)).toEqual([9, 8]);
    expect(flatCurriculum(sections, lessons).map((l) => l.id)).toEqual([9, 8, 1, 2, 3]);
    expect(groupCurriculum(undefined, lessons)).toEqual([{ section: null, lessons }]);
    expect(groupCurriculum([], [])).toEqual([{ section: null, lessons: [] }]);
  });

  it("tartib: darsni qo'shnisi bilan almashtirish, bo'limni ko'chirish, PUT tanasi", () => {
    const plan = curriculumPlan(groupCurriculum(sections, lessons));
    const moved = nudgeLesson(plan, 1, 1)!;
    expect(planBody(moved)).toEqual({
      loose_lesson_ids: [9, 8],
      sections: [
        { id: 10, lesson_ids: [2, 1] },
        { id: 20, lesson_ids: [3] },
      ],
    });
    expect(nudgeLesson(plan, 1, -1)).toBeNull();
    expect(planBody(nudgeSection(plan, 20, -1)!).sections.map((x) => x.id)).toEqual([20, 10]);
    expect(nudgeSection(plan, 10, -1)).toBeNull();
    // A course without loose lessons still sends an (empty) loose list.
    expect(curriculumPlan(groupCurriculum([sections[1]!], [lessons[2]!]))[0]).toEqual({ sid: null, ids: [] });
  });

  it('pleyer qayerdan ochiladi: havola → tugagan → test → resume → birinchi bajarilmagan', () => {
    const ls = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(initialPlayerView({ completed_lesson_ids: [1] }, ls, '3')).toBe(3);
    expect(initialPlayerView({ completed_lesson_ids: [1] }, ls, '77')).toBe(2);
    expect(initialPlayerView({ status: 'completed' }, ls)).toBe('done');
    expect(initialPlayerView({ has_test: true, completed_lesson_ids: [1, 2, 3] }, ls)).toBe('test');
    expect(initialPlayerView({ last_lesson_id: 3, completed_lesson_ids: [1] }, ls)).toBe(3);
    // The resume point is skipped when it is already done.
    expect(initialPlayerView({ last_lesson_id: 1, completed_lesson_ids: [1] }, ls)).toBe(2);
    expect(initialPlayerView({ completed_lesson_ids: [1, 2, 3] }, ls)).toBe(1);
    expect(initialPlayerView({}, [])).toBeNull();
    expect(initialPlayerView({ has_test: false }, ls, 'test')).toBe(1);
  });

  it('muddat holati: o‘tgan / 7 kun ichida / tugagan kursda yo‘q', () => {
    const today = dayjs('2026-11-17');
    expect(deadlineState({ deadline: '2026-11-10', status: 'in_progress' }, today)).toBe('overdue');
    expect(deadlineState({ deadline: '2026-11-20', status: 'assigned' }, today)).toBe('soon');
    expect(deadlineState({ deadline: '2026-12-30', status: 'assigned' }, today)).toBeNull();
    expect(deadlineState({ deadline: '2026-11-10', status: 'completed' }, today)).toBeNull();
  });

  it('media: fayl turi, ilova ichida faqat o‘z domenimizdagi video', () => {
    expect(fileKind('a.MP4')).toBe('video');
    expect(fileKind(null, 'https://x/y.pdf?sig=1')).toBe('pdf');
    expect(playsInApp('https://minio.uzgidro.uz/b/v.mp4?X-Amz=1')).toBe(true);
    expect(playsInApp('https://youtu.be/abc')).toBe(false);
    expect(playsInApp('https://evil.com/v.mp4')).toBe(false);
  });

  it('variant id: band bo‘lmagan keyingi `oN`', () => {
    expect(nextOptionId(['a', 'b'])).toBe('o2');
    expect(nextOptionId(['o2', 'a', 'b'])).toBe('o3');
  });
});
