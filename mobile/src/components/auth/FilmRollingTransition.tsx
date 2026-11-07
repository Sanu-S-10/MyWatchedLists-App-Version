import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Clapperboard, Film, Sparkles } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FilmRollingTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

export const FilmRollingTransition: React.FC<FilmRollingTransitionProps> = ({
  visible,
  onComplete,
}) => {
  const rollAnim = useRef(new Animated.Value(0)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const fadeOutAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      rollAnim.setValue(0);
      flickerAnim.setValue(1);
      flashAnim.setValue(0);
      fadeOutAnim.setValue(1);
      return;
    }

    // 1. Film projector flicker
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, {
          toValue: 0.85,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 0.92,
          duration: 60,
          useNativeDriver: true,
        }),
      ])
    );
    flicker.start();

    // 2. Vertical film strip rolling upwards (paced at ~3.8s so all frames are clearly visible)
    const rollSequence = Animated.sequence([
      Animated.timing(rollAnim, {
        toValue: 1,
        duration: 3800,
        easing: Easing.bezier(0.33, 0, 0.25, 1),
        useNativeDriver: true,
      }),
      // Projector beam flash before entering
      Animated.parallel([
        Animated.timing(flashAnim, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeOutAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]);

    rollSequence.start(() => {
      flicker.stop();
      onComplete();
    });

    return () => {
      flicker.stop();
      rollSequence.stop();
    };
  }, [visible]);

  if (!visible) return null;

  // Total height of the film reel content to roll across
  const FRAME_HEIGHT = SCREEN_HEIGHT * 0.42;
  const TOTAL_FRAMES = 6;
  const TOTAL_ROLL_HEIGHT = FRAME_HEIGHT * TOTAL_FRAMES;

  const translateY = rollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -TOTAL_ROLL_HEIGHT + SCREEN_HEIGHT * 0.6],
  });

  const SPROCKET_COUNT = Math.ceil(TOTAL_ROLL_HEIGHT / 24);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeOutAnim,
          },
        ]}
      >
        {/* Film Projector Ambient Glow */}
        <Animated.View
          style={[
            styles.projectorBeam,
            {
              opacity: flickerAnim,
            },
          ]}
        />

        {/* Rolling Film Strip */}
        <Animated.View
          style={[
            styles.filmStrip,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Left Sprocket Column */}
          <View style={styles.sprocketColumn}>
            {Array.from({ length: SPROCKET_COUNT }).map((_, i) => (
              <View key={`left-sprocket-${i}`} style={styles.sprocketHole} />
            ))}
          </View>

          {/* Main Frames Content */}
          <View style={styles.framesContainer}>
            {/* FRAME 1: LEADER 3 */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.leaderCircle}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  <Circle cx="60" cy="60" r="54" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity={0.6} />
                  <Line x1="60" y1="0" x2="60" y2="120" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                  <Line x1="0" y1="60" x2="120" y2="60" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                </Svg>
                <Text style={styles.leaderNumber}>3</Text>
              </View>
              <Text style={styles.frameLabel}>REEL 01 • SCENE A</Text>
            </View>

            {/* FRAME 2: LEADER 2 */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.leaderCircle}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  <Circle cx="60" cy="60" r="54" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity={0.6} />
                  <Line x1="60" y1="0" x2="60" y2="120" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                  <Line x1="0" y1="60" x2="120" y2="60" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                </Svg>
                <Text style={styles.leaderNumber}>2</Text>
              </View>
              <Text style={styles.frameLabel}>MYWATCHEDLISTS 35MM</Text>
            </View>

            {/* FRAME 3: LEADER 1 */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.leaderCircle}>
                <Svg width={120} height={120} viewBox="0 0 120 120">
                  <Circle cx="60" cy="60" r="54" stroke="#FFFFFF" strokeWidth="2" fill="none" opacity={0.6} />
                  <Line x1="60" y1="0" x2="60" y2="120" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                  <Line x1="0" y1="60" x2="120" y2="60" stroke="#FFFFFF" strokeWidth="1.5" opacity={0.4} />
                </Svg>
                <Text style={styles.leaderNumber}>1</Text>
              </View>
              <Text style={styles.frameLabel}>SOUNDTRACK SYNCHRONIZED</Text>
            </View>

            {/* FRAME 4: ACTION / CLAPPERBOARD */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.iconCircle}>
                <Clapperboard size={54} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>ROLL CAMERA</Text>
              <Text style={styles.frameLabel}>TAKE 1 • CINEMA MODE</Text>
            </View>

            {/* FRAME 5: ROLLING FILM STRIP */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.iconCircle}>
                <Film size={54} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>WELCOME BACK</Text>
              <Text style={styles.frameLabel}>LOADING YOUR WATCHLIST...</Text>
            </View>

            {/* FRAME 6: FEATURE PRESENTATION */}
            <View style={[styles.filmFrame, { height: FRAME_HEIGHT }]}>
              <View style={styles.iconCircle}>
                <Sparkles size={54} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={styles.actionText}>FEATURE PRESENTATION</Text>
              <Text style={styles.frameLabel}>ENJOY THE SHOW</Text>
            </View>
          </View>

          {/* Right Sprocket Column */}
          <View style={styles.sprocketColumn}>
            {Array.from({ length: SPROCKET_COUNT }).map((_, i) => (
              <View key={`right-sprocket-${i}`} style={styles.sprocketHole} />
            ))}
          </View>
        </Animated.View>

        {/* Vintage Vignette and Frame Lines */}
        <View pointerEvents="none" style={styles.vignetteOverlay} />

        {/* Final Flash Beam */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashOverlay,
            {
              opacity: flashAnim,
            },
          ]}
        />

        {/* Skip button in corner */}
        <TouchableOpacity style={styles.skipButton} onPress={onComplete} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectorBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  filmStrip: {
    width: Math.min(SCREEN_WIDTH * 0.92, 420),
    flexDirection: 'row',
    backgroundColor: '#050505',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  sprocketColumn: {
    width: 32,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    paddingVertical: 4,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#1E1E1E',
  },
  sprocketHole: {
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    marginVertical: 7,
  },
  framesContainer: {
    flex: 1,
    backgroundColor: '#080808',
  },
  filmFrame: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#1A1A1A',
    padding: 20,
    backgroundColor: '#0A0A0A',
  },
  leaderCircle: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  leaderNumber: {
    position: 'absolute',
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#161616',
    borderWidth: 2,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  frameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#777777',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  vignetteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 16,
    borderColor: '#000000',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
