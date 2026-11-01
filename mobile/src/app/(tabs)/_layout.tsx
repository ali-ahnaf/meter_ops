import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderMenu } from '@/components/HeaderMenu';
import { color, font } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: color.background },
        headerTitleStyle: { fontFamily: font.heading, color: color.heading },
        headerShadowVisible: false,
        headerRight: () => <HeaderMenu />,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.muted,
        tabBarLabelStyle: { fontFamily: font.medium },
        tabBarStyle: { backgroundColor: color.surface, borderTopColor: color.border },
        sceneStyle: { backgroundColor: color.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DPDC',
          tabBarIcon: ({ focused, size }) => <Ionicons name="flash-outline" size={size} color={focused ? color.primary : color.muted} />,
        }}
      />
      <Tabs.Screen
        name="wasa"
        options={{
          title: 'WASA',
          tabBarIcon: ({ focused, size }) => <Ionicons name="water-outline" size={size} color={focused ? color.primary : color.muted} />,
        }}
      />
    </Tabs>
  );
}
