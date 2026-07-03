import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/Colors';

interface EqualizerBarsProps {
  color?: string;
  size?: 'small' | 'medium';
}

export function EqualizerBars({ color = Colors.accent, size = 'medium' }: EqualizerBarsProps) {
  const isSmall = size === 'small';
  const maxHeight = isSmall ? 10 : 14;
  const baseHeight = isSmall ? 3 : 4;
  
  const anims = useRef([
    new Animated.Value(baseHeight + 4.4),
    new Animated.Value(maxHeight),
    new Animated.Value(baseHeight + 7.2),
    new Animated.Value(maxHeight),
    new Animated.Value(baseHeight + 4.4),
  ]).current;

  useEffect(() => {
    const animations = [
      { anim: anims[0], min: baseHeight, max: maxHeight - 3, duration: 400 },
      { anim: anims[1], min: baseHeight + 2, max: maxHeight, duration: 300 },
      { anim: anims[2], min: baseHeight, max: maxHeight - 2, duration: 500 },
      { anim: anims[3], min: baseHeight + 3, max: maxHeight, duration: 350 },
      { anim: anims[4], min: baseHeight - 1, max: maxHeight - 4, duration: 450 },
    ].map(({ anim, min, max, duration }) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max, duration, useNativeDriver: false }),
          Animated.timing(anim, { toValue: min, duration, useNativeDriver: false }),
        ])
      )
    );

    animations.forEach(a => a.start());

    return () => animations.forEach(a => a.stop());
  }, [anims, baseHeight, maxHeight]);

  return (
    <View style={styles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: anim, backgroundColor: color }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 14,
    justifyContent: 'center',
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});
