import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../../theme';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.app,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.title, color: colors.text.primary },
});
