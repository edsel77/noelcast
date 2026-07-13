import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';

// ── Animated Equalizer Bars ────────────────────────────────────────────────────
function EqualizerVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const bars = useRef(Array.from({ length: 7 }, () => new Animated.Value(0.2))).current;
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (isPlaying) {
      animsRef.current = bars.map((bar, i) => {
        const anim = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: Math.random() * 0.8 + 0.2,
              duration: 250 + i * 80,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: Math.random() * 0.4 + 0.1,
              duration: 200 + i * 60,
              useNativeDriver: false,
            }),
          ])
        );
        anim.start();
        return anim;
      });
    } else {
      animsRef.current.forEach(a => a.stop());
      bars.forEach(b => b.setValue(0.15));
    }
    return () => animsRef.current.forEach(a => a.stop());
  }, [isPlaying]);

  const MAX_HEIGHT = 64;

  return (
    <View style={vizStyles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            vizStyles.bar,
            {
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: [6, MAX_HEIGHT],
              }),
              backgroundColor: i % 2 === 0 ? Colors.accent : Colors.primary,
            },
          ]}
        />
      ))}
    </View>
  );
}

const vizStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 64,
    marginVertical: 28,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 6,
  },
});

// ── Moving Snowflake Component ───────────────────────────────────────────────
function MovingSnowflake({ index }: { index: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000 + (index % 5) * 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 3000 + (index % 5) * 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [anim, index]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20 + (index % 3) * 10],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30 + (index % 4) * 10],
  });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: `${(index * 8.3) % 100}%`,
        top: `${(index * 13) % 90}%`,
        fontSize: 10 + (index % 3) * 4,
        opacity: 0.15,
        color: '#fff',
        transform: [{ translateX }, { translateY }],
      }}
    >
      ❄
    </Animated.Text>
  );
}

// ── Pulsing ring around the logo ──────────────────────────────────────────────
function PulseRing({ active, logoSize }: { active: boolean, logoSize: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      animRef.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, { toValue: 1.18, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(scale, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.35, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
          ]),
        ])
      );
      animRef.current.start();
    } else {
      animRef.current?.stop();
      scale.setValue(1);
      opacity.setValue(0);
    }
    return () => animRef.current?.stop();
  }, [active]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: logoSize + 32,
        height: logoSize + 32,
        borderRadius: (logoSize + 32) / 2,
        borderWidth: 2,
        borderColor: Colors.primary,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

