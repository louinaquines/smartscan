import { Tabs } from 'expo-router';
import { ShoppingCart, LayoutDashboard, History } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#378ADD' }}>
            <Tabs.Screen
                name="index"
                options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={22} /> }}
            />
            <Tabs.Screen
                name="cart"
                options={{ title: 'Cart', tabBarIcon: ({ color }) => <ShoppingCart color={color} size={22} /> }}
            />
            <Tabs.Screen
                name="history"
                options={{ title: 'History', tabBarIcon: ({ color }) => <History color={color} size={22} /> }}
            />
        </Tabs>
    );
}