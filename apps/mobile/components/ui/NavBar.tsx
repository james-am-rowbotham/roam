import { StyleSheet, View } from 'react-native';
import { RoamLogo } from './RoamLogo';

export function NavBar() {
  return (
    <View style={styles.bar}>
      <RoamLogo size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, alignItems: 'center', justifyContent: 'center' },
});
