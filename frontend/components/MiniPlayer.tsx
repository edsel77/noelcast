import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { usePlayer } from '@/contexts/PlayerContext';
import { EqualizerBars } from './EqualizerBars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * MiniPlayer — persistent bottom bar shown when a station is selected.
 * Tapping it opens the full-screen player.
 */
export function MiniPlayer() {
  const { currentStation, isPlaying, isLoading, togglePlayPause, openPlayer, stopPlayer } = usePlayer();
  const insets = useSafeAreaInsets();

  if (!currentStation) return null;

  return (
    <Pressable
      style={[styles.container, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}
      onPress={openPlayer}
      android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: false }}
    >
      {/* Logo */}
      <Image
        source={require('@/assets/images/station-placeholder.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{currentStation.name?.trim()}</Text>
        {isLoading ? (
          <Text style={styles.sub} numberOfLines={1}>Connecting...</Text>
        ) : isPlaying ? (
          <View style={styles.liveContainer}>
            <EqualizerBars color={Colors.accent} size="small" />
            <Text style={styles.sub} numberOfLines={1}>Live</Text>
          </View>
        ) : (
          <Text style={styles.sub} numberOfLines={1}>Paused</Text>
        )}
      </View>

      {/* Play/Pause */}
      <Pressable
        style={styles.btn}
        onPress={togglePlayPause}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true, radius: 20 }}
      >
        {isLoading ? (
          <Ionicons name="ellipsis-horizontal" size={24} color={Colors.accent} />
        ) : (
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color={Colors.accent}
          />
        )}
      </Pressable>

      {/* Stop */}
      <Pressable
        style={styles.btn}
        onPress={stopPlayer}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true, radius: 20 }}
      >
        <Ionicons name="stop" size={22} color={Colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btn: {
    padding: 4,
  },
});
