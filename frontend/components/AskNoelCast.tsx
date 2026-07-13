import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Station } from '@/constants/types';
import { useAskNoelCast } from '@/hooks/useAskNoelCast';
import { type AskModel } from '@/hooks/useAskNoelCast';
import { usePlayer } from '@/contexts/PlayerContext';
import { EqualizerBars } from './EqualizerBars';

const MODEL_STORAGE_KEY = 'noelcast_selected_model';
const QUERY_STORAGE_KEY = 'noelcast_ask_query';

const SUGGESTIONS = [
  'Cozy jazz Christmas vibes ☕',
  'Upbeat holiday pop music 🎉',
  'Classic Christmas carols 🎶',
  'Relaxing acoustic holiday songs 🌿',
  'Traditional European Christmas 🏰',
];

export function AskNoelCast() {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<AskModel>('groq');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { ask, loading, error, result, reset } = useAskNoelCast();
  const player = usePlayer();
  const { playStation } = player ?? { playStation: async () => {} };
  const hasActivePlayer = !!player?.currentStation;
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Persist model selection across sessions
  useEffect(() => {
    AsyncStorage.getItem(MODEL_STORAGE_KEY).then((saved) => {
      if (saved === 'groq' || saved === 'gemini') setSelectedModel(saved);
    });
    AsyncStorage.getItem(QUERY_STORAGE_KEY).then((saved) => {
      if (saved) setQuery(saved);
    });
  }, []);

  const handleModelSelect = (model: AskModel) => {
    setSelectedModel(model);
    AsyncStorage.setItem(MODEL_STORAGE_KEY, model);
  };

  // Pulse animation for the FAB
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const openModal = () => {
    setVisible(true);
    startPulse();
  };

  const closeModal = () => {
    stopPulse();
    setVisible(false);
  };

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    AsyncStorage.setItem(QUERY_STORAGE_KEY, query);
    await ask(query, selectedModel);
  };

  const handleSuggestion = (text: string) => {
    setQuery(text.replace(/[^\w\s,']/g, '').trim());
    inputRef.current?.focus();
  };

  const handlePlayStation = (station: Station) => {
    const stations = result?.stations ?? [];
    playStation(station, stations);
  };

  return (
    <>
      {/* ── Floating Action Button ── */}
      <Animated.View style={[styles.fab, { transform: [{ scale: pulseAnim }], bottom: hasActivePlayer ? 160 : 90 }]}>
        <TouchableOpacity
          id="ask-noelcast-fab"
          onPress={openModal}
          style={styles.fabInner}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#E53935', '#B71C1C']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Image 
              source={require('@/assets/images/android-splash.png')} 
              style={{ width: 95, height: 95, resizeMode: 'cover' }} 
            />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.fabBadge}>
          <Text style={styles.fabBadgeText}>Ask Noel</Text>
        </View>
      </Animated.View>

      {/* ── Modal ── */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' && !isDesktop ? 'pageSheet' : 'overFullScreen'}
        transparent={isDesktop}
        onRequestClose={closeModal}
      >
        <View style={[styles.modalBackground, isDesktop && styles.modalBackgroundDesktop]}>
          {isDesktop && (
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={closeModal} 
            />
          )}
          <KeyboardAvoidingView
            style={[styles.modalRoot, isDesktop && styles.modalRootDesktop]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <LinearGradient
              colors={['#2b0404', '#0f0202', '#000000']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: -4 }}>
                <Image 
                  source={require('@/assets/images/android-splash.png')} 
                  style={{ width: 65, height: 65, resizeMode: 'cover' }} 
                />
                <Text style={styles.modalTitle}>Ask Noel</Text>
              </View>
              <Text style={styles.modalSubtitle}>Describe your vibe — AI picks your stations</Text>
            </View>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn} id="ask-noelcast-close">
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* RAG badge + model selector */}
          <View style={styles.ragBadgeRow}>
            <View style={styles.ragBadge}>
              <Ionicons name="sparkles" size={11} color={Colors.accent} />
              <Text style={styles.ragBadgeText}>
                RAG · FAISS · {selectedModel === 'gemini' ? 'Gemini 2.0' : 'Llama 3.1'}
              </Text>
            </View>
            <View style={[styles.ragBadge, { backgroundColor: 'rgba(255,153,0,0.12)', borderColor: 'rgba(255,153,0,0.3)' }]}>
              <Ionicons name="cloud" size={11} color="#FF9900" />
              <Text style={[styles.ragBadgeText, { color: '#FF9900' }]}>AWS S3</Text>
            </View>
          </View>

          {/* Model selector */}
          <View style={[styles.modelSelectorRow, { zIndex: 10 }]}>
            <Text style={styles.modelSelectorLabel}>MODEL</Text>
            <View style={{ position: 'relative' }}>
              <TouchableOpacity
                id="model-select-dropdown"
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                activeOpacity={0.75}
                style={styles.dropdownToggle}
              >
                <View style={[styles.modelPillDot, { backgroundColor: selectedModel === 'groq' ? '#F9A825' : '#4285F4' }]} />
                <Text style={styles.dropdownToggleText}>
                  {selectedModel === 'groq' ? 'Groq · Llama 3.1' : 'Gemini Flash'}
                </Text>
                <Ionicons name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleModelSelect('groq');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <View style={[styles.modelPillDot, { backgroundColor: '#F9A825' }]} />
                    <Text style={[styles.dropdownItemText, selectedModel === 'groq' && { color: '#F9A825' }]}>Groq · Llama 3.1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleModelSelect('gemini');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <View style={[styles.modelPillDot, { backgroundColor: '#4285F4' }]} />
                    <Text style={[styles.dropdownItemText, selectedModel === 'gemini' && { color: '#4285F4' }]}>Gemini Flash</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Input */}
            <View style={styles.inputWrap}>
              <Ionicons name="mic" size={18} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                ref={inputRef}
                id="ask-noelcast-input"
                style={styles.input}
                placeholder="e.g. cozy jazz Christmas café..."
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleAsk}
                returnKeyType="search"
                multiline={false}
                autoCorrect
                selectionColor={Colors.primaryLight}
                maxLength={300}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Ask button */}
            <TouchableOpacity
              id="ask-noelcast-submit"
              onPress={handleAsk}
              disabled={!query.trim() || loading}
              style={[styles.askBtn, (!query.trim() || loading) && styles.askBtnDisabled]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={query.trim() && !loading ? ['#E53935', '#B71C1C'] : ['#2a1010', '#1a0a0a']}
                style={styles.askBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.accent} />
                    <Text style={styles.askBtnText}>
                      {selectedModel === 'gemini' ? 'Asking Gemini...' : 'Asking Llama...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={Colors.white} />
                    <Text style={styles.askBtnText}>Find My Stations</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Suggestions */}
            {!result && !loading && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsLabel}>Try something like...</Text>
                <View style={styles.suggestionPills}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestionPill}
                      onPress={() => handleSuggestion(s)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF5350" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Result */}
            {result && (
              <View style={styles.resultSection}>
                {/* AI answer */}
                <View style={styles.answerBubble}>
                  <View style={styles.answerHeader}>
                    <Text style={styles.answerIcon}>🎅</Text>
                    <Text style={styles.answerLabel}>NoelCast AI</Text>
                  </View>
                  <Text style={styles.answerText}>{result.answer}</Text>
                </View>

                {/* Station cards */}
                {result.stations.length > 0 && (
                  <>
                    <Text style={styles.stationsLabel}>
                      🎄 {result.stations.length} Stations Found
                    </Text>
                    {result.stations.map((station, i) => (
                      <TouchableOpacity
                        key={station.stationuuid ?? i}
                        id={`ask-result-station-${i}`}
                        style={styles.stationCard}
                        onPress={() => handlePlayStation(station)}
                        activeOpacity={0.75}
                      >
                        <LinearGradient
                          colors={['rgba(183,28,28,0.15)', 'rgba(20,20,20,0.8)']}
                          style={styles.stationCardGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.stationLogoContainer}>
                            <Image
                              source={require('@/assets/images/station-placeholder.png')}
                              style={styles.stationLogo}
                            />
                            {player?.currentStation?.stationuuid === station.stationuuid && player.isPlaying && (
                              <View style={styles.playingOverlay}>
                                <EqualizerBars />
                              </View>
                            )}
                          </View>
                          <View style={styles.stationInfo}>
                            <Text style={styles.stationName} numberOfLines={1}>
                              {station.name?.trim()}
                            </Text>
                            <Text style={styles.stationMeta} numberOfLines={1}>
                              {[station.country, station.codec, station.bitrate ? `${station.bitrate}kbps` : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                            {station.tags ? (
                              <Text style={styles.stationTags} numberOfLines={1}>
                                {station.tags.split(',').slice(0, 3).map(t => t.trim()).join(' · ')}
                              </Text>
                            ) : null}
                          </View>
                          <View style={styles.playChip}>
                            <Ionicons name="play" size={14} color={Colors.white} />
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {/* Try again */}
                <TouchableOpacity
                  onPress={() => { 
                    reset(); 
                    setQuery(''); 
                    AsyncStorage.removeItem(QUERY_STORAGE_KEY);
                  }}
                  style={styles.tryAgainBtn}
                >
                  <Ionicons name="refresh" size={15} color={Colors.textMuted} />
                  <Text style={styles.tryAgainText}>Ask something else</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    zIndex: 200,
  },
  fabInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFEB3B',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // ── Modal ─────────────────────────────────────────────────────────────────────
  modalBackground: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalBackgroundDesktop: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 24,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalRootDesktop: {
    flex: undefined,
    width: 400, // Chatbot width
    height: '100%',
    maxHeight: 700,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 12,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  ragBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  ragBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(249,168,37,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249,168,37,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ragBadgeText: {
    color: '#F9A825',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // ── Model Selector ────────────────────────────────────────────────────────────
  modelSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modelSelectorLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dropdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dropdownToggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 0,
    backgroundColor: '#1a0a0a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 8,
    width: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dropdownItemText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  modelPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // ── Input ─────────────────────────────────────────────────────────────────────
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    padding: 0,
    fontWeight: '500',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  } as any,
  clearBtn: {
    padding: 6,
    marginLeft: 6,
  },
  // ── Ask Button ────────────────────────────────────────────────────────────────
  askBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  askBtnDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  askBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  askBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // ── Suggestions ───────────────────────────────────────────────────────────────
  suggestions: {
    marginBottom: 24,
  },
  suggestionsLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  suggestionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  suggestionText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
  },
  // ── Error ─────────────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239,83,80,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.4)',
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#EF5350',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  // ── Result ────────────────────────────────────────────────────────────────────
  resultSection: {
    gap: 0,
  },
  answerBubble: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.2)',
    padding: 20,
    marginBottom: 24,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  answerIcon: {
    fontSize: 20,
  },
  answerLabel: {
    color: '#EF9A9A',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  answerText: {
    color: '#FFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  stationsLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  stationCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    backgroundColor: 'rgba(20, 0, 0, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  stationCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  stationLogoContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stationLogo: {
    width: '100%',
    height: '100%',
  },
  playingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  stationMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  stationTags: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  playChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  tryAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  tryAgainText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
});
