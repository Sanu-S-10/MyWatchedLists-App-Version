import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, Lock, Mail, User } from 'lucide-react-native';
import { RADIUS, SPACING } from '../../constants/theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { FilmRollingTransition } from '../../components/auth/FilmRollingTransition';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// High-resolution iconic movie poster for TOP section (clearly visible when keyboard is hidden)
const TOP_VISIBLE_POSTER = 'https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'; // Dune: Part Two

// Transparent posters displayed UNDER the register content
const BACKDROP_POSTERS = [
  'https://image.tmdb.org/t/p/w342/qJ2tW6WMUDux911r6m7haRef0WH.jpg', // The Dark Knight
  'https://image.tmdb.org/t/p/w342/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg', // Inception
  'https://image.tmdb.org/t/p/w342/ggFHVNu6YYI5L9pCfOacjizRGt.jpg', // Breaking Bad
  'https://image.tmdb.org/t/p/w342/49WJfeN0moxb9IPfGn8AIqMGskD.jpg', // Stranger Things
  'https://image.tmdb.org/t/p/w342/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', // Interstellar
  'https://image.tmdb.org/t/p/w342/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', // Dune 2
  'https://image.tmdb.org/t/p/w342/uKvVjHNqB5VmOrdxqAt2V7JMrHG.jpg', // The Last of Us
  'https://image.tmdb.org/t/p/w342/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', // Oppenheimer
  'https://image.tmdb.org/t/p/w342/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', // Across the Spider-Verse
  'https://image.tmdb.org/t/p/w342/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', // Fight Club
  'https://image.tmdb.org/t/p/w342/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', // Pulp Fiction
  'https://image.tmdb.org/t/p/w342/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', // The Matrix
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilmRoll, setShowFilmRoll] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Detect keyboard appearance to smoothly shift content to TOP
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const validate = () => {
    const errs: {
      username?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const usernameRegex = /^[a-zA-Z0-9_\-]{3,32}$/;

    if (!username.trim()) {
      errs.username = 'Username is required';
    } else if (!usernameRegex.test(username.trim())) {
      errs.username = 'Username must be 3-32 characters';
    }

    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      setShowFilmRoll(true);
    } catch (err: any) {
      setIsLoading(false);
      showError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleFilmRollComplete = () => {
    setShowFilmRoll(false);
    setIsLoading(false);
    showSuccess('Account created successfully!');
    router.replace('/(tabs)');
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 1. TOP VISIBLE POSTER (Fade down when keyboard is open to keep top text pristine) */}
        <View
          style={[
            styles.topPosterContainer,
            { opacity: isKeyboardVisible ? 0.12 : 1 },
          ]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: TOP_VISIBLE_POSTER }}
            style={styles.topPosterImage}
            resizeMode="cover"
          />
          {/* Subtle top vignette for status bar */}
          <LinearGradient
            colors={['rgba(0, 0, 0, 0.45)', 'transparent']}
            style={styles.topVignette}
          />
          {/* Smooth bottom fade into the dark background */}
          <LinearGradient
            colors={[
              'transparent',
              'rgba(6, 6, 6, 0.15)',
              'rgba(6, 6, 6, 0.65)',
              colors.background,
            ]}
            locations={[0, 0.45, 0.78, 1]}
            style={styles.bottomPosterFade}
          />
        </View>

        {/* 2. TRANSPARENT POSTER GRID (Positioned UNDER the register content) */}
        <View style={styles.bottomBackdropContainer} pointerEvents="none">
          <View style={styles.backdropGrid}>
            {BACKDROP_POSTERS.map((uri, index) => (
              <View key={index} style={styles.backdropPosterCard}>
                <Image source={{ uri }} style={styles.backdropImage} resizeMode="cover" />
              </View>
            ))}
          </View>

          {/* Dark overlay so posters are transparent under the register content */}
          <LinearGradient
            colors={[
              'transparent',
              colors.background + 'B3', // ~70% dark
              colors.background + 'F2', // ~95% dark
              colors.background,
            ]}
            locations={[0, 0.22, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* 3. REGISTER CONTENT (Smoothly positioned at TOP when typing, DOWN when idle) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                justifyContent: isKeyboardVisible ? 'flex-start' : 'flex-end',
                paddingTop: isKeyboardVisible
                  ? insets.top + SPACING.xs
                  : Math.max(SCREEN_HEIGHT * 0.18, insets.top + 50),
                paddingBottom: isKeyboardVisible
                  ? 340
                  : insets.bottom + SPACING.lg,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand Header */}
            <View style={[styles.brandContainer, isKeyboardVisible && { marginBottom: 6 }]}>
              <View
                style={[
                  styles.iconCircle,
                  isKeyboardVisible && styles.iconCircleCompact,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <Clapperboard
                  size={isKeyboardVisible ? 20 : 26}
                  color={colors.primaryContrast}
                  strokeWidth={2.2}
                />
              </View>
              <Text
                style={[
                  styles.brandTitle,
                  isKeyboardVisible && { fontSize: 20, marginBottom: 0 },
                  { color: colors.textPrimary },
                ]}
              >
                Create Account
              </Text>
              {!isKeyboardVisible && (
                <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                  Start tracking your movies and series today
                </Text>
              )}
            </View>

            {/* Form Card */}
            <View
              style={[
                styles.card,
                isKeyboardVisible && styles.cardCompact,
                {
                  backgroundColor: colors.card + 'E6',
                  borderColor: colors.border,
                },
              ]}
            >
              <Input
                label="Username"
                placeholder="e.g. Cinephile99"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                }}
                autoCapitalize="none"
                leftIcon={<User size={18} color={colors.textMuted} />}
                error={errors.username}
              />

              <Input
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={18} color={colors.textMuted} />}
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="Minimum 8 characters"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                isPassword
                leftIcon={<Lock size={18} color={colors.textMuted} />}
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword)
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                isPassword
                leftIcon={<Lock size={18} color={colors.textMuted} />}
                error={errors.confirmPassword}
              />

              <Button
                title="Create Account"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                onPress={handleRegister}
                fullWidth
                style={styles.submitBtn}
              />

              <View style={[styles.switchAuthRow, isKeyboardVisible && { marginTop: SPACING.sm }]}>
                <Text style={[styles.switchAuthText, { color: colors.textSecondary }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={[styles.switchAuthLink, { color: colors.primaryLight }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 4. Film Rolling Transition after Registration */}
        <FilmRollingTransition
          visible={showFilmRoll}
          onComplete={handleFilmRollComplete}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const POSTER_WIDTH = (SCREEN_WIDTH - 24) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060606',
  },
  // Top Visible Poster (Not transparent when idle)
  topPosterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.40,
    overflow: 'hidden',
  },
  topPosterImage: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomPosterFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.22,
  },
  // Transparent Poster Grid under Register Content
  bottomBackdropContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.26,
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  backdropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    opacity: 0.22,
  },
  backdropPosterCard: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#141414',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  // Dynamic Scroll container
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  iconCircleCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 2,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  cardCompact: {
    padding: SPACING.md,
  },
  submitBtn: {
    marginTop: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  switchAuthText: {
    fontSize: 14,
  },
  switchAuthLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
