import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';

export default function IndexScreen() {
  const [repo, setRepo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);


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
      <View style={styles.header}>
        <Text style={styles.title}>Cloud Vibecoder</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => router.push('/welcome')}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Enter GitHub Repo URL"
          value={repo}
          onChangeText={setRepo}
          style={styles.input}
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Describe your change request"
          value={prompt}
          onChangeText={setPrompt}
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Generate Plan</Text>
          )}
        </TouchableOpacity>
      </View>

      {plan && (
        <View style={styles.planBox}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <Text style={styles.planSummary}>{plan.summary}</Text>
          {plan.steps.map((s: string, i: number) => (
            <Text key={i} style={styles.planStep}>{`${i + 1}. ${s}`}</Text>
          ))}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.acceptButton]}
              onPress={() => {
                // Show a small popup indicating the change was pushed
                setConfirmVisible(true);
                Alert.alert('Success', 'Change pushed to GitHub!');
                // hide inline confirmation after a short delay
                setTimeout(() => setConfirmVisible(false), 2000);
              }}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.declineButton]}
              onPress={() => {
                // Simply clear the plan on decline
                setPlan(null);
              }}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>

          {confirmVisible && (
            <View style={styles.inlineConfirm}>
              <Text style={styles.inlineConfirmText}>Change pushed to GitHub!</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#1a1a1a',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  planBox: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 12,
    color: '#1a1a1a',
  },
  planSummary: { 
    color: '#666', 
    marginBottom: 16,
    fontSize: 16,
    lineHeight: 22,
  },
  planStep: { 
    marginBottom: 8,
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  acceptText: {
    color: 'white',
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#d0d0d0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginLeft: 8,
  },
  declineText: {
    color: '#333',
    fontWeight: '600',
  },
  inlineConfirm: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    alignSelf: 'center',
  },
  inlineConfirmText: {
    color: '#2e7d32',
    fontWeight: '600',
  },
});
