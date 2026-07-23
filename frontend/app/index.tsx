import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { GITHUB_URL, PLAYSTORE_URL } from '@/constants/Links';
import { Station } from '@/constants/types';
import { useStations } from '@/hooks/useStations';
import { StationCard } from '@/components/StationCard';
import { MiniPlayer } from '@/components/MiniPlayer';
import { SnowParticles } from '@/components/SnowParticles';
import { AskNoelCast } from '@/components/AskNoelCast';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

type TabType = 'all' | 'favorites';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { filtered, isLoading: stationsLoading, error, searchQuery, setSearchQuery, refresh, availableCountries, selectedCountry, setSelectedCountry } = useStations();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const player = usePlayer();
  const { currentStation, isPlaying, isLoading, togglePlayPause, playNext, playPrevious, playStation } = player ?? {
    currentStation: null, isPlaying: false, isLoading: false,
    togglePlayPause: async () => {}, playNext: async () => {}, playPrevious: async () => {}, playStation: async () => {},
  };
  const { isTablet, isDesktop, width } = useBreakpoint();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchVisible, setSearchVisible] = useState(false);
  const searchWidth = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const [filterVisible, setFilterVisible] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  // Prevent flash of mobile layout by waiting for client-side hydration
  if (!isMounted) {
    return null;
  }


  const toggleSearch = () => {
    if (searchVisible) {
      // Collapse
      setSearchQuery('');
      Animated.timing(searchWidth, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setSearchVisible(false));
    } else {
      setSearchVisible(true);
      Animated.timing(searchWidth, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start(() => searchInputRef.current?.focus());
    }
  };

  const toggleFilter = () => {
    if (filterVisible) {
      // Collapse
      Animated.timing(filterAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => setFilterVisible(false));
    } else {
      setFilterVisible(true);
      Animated.timing(filterAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  };

  const displayList: Station[] =
    activeTab === 'favorites' ? favorites : filtered;

  const cardStyle = numColumns > 1
    ? { marginHorizontal: 6, flex: 1 }
    : undefined;

  const renderItem = ({ item }: { item: Station }) => (
    <StationCard station={item} queue={displayList} style={cardStyle} />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    
    let iconName: any = 'radio';
    let title = 'No stations found';
    let subtitle = 'Please check back later or refresh.';
    
    if (activeTab === 'favorites') {
      iconName = 'heart-half';
      title = 'No Favorites Yet';
      subtitle = 'Tap the ♡ on any station\nto add it to your holiday list!';
    } else if (searchQuery) {
      iconName = 'search';
      title = 'No Matches Found';
      subtitle = `We couldn't find any stations matching\n"${searchQuery}"`;
    } else if (error) {
      iconName = 'alert-circle';
      title = 'Connection Error';
      subtitle = error;
    }

    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name={iconName} size={40} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyText}>{subtitle}</Text>
        
        {error && activeTab === 'all' && (
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Ionicons name="refresh" size={16} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ── Mobile/Tablet Header ────────────────────────────────────────────
  const renderMobileHeader = () => (
    <>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.brand}
            activeOpacity={Platform.OS === 'android' ? 0.7 : 1}
            onPress={() => {
              if (Platform.OS === 'android') {
                router.push('/developer');
              }
            }}
          >
            <Image source={require('@/assets/images/icon.png')} style={styles.brandLogo} resizeMode="contain" />
            <View>
              <Text style={styles.appName}>NoelCast</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="snow" size={12} color={Colors.textSecondary} />
                <Text style={styles.appTagline}>Christmas Radio</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>

            <TouchableOpacity onPress={toggleFilter} style={styles.iconBtn}>
              <Ionicons name={filterVisible ? 'funnel' : 'funnel-outline'} size={20} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleSearch} style={styles.iconBtn}>
              <Ionicons name={searchVisible ? 'close' : 'search'} size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {searchVisible && (
          <Animated.View style={[styles.searchInputWrap, {
            marginTop: searchWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }),
            height: searchWidth.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }),
            opacity: searchWidth,
          }]}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIconLeft} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search for Christmas magic..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
              selectionColor={Colors.text}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'all' && styles.tabActive]} onPress={() => setActiveTab('all')}>
          <Ionicons name="musical-notes" size={16} color={activeTab === 'all' ? Colors.white : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All Stations</Text>
          {activeTab === 'all' && filtered.length > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{filtered.length}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'favorites' && styles.tabActive]} onPress={() => setActiveTab('favorites')}>
          <Ionicons name="heart" size={16} color={activeTab === 'favorites' ? Colors.white : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favorites</Text>
          {favorites.length > 0 && (
            <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{favorites.length}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {availableCountries.length > 0 && activeTab === 'all' && filterVisible && (
        <Animated.View style={{ height: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }), opacity: filterAnim, overflow: 'hidden', marginBottom: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countryFilters}>
            <TouchableOpacity style={[styles.countryPill, selectedCountry === null && styles.countryPillActive]} onPress={() => setSelectedCountry(null)}>
              <Text style={[styles.countryPillText, selectedCountry === null && styles.countryPillTextActive]}>All</Text>
            </TouchableOpacity>
            {availableCountries.map((code) => {
              const flagUrl = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
              const isActive = selectedCountry === code;
              return (
                <TouchableOpacity key={code} style={[styles.countryPill, isActive && styles.countryPillActive]} onPress={() => setSelectedCountry(code)}>
                  <Image source={{ uri: flagUrl }} style={styles.countryPillFlag} />
                  <Text style={[styles.countryPillText, isActive && styles.countryPillTextActive]}>{code.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </>
  );

  // ── Station list ──────────────────────────────────────────────────────────────
  const renderStationList = (bottomPad: number) => (
    stationsLoading && displayList.length === 0 ? (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Christmas stations... 🎄</Text>
      </View>
    ) : (
      <FlatList
        key={`cols-${numColumns}`}
        data={displayList}
        keyExtractor={item => item.stationuuid}
        renderItem={renderItem}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={stationsLoading} onRefresh={refresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
      />
    )
  );

  const getDaysUntilChristmas = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    let christmasDate = new Date(currentYear, 11, 25);
    
    if (today.getTime() > christmasDate.getTime()) {
      christmasDate = new Date(currentYear + 1, 11, 25);
    }
    
    const diffTime = christmasDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysToChristmas = getDaysUntilChristmas();

  // ── Desktop layout (Spotify-style) ───────────────────────────────────────────
  if (isDesktop) {
    const favored = currentStation ? isFavorite(currentStation.stationuuid) : false;
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1a0000', '#0d0d0d', '#000']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <SnowParticles />

        {/* Three-pane layout: sidebar | content  (player bar at bottom) */}
        <View style={styles.desktopLayout}>

          {/* ── Left Sidebar ── */}
          <View style={[styles.sidebar, { paddingTop: insets.top + 8 }]}>
            {/* Brand */}
            <View style={[styles.brand, { marginBottom: 24, paddingHorizontal: 8 }]}>
              <Image source={require('@/assets/images/icon.png')} style={styles.brandLogo} resizeMode="contain" />
              <View>
                <Text style={styles.appName}>NoelCast</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="snow" size={12} color={Colors.textSecondary} />
                  <Text style={styles.appTagline}>Christmas Radio</Text>
                </View>
              </View>
            </View>

            <View style={styles.sidebarDivider} />

            {/* Nav Items */}
            <View style={styles.sidebarNav}>
              <TouchableOpacity
                style={[styles.navItem, activeTab === 'all' && styles.navItemActive]}
                onPress={() => setActiveTab('all')}
              >
                <Ionicons name="musical-notes" size={20} color={activeTab === 'all' ? Colors.white : Colors.textMuted} />
                <Text style={[styles.navItemText, activeTab === 'all' && styles.navItemTextActive]}>All Stations</Text>
                {filtered.length > 0 && (
                  <View style={styles.navBadge}><Text style={styles.navBadgeText}>{filtered.length}</Text></View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => Linking.openURL(GITHUB_URL)}
              >
                <Ionicons name="logo-github" size={20} color={Colors.textMuted} />
                <Text style={styles.navItemText}>GitHub</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => Linking.openURL(PLAYSTORE_URL)}
              >
                <Ionicons name="logo-google-playstore" size={20} color={Colors.textMuted} />
                <Text style={styles.navItemText}>Get Android App</Text>
              </TouchableOpacity>
            </View>



            <View style={styles.sidebarDivider} />

            {/* Country Filter — vertical scrollable list */}
            {availableCountries.length > 0 && activeTab === 'all' && (
              <View style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>Filter by Country</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: currentStation ? 88 + 20 : 20 }}>
                  <TouchableOpacity
                    style={[styles.countryRow, selectedCountry === null && styles.countryRowActive]}
                    onPress={() => setSelectedCountry(null)}
                  >
                    <Ionicons name="earth" size={16} color={selectedCountry === null ? Colors.white : Colors.textMuted} />
                    <Text style={[styles.countryRowText, selectedCountry === null && styles.countryRowTextActive]}>All Countries</Text>
                  </TouchableOpacity>
                  {availableCountries.map(code => {
                    const flagUrl = `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
                    const isActive = selectedCountry === code;
                    
                    let displayName = code.toUpperCase();
                    if (isDesktop) {
                      try {
                        const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
                        const fullName = regionNames.of(code.toUpperCase());
                        if (fullName) {
                          displayName = fullName;
                        }
                      } catch (e) {
                        // fallback to code
                      }
                    }

                    return (
                      <TouchableOpacity
                        key={code}
                        style={[styles.countryRow, isActive && styles.countryRowActive]}
                        onPress={() => setSelectedCountry(code)}
                      >
                        <Image source={{ uri: flagUrl }} style={styles.countryRowFlag} />
                        <Text style={[styles.countryRowText, isActive && styles.countryRowTextActive]} numberOfLines={1}>{displayName}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ── Main Content ── */}
          <View style={styles.desktopContent}>
            {/* Always-visible search bar */}
            <View style={[styles.desktopTopBar, { paddingTop: insets.top + 8 }]}>
              <View style={styles.desktopSearchWrap}>
                <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  ref={searchInputRef}
                  style={styles.desktopSearchInput}
                  placeholder="Search stations..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                  selectionColor={Colors.text}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Station grid */}
            {renderStationList(currentStation ? 88 + 20 : 20)}
          </View>

          {/* ── Right Sidebar (Favorites) ── */}
          <View style={[styles.rightSidebar, { paddingTop: insets.top + 8, paddingBottom: currentStation ? 88 + 20 : 20 }]}>
            
            {/* Christmas Countdown Widget */}
            <View style={styles.countdownWidget}>
              <View style={styles.countdownHeader}>
                <Ionicons name="snow" size={16} color={Colors.white} />
                <Text style={styles.countdownTitle}>Christmas Countdown</Text>
              </View>
              <View style={styles.countdownContent}>
                <Text style={styles.countdownNumber}>{daysToChristmas}</Text>
                <Text style={styles.countdownLabel}>days to go</Text>
              </View>
              <LinearGradient colors={['rgba(255,255,255,0.1)', 'transparent']} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
            </View>

            <View style={styles.sidebarDivider} />

            <Text style={styles.sidebarSectionTitle}>Your Favorites</Text>
            {favorites.length === 0 ? (
              <Text style={{ color: Colors.textMuted, fontSize: 13, paddingHorizontal: 8 }}>No favorites yet.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                {favorites.map(station => {
                  const isCurrent = currentStation?.stationuuid === station.stationuuid;
                  return (
                    <TouchableOpacity
                      key={station.stationuuid}
                      style={[styles.sidebarFavItem, isCurrent && styles.sidebarFavItemActive]}
                      onPress={() => playStation(station, favorites)}
                    >
                      <Image source={require('@/assets/images/station-placeholder.png')} style={styles.sidebarFavLogo} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sidebarFavName, isCurrent && styles.sidebarFavNameActive]} numberOfLines={1}>{station.name?.trim()}</Text>
                        <Text style={styles.sidebarFavMeta} numberOfLines={1}>{station.country ?? 'Unknown'}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isCurrent && isPlaying && (
                          <Ionicons name="stats-chart" size={12} color={Colors.primary} />
                        )}
                        <TouchableOpacity
                          onPress={() => toggleFavorite(station)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="heart" size={18} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>

        {/* ── Bottom Player Bar ── */}
        {currentStation && (
          <View style={[styles.desktopPlayerBar, { paddingBottom: insets.bottom + 8 }]}>
            {/* Left — station info */}
            <View style={styles.playerBarLeft}>
              <Image source={require('@/assets/images/station-placeholder.png')} style={styles.playerBarLogo} resizeMode="contain" />
              <View style={styles.playerBarInfo}>
                <Text style={styles.playerBarName} numberOfLines={1}>{currentStation.name?.trim()}</Text>
                <Text style={styles.playerBarMeta} numberOfLines={1}>
                  {currentStation.country ?? ''}{currentStation.codec ? ` \u2022 ${currentStation.codec}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleFavorite(currentStation)} style={styles.playerBarFav}>
                <Ionicons
                  name={favored ? 'heart' : 'heart-outline'}
                  size={22}
                  color={favored ? Colors.primary : Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Center — transport controls */}
            <View style={styles.playerBarCenter}>
              <TouchableOpacity style={styles.playerBarSkip} onPress={playPrevious}>
                <Ionicons name="play-skip-back" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerBarPlay} onPress={togglePlayPause} disabled={isLoading}>
                <LinearGradient colors={[Colors.primaryLight, Colors.primary]} style={styles.playerBarPlayInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name={isLoading ? 'radio-outline' : isPlaying ? 'pause' : 'play'} size={30} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playerBarSkip} onPress={playNext}>
                <Ionicons name="play-skip-forward" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Right — status + equalizer */}
            <View style={styles.playerBarRight}>
              <View style={[styles.liveChip, !isPlaying && styles.liveChipPaused]}>
                {isLoading
                  ? <ActivityIndicator size="small" color={Colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
                  : isPlaying ? <View style={styles.liveDot} />
                  : <Ionicons name="pause" size={12} color={Colors.textMuted} />}
                <Text style={[styles.liveText, !isPlaying && styles.liveTextPaused]}>
                  {isLoading ? 'BUFFERING' : isPlaying ? 'LIVE' : 'PAUSED'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── AI Station Recommender FAB ── */}
        <AskNoelCast />
      </View>
    );
  }

  // ── Tablet / Mobile layout ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#3D0000', '#1A0000', '#0A0A0A']} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <SnowParticles />
      {renderMobileHeader()}
      {renderStationList(currentStation ? 90 : insets.bottom + 20)}
      <MiniPlayer />
      <AskNoelCast />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  appName: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appTagline: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchInputWrap: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    padding: 0,
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  } as any,
  searchClearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 6,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  list: {
    paddingTop: 4,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 15,
  },
  countryFilters: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  countryPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  countryPillText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  countryPillTextActive: {
    color: Colors.white,
  },
  countryPillFlag: {
    width: 16,
    height: 12,
    borderRadius: 2,
    backgroundColor: Colors.surfaceLight,
  },
  columnWrapper: {
    paddingHorizontal: 10,
    gap: 0,
  },
  // ── Desktop (Spotify-style) ──────────────────────────────────────────────────
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 260,
    backgroundColor: '#000', // Solid black sidebar
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#222',
  },
  rightSidebar: {
    width: 260,
    backgroundColor: '#000',
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: '#222',
  },
  countdownWidget: {
    backgroundColor: 'rgba(183, 28, 28, 0.25)', // Deep red transparent
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(183, 28, 28, 0.4)',
    overflow: 'hidden',
    position: 'relative',
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  countdownTitle: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  countdownNumber: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  countdownLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  sidebarAppName: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sidebarTagline: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: 16,
    marginHorizontal: 8,
  },
  sidebarNav: {
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: '#222',
  },
  navItemText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  navItemTextActive: {
    color: Colors.white,
  },
  navBadge: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 'auto',
  },
  navBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
  sidebarSection: {
    flex: 1,
  },
  sidebarSectionTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 12,
  },
  countryRowActive: {
    backgroundColor: 'rgba(183, 28, 28, 0.15)',
  },
  countryRowFlag: {
    width: 20,
    height: 15,
    borderRadius: 2,
  },
  countryRowText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  countryRowTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sidebarFavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 12,
  },
  sidebarFavItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sidebarFavLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  sidebarFavName: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  sidebarFavNameActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sidebarFavMeta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  desktopContent: {
    flex: 1,
    backgroundColor: 'transparent', // Uses gradient from parent
  },
  desktopTopBar: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  desktopSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    width: 300,
  },
  desktopSearchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  } as any,
  desktopPlayerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
  playerBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerBarLogo: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  playerBarInfo: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  playerBarName: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerBarMeta: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  playerBarFav: {
    padding: 8,
  },
  playerBarCenter: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  playerBarPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  playerBarPlayInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerBarSkip: {
    padding: 8,
  },
  playerBarRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
});
