import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Station } from '@/constants/types';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { EqualizerBars } from './EqualizerBars';

interface StationCardProps {
  station: Station;
  queue?: Station[];
  style?: object;
}

export function StationCard({ station, queue, style }: StationCardProps) {
  const { playStation, currentStation, isPlaying } = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isCurrentlyPlaying =
    currentStation?.stationuuid === station.stationuuid && isPlaying;
  const isCurrent = currentStation?.stationuuid === station.stationuuid;
  const favored = isFavorite(station.stationuuid);
  const countryCode = station.countrycode?.toLowerCase();
  const flagUrl = countryCode ? `https://flagcdn.com/w40/${countryCode}.png` : null;

  const handlePress = () => {
    playStation(station, queue);
  };

  return (
    <Pressable
      style={[styles.card, isCurrent && styles.cardActive, style]}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(255,255,255,0.06)', borderless: false }}
    >
      {/* Station Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/station-placeholder.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Playing indicator overlay */}
        {isCurrentlyPlaying && (
          <View style={styles.playingOverlay}>
            <EqualizerBars />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {station.name?.trim()}
        </Text>
        <View style={styles.meta}>
          {flagUrl ? (
            <Image source={{ uri: flagUrl }} style={styles.flagImage} />
          ) : (
            <Ionicons name="earth" size={14} color={Colors.textSecondary} />
          )}
          <Text style={styles.metaText} numberOfLines={1}>
            {station.country ?? 'Unknown'}
          </Text>
          {station.codec && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>{station.codec} {station.bitrate}k</Text>
            </View>
          )}
        </View>
        {station.votes !== undefined && station.votes > 0 && (
          <View style={styles.votes}>
            <Ionicons name="heart" size={10} color={Colors.primary} />
            <Text style={styles.votesText}>{station.votes}</Text>
          </View>
        )}
      </View>

      {/* Favorite button */}
      <Pressable
        style={styles.favBtn}
        onPress={() => toggleFavorite(station)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true, radius: 20 }}
      >
        <Ionicons
          name={favored ? 'heart' : 'heart-outline'}
          size={22}
          color={favored ? Colors.primary : Colors.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#1C0A0A',
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logo: {
    width: 64,
    height: 64,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagImage: {
    width: 18,
    height: 13,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  pill: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pillText: {
    color: Colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  votes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  votesText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  favBtn: {
    padding: 4,
  },
});
