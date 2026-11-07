import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

interface FilmReelSpinnerProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

/**
 * An animated spinning 35mm cinema film reel
 */
export const FilmReelSpinner: React.FC<FilmReelSpinnerProps> = ({
  size = 36,
  color,
  style,
}) => {
  const { colors } = useTheme();
  const primaryColor = color || colors.primary;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const center = size / 2;
  const radius = size * 0.44;
  const innerRadius = size * 0.28;
  const hubRadius = size * 0.12;
  const holeRadius = size * 0.07;

  // 5 circular cutout holes around the reel
  const holes = [0, 72, 144, 216, 288].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    const dist = (radius + hubRadius) / 2;
    return {
      cx: center + dist * Math.cos(rad),
      cy: center + dist * Math.sin(rad),
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          transform: [{ rotate: spin }],
        },
        style,
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer Ring / Rim */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={primaryColor}
          strokeWidth={size * 0.07}
          fill="none"
        />

        {/* Film Flange Cutout Holes */}
        {holes.map((h, i) => (
          <Circle
            key={i}
            cx={h.cx}
            cy={h.cy}
            r={holeRadius}
            fill={primaryColor}
            opacity={0.85}
          />
        ))}

        {/* Inner Hub Track */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke={primaryColor}
          strokeWidth={size * 0.04}
          fill="none"
          opacity={0.5}
        />

        {/* Center Axle Hub */}
        <Circle
          cx={center}
          cy={center}
          r={hubRadius}
          fill={primaryColor}
        />
        <Circle
          cx={center}
          cy={center}
          r={hubRadius * 0.45}
          fill="#060606"
        />

        {/* Film Strip Winding Out Notch */}
        <Path
          d={`M ${center + radius * 0.9} ${center - radius * 0.4} Q ${center + radius * 1.15} ${center - radius * 0.8} ${center + radius * 1.3} ${center - radius * 0.6}`}
          stroke={primaryColor}
          strokeWidth={size * 0.05}
          fill="none"
          opacity={0.7}
        />
      </Svg>
    </Animated.View>
  );
};

interface FilmStripTapeProps {
  width?: number;
  height?: number;
  color?: string;
}

/**
 * Animated 35mm film strip with scrolling sprocket perforations
 */
export const FilmStripTape: React.FC<FilmStripTapeProps> = ({
  width = 120,
  height = 36,
  color,
}) => {
  const { colors } = useTheme();
  const primaryColor = color || colors.primary;
  const scrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scrollAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [scrollAnim]);

  const translateX = scrollAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });

  return (
    <View
      style={[
        styles.tapeContainer,
        {
          width,
          height,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.tapeMovingTrack,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Svg width={width + 36} height={height} viewBox={`0 0 ${width + 36} ${height}`}>
          {/* Top & Bottom Sprocket holes repeated */}
          {Array.from({ length: 14 }).map((_, i) => (
            <React.Fragment key={i}>
              <Rect
                x={i * 12 + 2}
                y={3}
                width={7}
                height={5}
                rx={1}
                fill={primaryColor}
                opacity={0.8}
              />
              <Rect
                x={i * 12 + 2}
                y={height - 8}
                width={7}
                height={5}
                rx={1}
                fill={primaryColor}
                opacity={0.8}
              />
            </React.Fragment>
          ))}

          {/* Film Frame separators */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Line
              key={i}
              x1={i * 36 + 6}
              y1={10}
              x2={i * 36 + 6}
              y2={height - 10}
              stroke={colors.borderLight}
              strokeWidth={1.5}
              strokeDasharray="2,2"
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
};

interface FilmLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  color?: string;
  style?: ViewStyle;
}

/**
 * Universal Film-themed Loading Component
 */
export const FilmLoading: React.FC<FilmLoadingProps> = ({
  message,
  size = 'md',
  fullScreen = false,
  color,
  style,
}) => {
  const { colors } = useTheme();
  const primaryColor = color || colors.primary;

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const reelSize = size === 'sm' ? 28 : size === 'lg' ? 64 : 44;

  const content = (
    <View style={[styles.centerWrap, style]}>
      {/* Glow behind the spinning reel */}
      <Animated.View
        style={[
          styles.projectorGlow,
          {
            width: reelSize * 1.8,
            height: reelSize * 1.8,
            borderRadius: reelSize * 0.9,
            backgroundColor: primaryColor,
            opacity: Animated.multiply(pulseAnim, 0.18),
          },
        ]}
      />

      {/* Spinning 35mm Reel */}
      <FilmReelSpinner size={reelSize} color={primaryColor} />

      {/* Optional Film Strip Tape underneath for larger views */}
      {size === 'lg' && (
        <View style={{ marginTop: 14 }}>
          <FilmStripTape width={140} height={32} color={primaryColor} />
        </View>
      )}

      {/* Message Label */}
      {message ? (
        <Animated.Text
          style={[
            styles.messageText,
            {
              color: colors.textPrimary,
              opacity: pulseAnim,
              marginTop: size === 'sm' ? 8 : 14,
            },
          ]}
        >
          {message}
        </Animated.Text>
      ) : null}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenOverlay, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  projectorGlow: {
    position: 'absolute',
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  fullScreenOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapeContainer: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tapeMovingTrack: {
    flexDirection: 'row',
  },
});
