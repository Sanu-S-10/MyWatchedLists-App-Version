import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, ChevronRight } from 'lucide-react-native';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background Cinematic Ambience */}
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=1200&auto=format&fit=crop',
          }}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        {/* Cinematic Gradient Overlays */}
        <LinearGradient
          colors={['rgba(11, 14, 20, 0.4)', 'rgba(11, 14, 20, 0.85)', '#0B0E14']}
          locations={[0, 0.6, 0.95]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Top Header / Branding */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + SPACING.xxl }]}>
        <View style={styles.logoCircle}>
          <Clapperboard size={36} color="#FFFFFF" strokeWidth={2.4} />
        </View>
        <Text style={styles.appName}>MyWatchedLists</Text>
        <Text style={styles.tagline}>Track. Discover. Watch. Repeat.</Text>
      </View>

      {/* Bottom CTA Section */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + SPACING.xl }]}>
        <TouchableOpacity
          style={styles.getPillButton}
          onPress={() => router.push('/(auth)/login' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.getPillButtonText}>Get Started</Text>
          <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Explore as Guest</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
    justifyContent: 'space-between',
  },
  imageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
    marginBottom: SPACING.md,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  bottomContainer: {
    paddingHorizontal: SPACING.xl,
    gap: 14,
  },
  getPillButton: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  getPillButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
