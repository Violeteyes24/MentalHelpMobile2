import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                <Text style={styles.gradientText}>Mental</Text>
                <Text style={styles.markedText}>Help</Text>
            </Text>
            <Text style={styles.subtitle}>Your mental health companion</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    title: {
        fontSize: 48,
        fontWeight: '800',
        color: '#1f2937',
        textAlign: 'center',
    },
    gradientText: {
        color: '#000',
        backgroundColor: 'transparent',
    },
    markedText: {
        paddingHorizontal: 8,
        color: '#fff',
        backgroundColor: '#34d399',
        borderRadius: 4,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30,
        textAlign: 'center',
    },
});

/*

To do: 

1. research chatbot and sentiment analysis. DEADLINE: 19
2. implement mood tracker insert data and fetch data through mood visualization page which is to be made DEADLINE: 25
3. debug root layout: DEADLINE: 26
4. Unrelated: Data Mining, DEADLINE: 18

*/