import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

export function NavBar() {
  return (
    <View style={styles.bar}>
      <Text style={styles.logo}>roam</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, alignItems: 'center', justifyContent: 'center' },
  // Logo uses Inter Bold (700) — outside the token system, specific to brand mark
  logo: { fontFamily: fonts.bold, fontSize: 24, color: colors.accent },
});
