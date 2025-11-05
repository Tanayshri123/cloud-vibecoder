import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import { router } from 'expo-router';
import githubService, { type GitHubRepo } from '../../services/githubService';

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

interface ClarifyingQuestion {
  question: string;
  context: string;
  critical: boolean;
}

interface ClarificationAnswer {
  question: string;
  answer: string;
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
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [reposOpen, setReposOpen] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [crs, setCrs] = useState<CRS | null>(null);
  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'input' | 'clarify' | 'crs' | 'plan'>('input');
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<number, string>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const authed = await githubService.isAuthenticated();
        setIsAuthed(authed);
        if (authed) {
          setLoadingRepos(true);
          const list = await githubService.getRepositories('all', 'updated', 'desc');
          setRepos(list);
        }
      } catch (e) {
        console.warn('Failed to load repos:', e);
      } finally {
        setLoadingRepos(false);
      }
    };
    init();
  }, []);

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
      const crsResp: CRS = data.crs;
      if (crsResp?.requires_clarification && crsResp.clarifying_questions?.length) {
        setClarifyQuestions(crsResp.clarifying_questions.slice(0, 3));
        setCurrentStep('clarify');
      } else {
        setCrs(crsResp);
        setCurrentStep('crs');
      }
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

  const handleSubmitClarifications = async () => {
    if (!clarifyQuestions.length) return;
    const answers: ClarificationAnswer[] = clarifyQuestions.map((q, idx) => ({
      question: q.question,
      answer: (clarifyAnswers[idx] || '').trim(),
    }));
    if (answers.some(a => !a.answer)) {
      Alert.alert('Missing info', 'Please answer the questions to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/crs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: prompt.trim(),
          repo_url: repo.trim() || undefined,
          answers,
          max_questions: 0
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setCrs(data.crs);
      setCurrentStep('crs');
    } catch (err) {
      console.error('Clarification submit error:', err);
      Alert.alert('Error', `Failed to submit clarifications: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      {/* Repo selector */}
      {isAuthed ? (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setReposOpen((o) => !o)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedRepo ? selectedRepo.full_name : 'Select a GitHub repository'}
            </Text>
            {loadingRepos && <ActivityIndicator size="small" color="#6B7280" />}
          </TouchableOpacity>

          {reposOpen && (
            <View style={styles.dropdownList}>
              {repos.length === 0 && !loadingRepos ? (
                <Text style={styles.dropdownEmpty}>No repositories found.</Text>
              ) : (
                <FlatList
                  data={repos}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedRepo(item);
                        setRepo(item.html_url || '');
                        setReposOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText} numberOfLines={1}>
                        {item.full_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={{ maxHeight: 240 }}
                />
              )}
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.dropdown, { justifyContent: 'center' }]}
          onPress={() => router.push('/login')}
        >
          <Text style={[styles.dropdownText, { color: '#6B7280' }]}>Sign in with GitHub to select a repository</Text>
        </TouchableOpacity>
      )}

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

  const renderClarifyStep = () => (
    <ScrollView style={styles.resultContainer}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>Quick Clarification</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleReset}>
          <Text style={styles.actionButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.crsBox}>
        <Text style={styles.crsSummary}>We need a bit more detail to generate a precise plan.</Text>
        {clarifyQuestions.map((q, idx) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={styles.crsSectionTitle}>{q.question}</Text>
            <TextInput
              placeholder="Your answer"
              value={clarifyAnswers[idx] || ''}
              onChangeText={(t) => setClarifyAnswers(prev => ({ ...prev, [idx]: t }))}
              style={[styles.input, styles.textArea]}
              multiline
            />
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmitClarifications}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>Continue</Text>
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
              setCurrentStep('input');
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
      {currentStep === 'clarify' && renderClarifyStep()}
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
  // Dropdown styles for repo selector
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  dropdownList: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dropdownEmpty: {
    padding: 16,
    color: '#6B7280',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
