import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://cloud-vibecoder-1.onrender.com';

interface CRS {
  goal: string;
  summary: string;
  priority: string;
  scope: string;
  estimated_complexity: string;
  blast_radius: string;
  confidence_score: number;
  constraints: Array<{constraint_type: string; description: string; severity: string}>;
  acceptance_criteria: Array<{criterion: string; testable: boolean; priority: string}>;
  component_hints: Array<{component: string; confidence: number; rationale: string}>;
  clarifying_questions: Array<{question: string; context: string; critical: boolean}>;
  requires_clarification: boolean;
}

interface PlanStep {
  step_number: number;
  title: string;
  description: string;
  step_type: string;
  estimated_time: string;
  dependencies: number[];
  reversible: boolean;
}

interface FileChange {
  path: string;
  intent: string;
  rationale: string;
  diff_stub?: string;
  priority: number;
}

interface ImplementationPlan {
  title: string;
  summary: string;
  steps: PlanStep[];
  files_to_change: FileChange[];
  estimated_total_time: string;
  complexity_score: number;
  confidence_score: number;
  blast_radius: string;
}

export default function IndexScreen() {
  const [repo, setRepo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [crs, setCrs] = useState<CRS | null>(null);
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'crs' | 'plan'>('input');

  const handleGenerateCRS = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a change request');
      return;
    }

    console.log(`Generating CRS from: ${BASE_URL}/api/crs`);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/crs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          repo_url: repo.trim() || undefined
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setCrs(data.crs);
      setCurrentStep('crs');
    } catch (err) {
      console.error('CRS generation error:', err);
      Alert.alert(
        'Error',
        `Failed to generate CRS: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!crs) return;

    console.log(`Generating plan from: ${BASE_URL}/api/plan-synthesis`);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/plan-synthesis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          crs: crs,
          repo_url: repo.trim() || undefined,
          scope_preferences: ['minimal changes', 'frontend only']
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setPlan(data.plan);
      setCurrentStep('plan');
    } catch (err) {
      console.error('Plan generation error:', err);
      Alert.alert(
        'Error',
        `Failed to generate plan: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCrs(null);
    setPlan(null);
    setCurrentStep('input');
  };

  const renderInputStep = () => (
    <View style={styles.form}>
      <TextInput
        placeholder="Enter GitHub Repo URL (optional)"
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
        onPress={handleGenerateCRS}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>Generate Change Request Spec</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderCRSStep = () => (
    <ScrollView style={styles.resultContainer}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>Change Request Specification</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
          <Text style={styles.actionButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.crsBox}>
        <Text style={styles.crsGoal}>{crs?.goal}</Text>
        <Text style={styles.crsSummary}>{crs?.summary}</Text>
        
        <View style={styles.crsMeta}>
          <Text style={styles.crsMetaItem}>Priority: {crs?.priority}</Text>
          <Text style={styles.crsMetaItem}>Scope: {crs?.scope}</Text>
          <Text style={styles.crsMetaItem}>Complexity: {crs?.estimated_complexity}</Text>
          <Text style={styles.crsMetaItem}>Confidence: {Math.round((crs?.confidence_score || 0) * 100)}%</Text>
        </View>

        {crs?.constraints && crs.constraints.length > 0 && (
          <View style={styles.crsSection}>
            <Text style={styles.crsSectionTitle}>Constraints</Text>
            {crs.constraints.map((constraint, i) => (
              <Text key={i} style={styles.crsItem}>• {constraint.description}</Text>
            ))}
          </View>
        )}

        {crs?.acceptance_criteria && crs.acceptance_criteria.length > 0 && (
          <View style={styles.crsSection}>
            <Text style={styles.crsSectionTitle}>Acceptance Criteria</Text>
            {crs.acceptance_criteria.map((criteria, i) => (
              <Text key={i} style={styles.crsItem}>• {criteria.criterion}</Text>
            ))}
          </View>
        )}

        {crs?.clarifying_questions && crs.clarifying_questions.length > 0 && (
          <View style={styles.crsSection}>
            <Text style={styles.crsSectionTitle}>Clarifying Questions</Text>
            {crs.clarifying_questions.map((question, i) => (
              <Text key={i} style={styles.crsItem}>• {question.question}</Text>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleGeneratePlan}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>Generate Implementation Plan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPlanStep = () => (
    <ScrollView style={styles.resultContainer}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>Implementation Plan</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
          <Text style={styles.actionButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planBox}>
        <Text style={styles.planTitle}>{plan?.title}</Text>
        <Text style={styles.planSummary}>{plan?.summary}</Text>
        
        <View style={styles.planMeta}>
          <Text style={styles.planMetaItem}>Total Time: {plan?.estimated_total_time}</Text>
          <Text style={styles.planMetaItem}>Complexity: {plan?.complexity_score}/10</Text>
          <Text style={styles.planMetaItem}>Confidence: {Math.round((plan?.confidence_score || 0) * 100)}%</Text>
          <Text style={styles.planMetaItem}>Blast Radius: {plan?.blast_radius}</Text>
        </View>

        <View style={styles.planSection}>
          <Text style={styles.planSectionTitle}>Implementation Steps</Text>
          {plan?.steps.map((step) => (
            <View key={step.step_number} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{step.step_number}</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
                <Text style={styles.stepMeta}>{step.step_type} • {step.estimated_time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planSection}>
          <Text style={styles.planSectionTitle}>Files to Change</Text>
          {plan?.files_to_change.map((file, i) => (
            <View key={i} style={styles.fileItem}>
              <Text style={styles.filePath}>{file.path}</Text>
              <Text style={styles.fileIntent}>{file.intent}</Text>
              <Text style={styles.fileRationale}>{file.rationale}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

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

      {currentStep === 'input' && renderInputStep()}
      {currentStep === 'crs' && renderCRSStep()}
      {currentStep === 'plan' && renderPlanStep()}
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
  resultContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  crsBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  crsGoal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  crsSummary: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  crsMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  crsMetaItem: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  crsSection: {
    marginBottom: 16,
  },
  crsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  crsItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  planBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  planMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  planMetaItem: {
    fontSize: 14,
    color: '#28a745',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  planSection: {
    marginBottom: 20,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 12,
    minWidth: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  stepMeta: {
    fontSize: 12,
    color: '#6c757d',
  },
  fileItem: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  filePath: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  fileIntent: {
    fontSize: 12,
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  fileRationale: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});
