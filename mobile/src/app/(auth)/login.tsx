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
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  UIManager,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Clapperboard, Eye, EyeOff } from 'lucide-react-native';
import { RADIUS, SPACING } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { FilmRollingTransition } from '../../components/auth/FilmRollingTransition';
import { FilmReelSpinner } from '../../components/common/FilmLoading';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// High-resolution iconic movie poster for TOP section (clearly visible when keyboard is hidden)
const TOP_VISIBLE_POSTER = 'https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'; // Interstellar

// Iconic movie & series posters displayed transparently UNDER the login content
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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilmRoll, setShowFilmRoll] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
    const errs: { email?: string; password?: string } = {};
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

    if (!email.trim()) {
      errs.email = 'Email is required';
    } else if (!emailRegex.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await login(email, password);
      // Trigger cinematic film rolling animation before entering interface
      setShowFilmRoll(true);
    } catch (err: any) {
      setIsLoading(false);
      showError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleFilmRollComplete = () => {
    setShowFilmRoll(false);
    setIsLoading(false);
    showSuccess('Welcome back!');
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
          {/* Subtle top vignette for status bar icons */}
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

        {/* 2. TRANSPARENT POSTER GRID (Positioned UNDER the login content) */}
        <View style={styles.bottomBackdropContainer} pointerEvents="none">
          <View style={styles.backdropGrid}>
            {BACKDROP_POSTERS.map((uri, index) => (
              <View key={index} style={styles.backdropPosterCard}>
                <Image
                  source={{ uri }}
                  style={styles.backdropImage}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>

          {/* Dark overlay so posters are transparent under the login content */}
          <LinearGradient
            colors={[
              'transparent',
              colors.background + 'B3', // ~70% dark
              colors.background + 'F2', // ~95% dark
              colors.background,
            ]}
            locations={[0, 0.25, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* 3. LOGIN CONTENT (Smoothly positioned at TOP when typing, DOWN when idle) */}
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
                  ? insets.top + SPACING.md
                  : Math.max(SCREEN_HEIGHT * 0.24, insets.top + 80),
                paddingBottom: isKeyboardVisible
                  ? 320
                  : insets.bottom + SPACING.lg,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand Logo Avatar (Compact when keyboard is open) */}
            <View style={[styles.logoContainer, isKeyboardVisible && { marginBottom: 6 }]}>
              <View
                style={[
                  styles.logoCircle,
                  isKeyboardVisible && styles.logoCircleCompact,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <Clapperboard
                  size={isKeyboardVisible ? 22 : 30}
                  color={colors.primaryContrast}
                  strokeWidth={2.2}
                />
              </View>
            </View>

            {/* Title & Subtitle */}
            <Text
              style={[
                styles.title,
                isKeyboardVisible && { fontSize: 22, marginBottom: 2 },
                { color: colors.textPrimary },
              ]}
            >
              Welcome Back
            </Text>

            {!isKeyboardVisible && (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to continue your movie and{'\n'}series journey
              </Text>
            )}

            {/* Form */}
            <View style={[styles.form, isKeyboardVisible && { marginTop: 8 }]}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: colors.card + 'E6',
                      borderColor: errors.email ? colors.danger : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{errors.email}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Password</Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: colors.card + 'E6',
                      borderColor: errors.password ? colors.danger : colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {errors.password}
                  </Text>
                ) : null}
              </View>

              {/* Sign In Pill Button */}
              <TouchableOpacity
                style={[
                  styles.signInButton,
                  { backgroundColor: colors.primary },
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.loadingButtonInner}>
                    <FilmReelSpinner
                      size={20}
                      color={colors.primaryContrast}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={[styles.signInButtonText, { color: colors.primaryContrast }]}>
                      Authenticating...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.signInButtonText, { color: colors.primaryContrast }]}>
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={[styles.footerRow, isKeyboardVisible && { marginTop: SPACING.md }]}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={[styles.signUpLink, { color: colors.primaryLight }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* 4. Film Rolling Animation after Successful Login */}
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
    height: SCREEN_HEIGHT * 0.44,
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
  // Transparent Poster Grid under Login Content
  bottomBackdropContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.32,
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
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  logoCircleCompact: {
    width: 44,
    height: 44,
    borderRadius: 22,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  signInButton: {
    width: '100%',
    height: 50,
    borderRadius: RADIUS.full, // Pill button
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
