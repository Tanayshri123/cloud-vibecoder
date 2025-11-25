import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import { router } from 'expo-router';
import githubService, { type GitHubRepo } from '../../services/githubService';

// For local development: Use your computer's IP address if testing on physical device
// For iOS Simulator: use 'http://localhost:8000'
// For Android Emulator: use 'http://10.0.2.2:8000'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

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

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
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
  
  // File browser state
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [planModelUsed, setPlanModelUsed] = useState<string | null>(null);
  const [creatingPR, setCreatingPR] = useState(false);
  const [jobProgress, setJobProgress] = useState<{status: string; message: string; percentage: number} | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

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

  const fetchFileTree = async (path: string = '') => {
    if (!selectedRepo) return;

    setLoadingFiles(true);
    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const contents = await githubService.getRepositoryContents(owner, repoName, path);
      
      // GitHub API returns either an array (directory) or object (file)
      const items = Array.isArray(contents) ? contents : [contents];
      
      const mapped: FileTreeItem[] = items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size,
        sha: item.sha,
      }));

      // Sort: directories first, then alphabetically
      mapped.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      setFileTree(mapped);
      setCurrentPath(path);
    } catch (err) {
      console.error('Error fetching file tree:', err);
      Alert.alert('Error', `Failed to load file structure: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileTreeItemPress = (item: FileTreeItem) => {
    if (item.type === 'dir') {
      setPathHistory([...pathHistory, currentPath]);
      fetchFileTree(item.path);
    } else {
      // For files, you could show file contents or just indicate selection
      Alert.alert('File Selected', `Path: ${item.path}\nSize: ${item.size} bytes`);
    }
  };

  const handleBackInFileTree = () => {
    if (pathHistory.length > 0) {
      const previous = pathHistory[pathHistory.length - 1];
      setPathHistory(pathHistory.slice(0, -1));
      fetchFileTree(previous);
    } else {
      setShowFileBrowser(false);
    }
  };

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
      setPlanModelUsed(data.model_used || null);
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
    setPlanModelUsed(null);
    setCurrentStep('input');
  };

  const handleAcceptPlan = async () => {
    if (!plan || !selectedRepo) {
      Alert.alert('Error', 'No plan or repository selected');
      return;
    }

    if (!isAuthed) {
      Alert.alert('Error', 'Please sign in with GitHub to create a pull request');
      return;
    }

    const token = await githubService.getAccessToken();
    if (!token) {
      Alert.alert('Error', 'GitHub token not found. Please sign in again.');
      return;
    }

    setCreatingPR(true);
    setJobProgress({ status: 'starting', message: 'Initializing...', percentage: 0 });

    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const branchName = `vibecoder-${Date.now()}`;

      // Step 1: Create job to execute coding agent
      console.log('Creating coding job...');
      setJobProgress({ status: 'creating_job', message: 'Creating coding job...', percentage: 10 });
      
      const jobRes = await fetch(`${BASE_URL}/api/jobs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: selectedRepo.html_url,
          branch: selectedRepo.default_branch || 'main',
          github_token: token,
          implementation_plan: plan,
          create_new_branch: true,
          new_branch_name: branchName,
          push_changes: true
        }),
      });

      if (!jobRes.ok) {
        throw new Error(`Failed to create job: ${jobRes.status}`);
      }

      const jobData = await jobRes.json();
      const createdJobId = jobData.job_id;
      setJobId(createdJobId);
      console.log('Job created:', createdJobId);

      // Step 2: Poll for job progress
      setJobProgress({ status: 'executing', message: 'Generating code with AI...', percentage: 20 });
      
      let jobCompleted = false;
      let pollAttempts = 0;
      const maxAttempts = 180; // 6 minutes max (2 second intervals) - AI coding takes time!
      
      while (!jobCompleted && pollAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
        pollAttempts++;
        
        const progressRes = await fetch(`${BASE_URL}/api/jobs/${createdJobId}/progress`);
        if (!progressRes.ok) {
          console.warn('Failed to fetch progress');
          continue;
        }
        
        const progressData = await progressRes.json();
        console.log('Job progress:', progressData);
        
        setJobProgress({
          status: progressData.status,
          message: progressData.message || 'Processing...',
          percentage: progressData.progress_percentage || 20
        });
        
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          jobCompleted = true;
        }
      }

      if (!jobCompleted) {
        throw new Error('Job timed out. Please try again.');
      }

      // Step 3: Get job result
      setJobProgress({ status: 'getting_result', message: 'Getting results...', percentage: 85 });
      
      const resultRes = await fetch(`${BASE_URL}/api/jobs/${createdJobId}/result`);
      if (!resultRes.ok) {
        throw new Error(`Failed to get job result: ${resultRes.status}`);
      }
      
      const result = await resultRes.json();
      console.log('Job result:', result);

      if (!result.success) {
        throw new Error(result.error_message || 'Job failed');
      }

      // Step 4: Create pull request
      setJobProgress({ status: 'creating_pr', message: 'Creating pull request...', percentage: 90 });
      
      const prRes = await fetch(`${BASE_URL}/api/github/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_owner: owner,
          repo_name: repoName,
          title: plan.title,
          body: `## ${plan.summary}\n\n### Changes Made by AI\n- ${result.files_changed} files changed\n- ${result.commits_created} commits created\n- ${result.total_edits} edits\n\n**User Request:** ${prompt}\n\n---\n*Generated by Cloud Vibecoder AI Agent*\n*Execution time: ${result.execution_time_seconds.toFixed(1)}s*`,
          head_branch: result.branch_name || branchName,
          base_branch: selectedRepo.default_branch || 'main',
          github_token: token
        }),
      });

      if (!prRes.ok) {
        throw new Error(`Failed to create PR: ${prRes.status}`);
      }

      const pr = await prRes.json();
      console.log('PR created:', pr);

      setJobProgress({ status: 'completed', message: 'Pull request created!', percentage: 100 });

      Alert.alert(
        '✅ Pull Request Created!',
        `PR #${pr.number} has been created with real code changes!\n\n📊 Stats:\n• Files changed: ${result.files_changed}\n• Commits: ${result.commits_created}\n• AI tokens used: ${result.tokens_used}`,
        [
          {
            text: 'View PR',
            onPress: () => {
              console.log('PR URL:', pr.html_url);
              // Could open in browser with Linking.openURL(pr.html_url)
            }
          },
          {
            text: 'Done',
            style: 'default',
            onPress: () => {
              setConfirmVisible(true);
              setTimeout(() => {
                setConfirmVisible(false);
                handleReset(); // Reset to start new request
              }, 2000);
            }
          }
        ]
      );

    } catch (err) {
      console.error('Error in workflow:', err);
      Alert.alert(
        'Error',
        `Failed to complete workflow: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      setJobProgress({ status: 'failed', message: 'Workflow failed', percentage: 0 });
    } finally {
      setCreatingPR(false);
      setTimeout(() => {
        setJobProgress(null);
        setJobId(null);
      }, 3000);
    }
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
                        setShowFileBrowser(false);
                        setFileTree([]);
                        setCurrentPath('');
                        setPathHistory([]);
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

      {/* File Browser Button */}
      {selectedRepo && !showFileBrowser && (
        <TouchableOpacity
          style={styles.fileBrowserButton}
          onPress={() => {
            setShowFileBrowser(true);
            fetchFileTree('');
          }}
        >
          <Text style={styles.fileBrowserButtonText}>📁 Browse Files</Text>
        </TouchableOpacity>
      )}

      {/* File Browser */}
      {showFileBrowser && selectedRepo && (
        <View style={styles.fileBrowserContainer}>
          <View style={styles.fileBrowserHeader}>
            <TouchableOpacity onPress={handleBackInFileTree} style={styles.fileBrowserBackButton}>
              <Text style={styles.fileBrowserBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.fileBrowserPath} numberOfLines={1}>
              {currentPath || selectedRepo.full_name}
            </Text>
            <TouchableOpacity onPress={() => setShowFileBrowser(false)} style={styles.fileBrowserCloseButton}>
              <Text style={styles.fileBrowserCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingFiles ? (
            <View style={styles.fileBrowserLoading}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <FlatList
              data={fileTree}
              keyExtractor={(item) => item.path}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.fileTreeItem}
                  onPress={() => handleFileTreeItemPress(item)}
                >
                  <Text style={styles.fileTreeIcon}>{item.type === 'dir' ? '📁' : '📄'}</Text>
                  <Text style={styles.fileTreeName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.fileTreeList}
            />
          )}
        </View>
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

      {planModelUsed === 'fallback' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>⚠️ Showing a fallback plan</Text>
          <Text style={styles.warningText}>
            Configure OPENAI_API_KEY on the backend to generate a detailed plan using the repository structure.
          </Text>
        </View>
      )}

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

        {/* Progress tracker */}
        {jobProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressStatus}>{jobProgress.message}</Text>
              <Text style={styles.progressPercentage}>{jobProgress.percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${jobProgress.percentage}%` }]} />
            </View>
            {jobId && (
              <Text style={styles.progressJobId}>Job ID: {jobId}</Text>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.acceptButton, creatingPR && styles.submitButtonDisabled]}
            onPress={handleAcceptPlan}
            disabled={creatingPR}
          >
            {creatingPR ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.acceptText}>🤖 Execute with AI Agent</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineButton, creatingPR && styles.submitButtonDisabled]}
            onPress={() => {
              setPlan(null);
              setCurrentStep('input');
            }}
            disabled={creatingPR}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>

        {confirmVisible && (
          <View style={styles.inlineConfirm}>
            <Text style={styles.inlineConfirmText}>✅ Real code changes pushed to GitHub!</Text>
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
  // File browser styles
  fileBrowserButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  fileBrowserButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  fileBrowserContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    marginBottom: 16,
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fileBrowserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  fileBrowserBackButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileBrowserBackText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  fileBrowserPath: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  fileBrowserCloseButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fileBrowserCloseText: {
    fontSize: 18,
    color: '#666',
  },
  fileBrowserLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTreeList: {
    maxHeight: 320,
  },
  fileTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fileTreeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  fileTreeName: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  // Warning banner styles
  warningBox: {
    backgroundColor: '#FFF4E5',
    borderColor: '#FFC78A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A5300',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#8A5300',
    lineHeight: 18,
  },
  // Progress tracker styles
  progressContainer: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e1e5e9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressJobId: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
  },
});
