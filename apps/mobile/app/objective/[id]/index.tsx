import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ObjectiveGuide } from '../../../components/objective/ObjectiveGuide';
import { useObjective } from '../../../lib/contentRepo';
import { colors, type } from '../../../theme';

// Objective Guide screen — thin: load the objective by id, render the shared shell.
// The same screen serves trail (gr11) and peak (aneto); the shell parameterises itself.
export default function ObjectiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useObjective(id);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Objective not found.</Text>
      </View>
    );
  }
  return <ObjectiveGuide objective={data} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.app,
  },
  message: { ...type.body, color: colors.text.secondary },
});
