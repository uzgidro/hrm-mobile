// What a lesson shows in the player: video (our MinIO file plays in the in-app
// player, YouTube/Vimeo/foreign links open outside), an attached file (images
// inline, media in-app, documents in the system viewer) and the text body.
import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeProvider';
import { radii } from '@/theme/tokens';
import { toast } from '@/lib/toast';
import { Icon, type IconName } from '@/components/Icon';
import { encodeMediaUrl } from '@/features/media/mediaParam';
import { Text } from '@/ui';
import type { LearningLesson } from '../api/queries';
import { fileKind, formatBytes, isSafeLink, playsInApp } from '../utils/learning';

export const LESSON_ICON: Record<string, IconName> = {
  text: 'doc',
  video: 'camera',
  file: 'folder',
  quiz: 'checklist',
};

export const lessonIcon = (type?: string | null): IconName => LESSON_ICON[type ?? 'text'] ?? 'doc';

export function LessonMaterial({ lesson }: { lesson: LearningLesson }) {
  const { t } = useTranslation();
  const { colors: c } = useTheme();

  const openOutside = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(t('learning.openFailed'));
    }
  };
  const play = (url: string, name?: string | null) => {
    if (playsInApp(url, name)) {
      router.push({ pathname: '/media', params: { kind: 'video', url: encodeMediaUrl(url), title: lesson.title ?? '' } });
    } else {
      void openOutside(url);
    }
  };

  const video = isSafeLink(lesson.video_url) ? lesson.video_url.trim() : null;
  const file = isSafeLink(lesson.file_url) ? lesson.file_url : null;
  const kind = fileKind(lesson.file_name, lesson.file_url);
  const hasText = !!lesson.content?.trim();

  if (!video && !file && !hasText) {
    return (
      <Text variant="body" tone="muted" testID="lesson-empty">
        {t('learning.lessonEmptyLearner')}
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {video && (
        <Pressable
          testID={`lesson-video-${lesson.id}`}
          accessibilityRole="button"
          onPress={() => play(video)}
          style={({ pressed }) => [styles.player, { backgroundColor: c.brandDeep, opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={[styles.playBtn, { backgroundColor: c.fgOnBrand }]}>
            <Icon name="camera" size={26} color={c.brandDeep} />
          </View>
          <Text variant="label" style={{ color: c.fgOnBrand }}>
            {t('learning.watchVideo')}
          </Text>
        </Pressable>
      )}
      {file && kind === 'image' && (
        <Image source={{ uri: file }} style={[styles.image, { backgroundColor: c.surface2 }]} contentFit="contain" testID="lesson-image" />
      )}
      {file && (kind === 'video' || kind === 'audio') && !video && (
        <Pressable
          testID={`lesson-video-${lesson.id}`}
          accessibilityRole="button"
          onPress={() => play(file, lesson.file_name)}
          style={({ pressed }) => [styles.player, { backgroundColor: c.brandDeep, opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={[styles.playBtn, { backgroundColor: c.fgOnBrand }]}>
            <Icon name="camera" size={26} color={c.brandDeep} />
          </View>
          <Text variant="label" style={{ color: c.fgOnBrand }}>
            {t('learning.watchVideo')}
          </Text>
        </Pressable>
      )}
      {hasText && (
        <Text variant="body" selectable testID="lesson-content">
          {lesson.content}
        </Text>
      )}
      {file && (
        <Pressable
          testID={`lesson-file-${lesson.id}`}
          accessibilityRole="button"
          onPress={() => void openOutside(file)}
          style={({ pressed }) => [styles.fileRow, { borderColor: c.border, backgroundColor: pressed ? c.surface2 : c.surface }]}
        >
          <View style={[styles.fileIcon, { backgroundColor: c.brandSoft }]}>
            <Icon name="doc" size={18} color={c.brand} />
          </View>
          <View style={styles.flex}>
            <Text variant="label" numberOfLines={1}>
              {lesson.file_name || t('learning.openFile')}
            </Text>
            <Text variant="caption" tone="subtle">
              {[t('learning.attachment'), formatBytes(lesson.file_size)].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Icon name="arrowDown" size={18} color={c.fgMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1, minWidth: 0 },
  player: { aspectRatio: 16 / 9, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 10 },
  playBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radii.md, borderWidth: 1.5 },
  fileIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
