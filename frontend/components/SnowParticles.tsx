import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

const NUM_FLAKES = Platform.OS === 'web' ? 30 : 20;

interface Flake {
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  size: number;
  duration: number;
  delay: number;
}

function createFlake(): Flake {
  return {
    x: new Animated.Value(Math.random() * SW),
    y: new Animated.Value(-20),
    opacity: new Animated.Value(0),
    size: Math.random() * 5 + 3,
    duration: Math.random() * 6000 + 5000,
    delay: Math.random() * 8000,
  };
}

export function SnowParticles() {
  const flakesRef = useRef<Flake[]>(Array.from({ length: NUM_FLAKES }, createFlake));

  useEffect(() => {
    const animations = flakesRef.current.map(flake => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(flake.y, {
              toValue: SH + 20,
              duration: flake.duration,
              useNativeDriver: true,
            }),
            Animated.timing(flake.opacity, {
              toValue: 0.7,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(flake.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      let timeoutId = setTimeout(() => {
        loop.start();
      }, flake.delay);

      return {
        stop: () => {
          clearTimeout(timeoutId);
          loop.stop();
        }
      };
    });

    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flakesRef.current.map((flake, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: flake.x,
            transform: [{ translateY: flake.y }],
            opacity: flake.opacity,
            fontSize: flake.size,
            color: '#ffffff',
          }}
        >
          ❄
        </Animated.Text>
      ))}
    </View>
  );
}