// ── Full Screen Player ─────────────────────────────────────────────────────────
export function FullScreenPlayer({ inline = false }: { inline?: boolean }) {
  const { width: SW } = useWindowDimensions();
  const logoSize = Math.min(SW * 0.6, 280);
  const insets = useSafeAreaInsets();
  const player = usePlayer();
  const { isFavorite, toggleFavorite } = useFavorites();

  if (!player || !player.currentStation) return null;
  const { currentStation, isPlaying, isLoading, isPlayerVisible, togglePlayPause, stopPlayer, playNext, playPrevious, closePlayer } = player;

  const favored = isFavorite(currentStation.stationuuid);

  // ── Inline panel (desktop sidebar) ──────────────────────────────────────────
  if (inline) {
    return (
      <View style={[styles.root, styles.inlineRoot]}>
        <LinearGradient
          colors={['#1A0000', '#0A0A0A', '#000000']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />
        <View style={styles.inlineContainer}>
          <View style={styles.middleContainer}>
            <View style={[styles.logoWrapper, { width: logoSize + 32, height: logoSize + 32 }]}>
              <PulseRing active={isPlaying} logoSize={logoSize} />
              <View style={[styles.logoBg, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                <Image
                  source={require('@/assets/images/station-placeholder.png')}
                  style={[styles.logo, { width: logoSize * 1.1, height: logoSize * 1.1 }]}
                  resizeMode="cover"
                />
              </View>
            </View>
            <View style={styles.stationInfo}>
              <Text style={styles.stationName} numberOfLines={2}>{currentStation.name?.trim()}</Text>
              <Text style={styles.stationMeta}>
                {currentStation.country ? `${currentStation.country} • ` : ''}
                {currentStation.codec ?? 'MP3'}{' '}
                {currentStation.bitrate ? `${currentStation.bitrate}kbps` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.bottomContainer}>
            <View style={styles.equalizerRow}>
              <EqualizerVisualizer isPlaying={isPlaying && !isLoading} />
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.liveChip, !isPlaying && styles.liveChipPaused]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
                ) : isPlaying ? (
                  <View style={styles.liveDot} />
                ) : (
                  <Ionicons name="pause" size={12} color={Colors.textMuted} />
                )}
                <Text style={[styles.liveText, !isPlaying && styles.liveTextPaused]}>
                  {isLoading ? 'BUFFERING' : isPlaying ? 'LIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>
            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlBtn} onPress={playPrevious}>
                <Ionicons name="play-skip-back" size={36} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} onPress={togglePlayPause} disabled={isLoading}>
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.playBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={isLoading ? 'radio-outline' : isPlaying ? 'pause' : 'play'} size={40} color={Colors.white} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} onPress={playNext}>
                <Ionicons name="play-skip-forward" size={36} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Full-screen modal (mobile / tablet) ─────────────────────────────────────

  return (
    <Modal 
      visible={isPlayerVisible} 
      transparent 
      animationType="slide" 
      statusBarTranslucent
      onRequestClose={closePlayer}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={['#1A0000', '#0A0A0A', '#000000']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
        />

        {/* Snow particles */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {[...Array(12)].map((_, i) => (
            <MovingSnowflake key={i} index={i} />
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.mainContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={closePlayer} style={styles.headerBtn}>
              <Ionicons name="chevron-down" size={28} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Now Playing</Text>
            <TouchableOpacity
              onPress={() => toggleFavorite(currentStation)}
              style={styles.headerBtn}
            >
              <Ionicons
                name={favored ? 'heart' : 'heart-outline'}
                size={26}
                color={favored ? Colors.primary : Colors.text}
              />
            </TouchableOpacity>
          </View>

          {/* Middle Container for Logo and Info */}
          <View style={styles.middleContainer}>
            {/* Station Logo */}
            <View style={[styles.logoWrapper, { width: logoSize + 32, height: logoSize + 32 }]}>
              <PulseRing active={isPlaying} logoSize={logoSize} />
              <View style={[styles.logoBg, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}>
                <Image
                  source={require('@/assets/images/station-placeholder.png')}
                  style={[styles.logo, { width: logoSize * 1.1, height: logoSize * 1.1 }]}
                  resizeMode="cover"
                />
              </View>
            </View>

            {/* Station Info */}
            <View style={styles.stationInfo}>
              <Text style={styles.stationName} numberOfLines={2}>
                {currentStation.name?.trim()}
              </Text>
              <Text style={styles.stationMeta}>
                {currentStation.country ? `${currentStation.country} • ` : ''}
                {currentStation.codec ?? 'MP3'}{' '}
                {currentStation.bitrate ? `${currentStation.bitrate}kbps` : ''}
              </Text>
            </View>
          </View>

          {/* Bottom Container for Controls */}
          <View style={styles.bottomContainer}>
            {/* Equalizer */}
            <View style={styles.equalizerRow}>
              <EqualizerVisualizer isPlaying={isPlaying && !isLoading} />
            </View>

            {/* Status */}
            <View style={styles.statusRow}>
              <View style={[styles.liveChip, !isPlaying && styles.liveChipPaused]}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={Colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
                ) : isPlaying ? (
                  <View style={styles.liveDot} />
                ) : (
                  <Ionicons name="pause" size={12} color={Colors.textMuted} />
                )}
                <Text style={[styles.liveText, !isPlaying && styles.liveTextPaused]}>
                  {isLoading ? 'BUFFERING' : isPlaying ? 'LIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>

            {/* Main Controls */}
            <View style={styles.controls}>
              {/* Previous */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={playPrevious}
              >
                <Ionicons name="play-skip-back" size={36} color={Colors.textMuted} />
              </TouchableOpacity>

              {/* Play / Pause — large */}
              <TouchableOpacity
                style={styles.playBtn}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  style={styles.playBtnInner}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={isLoading ? 'radio-outline' : isPlaying ? 'pause' : 'play'}
                    size={40}
                    color={Colors.white}
                  />
                </LinearGradient>
              </TouchableOpacity>

              {/* Next */}
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={playNext}
              >
                <Ionicons name="play-skip-forward" size={36} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Developer Credit — Android only */}
            {Platform.OS === 'android' && (
              <View style={styles.devCredit}>
                <Text style={styles.devCreditText}>Developed by{' '}
                  <Text
                    style={styles.devCreditLink}
                    onPress={() => Linking.openURL('https://driftapps.xyz')}
                  >
                    Drift Apps
                  </Text>
                </Text>
                <Text
                  style={styles.devCreditUrl}
                  onPress={() => Linking.openURL('https://noelcast.driftapps.xyz')}
                >
                  noelcast.driftapps.xyz
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  inlineRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  inlineContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  mainContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  middleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  logoWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoBg: {
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  logo: {
  },
  stationInfo: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stationName: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  stationMeta: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  equalizerRow: {
    alignItems: 'center',
  },
  statusRow: {
    marginBottom: 16,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(183, 28, 28, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  liveChipPaused: {
    backgroundColor: 'rgba(30,30,30,0.5)',
    borderColor: Colors.border,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  liveText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  liveTextPaused: {
    color: Colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 32,
  },
  controlBtn: {
    width: 44,
    alignItems: 'center',
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  playBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devCredit: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  devCreditText: {
    color: Colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  devCreditLink: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  devCreditUrl: {
    color: Colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.2)',
  },
});
