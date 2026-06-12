import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListItem } from '../../components/ui';
import { colors, layout, spacing, type } from '../../theme';

// Profile — settings rows on the ListItem pattern. The ACCOUNT row reflects
// real sync state: there is no auth wired up yet, so it renders honestly as
// "Local only" rather than pretending to sync.
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [offlineGuide, setOfflineGuide] = useState(false);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>ACCOUNT</Text>
          <ListItem icon="user" title="Account" value="Local only" onPress={() => {}} />
        </View>

        <View style={styles.group}>
          <Text style={styles.groupLabel}>SETTINGS</Text>
          <ListItem icon="route" title="Units" value="Metric" onPress={() => {}} />
          <ListItem
            icon="guide"
            title="Offline Guide"
            trailing="toggle"
            value={offlineGuide}
            onPress={() => setOfflineGuide((v) => !v)}
          />
          <ListItem icon="cloud" title="Weather alerts" value="On" onPress={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.app },
  header: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing[4] },
  title: { ...type.sectionHeader, color: colors.text.primary },
  group: { paddingHorizontal: layout.screenPadding, paddingTop: spacing[8] },
  groupLabel: { ...type.label, color: colors.text.secondary, paddingBottom: spacing[2] },
});
