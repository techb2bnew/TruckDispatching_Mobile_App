import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import RNLinearGradient from 'react-native-linear-gradient';

type Props = Omit<ComponentProps<typeof RNLinearGradient>, 'colors'> & { colors: readonly string[] };

/**
 * Drop-in for expo-linear-gradient's LinearGradient. react-native-linear-gradient paints inside the
 * padding box on Fabric, so padded/bordered gradients clip their content. Here the gradient is an
 * absolute-fill layer under a normal View, so padding, borders and radii behave like expo's.
 */
export function LinearGradient({ colors, start, end, locations, style, children, ...rest }: Props) {
  return (
    <View style={[style, { overflow: 'hidden' }]} {...(rest as object)}>
      <RNLinearGradient colors={[...colors]} start={start} end={end} locations={locations} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
}
