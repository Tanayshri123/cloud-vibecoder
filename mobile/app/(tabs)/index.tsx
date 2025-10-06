import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';

export default function IndexScreen() {
  const [repo, setRepo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);


  const handleSubmit = async () => {
    console.log(`Fetching from: ${BASE_URL}/api/plan`);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, prompt }),
      });
      const data = await res.json();
      setPlan(data.plan);
    } catch (err) {
      console.error('Network error:', err);
      Alert.alert(
        'Connection Error',
        `Failed to connect to backend at ${BASE_URL}. Please check your internet connection.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cloud Vibecoder</Text>

      <TextInput
        placeholder="Enter GitHub Repo"
        value={repo}
        onChangeText={setRepo}
        style={styles.input}
      />
      <TextInput
        placeholder="Describe your change request"
        value={prompt}
        onChangeText={setPrompt}
        style={styles.input}
      />
      <Button title="Generate Plan" onPress={handleSubmit} />

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {plan && (
        <View style={styles.planBox}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planSummary}>{plan.summary}</Text>
          {plan.steps.map((s: string, i: number) => (
            <Text key={i} style={styles.planStep}>{`${i + 1}. ${s}`}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 26, fontWeight: '600', marginBottom: 24, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    color: 'white',
  },
  planBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  planTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  planSummary: { color: '#555', marginBottom: 10 },
  planStep: { marginBottom: 4 },
});
