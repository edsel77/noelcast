import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import packageJson from '@/package.json';

export default function DeveloperScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Developer Info</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandingContainer}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.logoContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="gift" size={42} color={Colors.accentLight} />
          </LinearGradient>
          
          <View style={styles.decorationsContainer}>
            <Ionicons name="snow" size={16} color={Colors.textSecondary} style={[styles.decoration, { top: -20, left: -40 }]} />
            <Ionicons name="star" size={20} color={Colors.accent} style={[styles.decoration, { top: 10, right: -50 }]} />
            <Ionicons name="snow" size={24} color={Colors.white} style={[styles.decoration, { bottom: -10, left: -60 }]} />
          </View>

          <Text style={styles.brandingTitle}>Drift Apps</Text>
          <Text style={styles.brandingSubtitle}>Crafting festive digital experiences</Text>
        </View>

        <View style={styles.cardGroup}>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.primaryLight + '20' }]}>
              <Ionicons name="globe-outline" size={22} color={Colors.primaryLight} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Website</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://driftapps.xyz')}>
                <Text style={styles.link}>https://driftapps.xyz</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.success + '20' }]}>
              <Ionicons name="laptop-outline" size={22} color={Colors.success} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Web Version</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://noelcast.driftapps.xyz')}>
                <Text style={[styles.link, { color: Colors.success }]}>noelcast.driftapps.xyz</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: Colors.accent + '20' }]}>
              <Ionicons name="mail-outline" size={22} color={Colors.accent} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Contact</Text>
              <TouchableOpacity onPress={() => Linking.openURL('mailto:founder@driftapps.xyz')}>
                <Text style={[styles.link, { color: Colors.accent }]}>founder@driftapps.xyz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <View style={styles.footerContainer}>
          <Ionicons name="leaf" size={20} color={Colors.success} />
          <Text style={styles.footerText}>App Version {packageJson.version}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
    position: 'relative',
  },
  logoContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  decorationsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  decoration: {
    position: 'absolute',
    opacity: 0.8,
  },
  brandingTitle: {
    color: Colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  brandingSubtitle: {
    color: Colors.accentLight,
    fontSize: 15,
    fontWeight: '500',
  },
  cardGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  link: {
    color: Colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 80,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 48,
    gap: 8,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
});
