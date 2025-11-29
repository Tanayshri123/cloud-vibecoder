import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, FlatList, Animated, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import githubService, { type GitHubRepo } from '../../services/githubService';
import { Accent, LightTheme, Typography, Spacing, Radius, Shadows } from '../../constants/theme';
import RepoModeSelector, { type RepoMode } from '../../components/RepoModeSelector';
import NewRepoForm, { type NewRepoConfig } from '../../components/NewRepoForm';

const { width } = Dimensions.get('window');

// Get greeting based on time of day
const getGreeting = (): { line1: string; line2: string } => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return { line1: 'Good', line2: 'morning' };
  } else if (hour >= 12 && hour < 17) {
    return { line1: 'Good', line2: 'afternoon' };
  } else if (hour >= 17 && hour < 21) {
    return { line1: 'Good', line2: 'evening' };
  } else {
    return { line1: 'Good', line2: 'night' };
  }
};

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

// Detect project type from user prompt for new repos
const detectProjectType = (prompt: string): string | undefined => {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('react native') || lowerPrompt.includes('expo')) {
    return 'react-native';
  }
  if (lowerPrompt.includes('next.js') || lowerPrompt.includes('nextjs')) {
    return 'nextjs';
  }
  if (lowerPrompt.includes('react')) {
    return 'react';
  }
  if (lowerPrompt.includes('fastapi') || lowerPrompt.includes('fast api')) {
    return 'fastapi';
  }
  if (lowerPrompt.includes('django')) {
    return 'django';
  }
  if (lowerPrompt.includes('flask')) {
    return 'flask';
  }
  if (lowerPrompt.includes('python')) {
    return 'python';
  }
  if (lowerPrompt.includes('express') || lowerPrompt.includes('node.js') || lowerPrompt.includes('nodejs')) {
    return 'node';
  }
  if (lowerPrompt.includes('typescript') || lowerPrompt.includes('ts')) {
    return 'typescript';
  }
  if (lowerPrompt.includes('vue')) {
    return 'vue';
  }
  if (lowerPrompt.includes('svelte')) {
    return 'svelte';
  }
  if (lowerPrompt.includes('rust')) {
    return 'rust';
  }
  if (lowerPrompt.includes('go ') || lowerPrompt.includes('golang')) {
    return 'go';
  }
  
  // Default: try to infer from common patterns
  if (lowerPrompt.includes('api') || lowerPrompt.includes('backend') || lowerPrompt.includes('server')) {
    return 'node'; // Default backend to node
  }
  if (lowerPrompt.includes('web') || lowerPrompt.includes('frontend') || lowerPrompt.includes('website')) {
    return 'react'; // Default frontend to react
  }
  
  return undefined;
};

export default function IndexScreen() {
  // Repository mode state
  const [repoMode, setRepoMode] = useState<RepoMode>('existing');
  const [newRepoConfig, setNewRepoConfig] = useState<NewRepoConfig>({
    name: '',
    description: '',
    private: false,
    gitignoreTemplate: null,
    licenseTemplate: null,
  });
  
  // Existing repo state
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
  const [isEditingCRS, setIsEditingCRS] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [clarifyQuestions, setClarifyQuestions] = useState<ClarifyingQuestion[]>([]);
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<number, string>>({});
  const [confirmVisible, setConfirmVisible] = useState(false);
  
  // File browser state
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  // Plan file picker state (for selecting files to add to implementation plan)
  const [showPlanFilePicker, setShowPlanFilePicker] = useState(false);
  const [planFileTree, setPlanFileTree] = useState<FileTreeItem[]>([]);
  const [planCurrentPath, setPlanCurrentPath] = useState('');
  const [planPathHistory, setPlanPathHistory] = useState<string[]>([]);
  const [planFileSearch, setPlanFileSearch] = useState('');
  const [loadingPlanFiles, setLoadingPlanFiles] = useState(false);
  const [selectedPlanFiles, setSelectedPlanFiles] = useState<Record<string, FileTreeItem>>({});
  const [planModelUsed, setPlanModelUsed] = useState<string | null>(null);
  const [creatingPR, setCreatingPR] = useState(false);
  const [jobProgress, setJobProgress] = useState<{status: string; message: string; percentage: number} | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Greeting
  const [greeting, setGreeting] = useState(getGreeting());

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    setGreeting(getGreeting());
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
      
      const items = Array.isArray(contents) ? contents : [contents];
      
      const mapped: FileTreeItem[] = items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size,
        sha: item.sha,
      }));

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

  // Plan file picker helpers (for adding files to the implementation plan)
  const fetchPlanFileTree = async (path: string = '') => {
    if (!selectedRepo) return;

    setLoadingPlanFiles(true);
    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const contents = await githubService.getRepositoryContents(owner, repoName, path);
      const items = Array.isArray(contents) ? contents : [contents];

      const mapped: FileTreeItem[] = items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size,
        sha: item.sha,
      }));

      mapped.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      });

      setPlanFileTree(mapped);
      setPlanCurrentPath(path);
    } catch (err) {
      console.error('Error fetching plan file tree:', err);
      Alert.alert(
        'Error',
        `Failed to load repository files: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setLoadingPlanFiles(false);
    }
  };

  const handlePlanFileItemPress = (item: FileTreeItem) => {
    if (item.type === 'dir') {
      setPlanPathHistory(prev => [...prev, planCurrentPath]);
      fetchPlanFileTree(item.path);
    } else {
      setSelectedPlanFiles(prev => {
        const next = { ...prev };
        if (next[item.path]) {
          delete next[item.path];
        } else {
          next[item.path] = item;
        }
        return next;
      });
    }
  };

  const handleBackInPlanFileTree = () => {
    if (planPathHistory.length > 0) {
      const previous = planPathHistory[planPathHistory.length - 1];
      setPlanPathHistory(planPathHistory.slice(0, -1));
      fetchPlanFileTree(previous);
    } else {
      setShowPlanFilePicker(false);
      setPlanFileSearch('');
    }
  };

  const handleConfirmPlanFileSelection = () => {
    if (!plan) {
      setShowPlanFilePicker(false);
      setPlanFileSearch('');
      return;
    }

    const selectedItems = Object.values(selectedPlanFiles);
    if (!selectedItems.length) {
      setShowPlanFilePicker(false);
      setPlanFileSearch('');
      return;
    }

    setPlan(prev => {
      if (!prev) return prev;
      const existing = prev.files_to_change || [];
      const existingPaths = new Set(existing.map(f => f.path));
      
      // Calculate max priority from existing files to avoid duplicates
      const maxPriority = existing.length > 0 
        ? Math.max(...existing.map(f => f.priority || 0))
        : 0;

      const additions: FileChange[] = selectedItems
        .filter(item => !existingPaths.has(item.path))
        .map((item, idx) => ({
          path: item.path,
          intent: 'modify',
          rationale: '',
          priority: maxPriority + idx + 1,
        }));

      if (!additions.length) return prev;

      return {
        ...prev,
        files_to_change: [...existing, ...additions],
      };
    });

    setShowPlanFilePicker(false);
    setSelectedPlanFiles({});
    setPlanFileSearch('');
  };

  const handleFileTreeItemPress = (item: FileTreeItem) => {
    if (item.type === 'dir') {
      setPathHistory([...pathHistory, currentPath]);
      fetchFileTree(item.path);
    } else {
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
          repo_url: repoMode === 'existing' ? repo.trim() || undefined : undefined,
          is_new_repo: repoMode === 'new',
          project_type: repoMode === 'new' ? detectProjectType(prompt) : undefined
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
        setIsEditingCRS(false);
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
          repo_url: repoMode === 'existing' ? repo.trim() || undefined : undefined,
          answers,
          max_questions: 0,
          is_new_repo: repoMode === 'new',
          project_type: repoMode === 'new' ? detectProjectType(prompt) : undefined
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setCrs(data.crs);
      setIsEditingCRS(false);
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
          repo_url: repoMode === 'existing' ? repo.trim() || undefined : undefined,
          scope_preferences: repoMode === 'new' ? ['new project', 'create files'] : ['minimal changes', 'frontend only'],
          is_new_repo: repoMode === 'new',
          project_type: repoMode === 'new' ? detectProjectType(prompt) : undefined
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setPlan(data.plan);
      setPlanModelUsed(data.model_used || null);
      setIsEditingPlan(false);
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
    setIsEditingCRS(false);
    setIsEditingPlan(false);
    setShowPlanFilePicker(false);
    setCurrentStep('input');
  };

  const handleAcceptPlan = async () => {
    // Validate based on mode
    if (repoMode === 'existing' && !selectedRepo) {
      Alert.alert('Error', 'Please select a repository');
      return;
    }
    
    if (repoMode === 'new' && !newRepoConfig.name.trim()) {
      Alert.alert('Error', 'Please enter a repository name');
      return;
    }
    
    if (!plan) {
      Alert.alert('Error', 'No implementation plan available');
      return;
    }

    if (!isAuthed) {
      Alert.alert('Error', 'Please sign in with GitHub to continue');
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
      const branchName = `vibecoder-${Date.now()}`;

      console.log('Creating coding job...');
      setJobProgress({ 
        status: 'creating_job', 
        message: repoMode === 'new' ? 'Creating repository and coding job...' : 'Creating coding job...', 
        percentage: 10 
      });
      
      // Build job payload based on mode
      const jobPayload = repoMode === 'new' 
        ? {
            create_new_repo: true,
            new_repo_config: {
              name: newRepoConfig.name.trim(),
              description: newRepoConfig.description.trim() || null,
              private: newRepoConfig.private,
              gitignore_template: newRepoConfig.gitignoreTemplate,
              license_template: newRepoConfig.licenseTemplate,
            },
            github_token: token,
            implementation_plan: plan,
            create_new_branch: false, // Work on default branch for new repos
            push_changes: true
          }
        : {
            repo_url: selectedRepo!.html_url,
            branch: selectedRepo!.default_branch || 'main',
            github_token: token,
            implementation_plan: plan,
            create_new_branch: true,
            new_branch_name: branchName,
            push_changes: true
          };
      
      const jobRes = await fetch(`${BASE_URL}/api/jobs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobPayload),
      });

      if (!jobRes.ok) {
        throw new Error(`Failed to create job: ${jobRes.status}`);
      }

      const jobData = await jobRes.json();
      const createdJobId = jobData.job_id;
      setJobId(createdJobId);
      console.log('Job created:', createdJobId);

      setJobProgress({ status: 'executing', message: 'Generating code with AI...', percentage: 20 });
      
      let jobCompleted = false;
      let pollAttempts = 0;
      const maxAttempts = 180;
      
      while (!jobCompleted && pollAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
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

      // For new repos, changes are pushed directly to main - no PR needed
      // For existing repos, create a PR
      if (repoMode === 'new') {
        setJobProgress({ status: 'completed', message: 'Repository created and code pushed!', percentage: 100 });
        
        Alert.alert(
          '✅ Repository Created!',
          `Your new repository "${newRepoConfig.name}" has been created with the generated code!`,
          [
            {
              text: 'View Changes',
              onPress: () => {
                const params = new URLSearchParams({
                  result: JSON.stringify(result),
                  repoUrl: result.repo_url || '',
                  isNewRepo: 'true'
                });
                router.push(`/changes?${params.toString()}` as any);
                // Reset state after navigation
                setTimeout(() => {
                  setCreatingPR(false);
                  setJobProgress(null);
                  setJobId(null);
                  handleReset();
                  setNewRepoConfig({
                    name: '',
                    description: '',
                    private: false,
                    gitignoreTemplate: null,
                    licenseTemplate: null,
                  });
                }, 100);
              }
            },
            {
              text: 'Done',
              style: 'default',
              onPress: () => {
                // Reset all state immediately
                setCreatingPR(false);
                setJobProgress(null);
                setJobId(null);
                handleReset();
                // Reset new repo form
                setNewRepoConfig({
                  name: '',
                  description: '',
                  private: false,
                  gitignoreTemplate: null,
                  licenseTemplate: null,
                });
              }
            }
          ]
        );
      } else {
        // Existing repo - show changes for approval before creating PR
        setJobProgress({ status: 'completed', message: 'Changes ready for review!', percentage: 100 });

        Alert.alert(
          '✅ Changes Ready!',
          'Review the changes and approve to create a pull request.',
          [
            {
              text: 'Review Changes',
              onPress: () => {
                const params = new URLSearchParams({
                  result: JSON.stringify(result),
                  repoUrl: selectedRepo!.html_url || '',
                  isNewRepo: 'false',
                  needsApproval: 'true',
                  planData: JSON.stringify(plan),
                  repoFullName: selectedRepo!.full_name,
                  branchName: branchName,
                  defaultBranch: selectedRepo!.default_branch || 'main',
                  prompt: prompt
                });
                router.push(`/changes?${params.toString()}` as any);
                // Reset state after navigation
                setTimeout(() => {
                  setCreatingPR(false);
                  setJobProgress(null);
                  setJobId(null);
                  handleReset();
                }, 100);
              }
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setConfirmVisible(true);
                setTimeout(() => {
                  setConfirmVisible(false);
                  handleReset();
                }, 2000);
              }
            }
          ]
        );
      }

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
    <Animated.View 
      style={[
        styles.form,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Auth check */}
      {!isAuthed ? (
        <TouchableOpacity
          style={styles.authPrompt}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.authPromptIcon}>⬢</Text>
          <Text style={styles.authPromptText}>Sign in with GitHub to get started</Text>
        </TouchableOpacity>
      ) : (
        <>
          {/* Mode Selector */}
          <RepoModeSelector 
            mode={repoMode} 
            onModeChange={(mode) => {
              setRepoMode(mode);
              // Reset selections when switching modes
              if (mode === 'new') {
                setSelectedRepo(null);
                setRepo('');
                setShowFileBrowser(false);
              }
            }}
            disabled={loading}
          />

          {/* Existing Repo Selector */}
          {repoMode === 'existing' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Repository</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setReposOpen((o) => !o)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {selectedRepo ? selectedRepo.full_name : 'Select a GitHub repository'}
                  </Text>
                  {loadingRepos ? (
                    <ActivityIndicator size="small" color={Accent.primary} />
                  ) : (
                    <Text style={styles.dropdownChevron}>{reposOpen ? '▲' : '▼'}</Text>
                  )}
                </TouchableOpacity>

                {reposOpen && (
                  <View style={styles.dropdownList}>
                    {repos.length === 0 && !loadingRepos ? (
                      <Text style={styles.dropdownEmpty}>No repositories found.</Text>
                    ) : (
                      <ScrollView 
                        style={{ maxHeight: 200 }}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {repos.map((item) => (
                          <TouchableOpacity
                            key={String(item.id)}
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
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>

              {/* File Browser Button */}
              {selectedRepo && !showFileBrowser && (
                <TouchableOpacity
                  style={styles.fileBrowserButton}
                  onPress={() => {
                    setShowFileBrowser(true);
                    fetchFileTree('');
                  }}
                >
                  <Text style={styles.fileBrowserButtonIcon}>📁</Text>
                  <Text style={styles.fileBrowserButtonText}>Browse Files</Text>
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
                      <ActivityIndicator size="large" color={Accent.primary} />
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
            </>
          )}

          {/* New Repo Form */}
          {repoMode === 'new' && (
            <NewRepoForm
              config={newRepoConfig}
              onConfigChange={setNewRepoConfig}
              disabled={loading}
            />
          )}
        </>
      )}

      {/* Request Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Change Request</Text>
        <TextInput
          placeholder="Describe what you want to build or change..."
          placeholderTextColor={LightTheme.textTertiary}
          value={prompt}
          onChangeText={setPrompt}
          style={styles.textArea}
          multiline
          numberOfLines={4}
        />
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleGenerateCRS}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Generate Specification</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCRSStep = () => (
    <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.resultHeader}>
        <View style={styles.resultHeaderTitle}>
          <Text style={styles.resultTitle}>Specification</Text>
          <Text style={styles.resultSubtitle}>Review and refine your change request</Text>
        </View>
      </View>

      <View style={styles.inlineActionRow}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditingCRS(prev => !prev)}
        >
          <Text style={styles.editButtonText}>{isEditingCRS ? 'Done Editing' : 'Edit Spec'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.specCard}>
        {isEditingCRS ? (
          <>
            <TextInput
              style={styles.specGoalInput}
              value={crs?.goal || ''}
              onChangeText={(text) =>
                setCrs(prev => prev ? { ...prev, goal: text } : prev)
              }
              placeholder="Goal"
              placeholderTextColor={LightTheme.textTertiary}
            />
            <TextInput
              style={styles.specSummaryInput}
              value={crs?.summary || ''}
              onChangeText={(text) =>
                setCrs(prev => prev ? { ...prev, summary: text } : prev)
              }
              placeholder="Summary"
              placeholderTextColor={LightTheme.textTertiary}
              multiline
            />
          </>
        ) : (
          <>
            <Text style={styles.specGoal}>{crs?.goal}</Text>
            <Text style={styles.specSummary}>{crs?.summary}</Text>
          </>
        )}
        
        <View style={styles.metaRow}>
          {isEditingCRS ? (
            <>
              <TextInput
                style={styles.metaInput}
                value={crs?.priority || ''}
                onChangeText={(text) =>
                  setCrs(prev => prev ? { ...prev, priority: text } : prev)
                }
                placeholder="Priority"
                placeholderTextColor={LightTheme.textTertiary}
              />
              <TextInput
                style={styles.metaInput}
                value={crs?.scope || ''}
                onChangeText={(text) =>
                  setCrs(prev => prev ? { ...prev, scope: text } : prev)
                }
                placeholder="Scope"
                placeholderTextColor={LightTheme.textTertiary}
              />
            </>
          ) : (
            <>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{crs?.priority}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{crs?.scope}</Text>
              </View>
            </>
          )}
          <View style={[styles.metaBadge, styles.metaBadgeAccent]}>
            <Text style={styles.metaBadgeTextAccent}>
              {Math.round((crs?.confidence_score || 0) * 100)}%
            </Text>
          </View>
        </View>

        {crs?.constraints && crs.constraints.length > 0 && (
          <View style={styles.specSection}>
            <Text style={styles.specSectionTitle}>Constraints</Text>
            {crs.constraints.map((constraint, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemBullet} />
                {isEditingCRS ? (
                  <View style={styles.editableRow}>
                    <TextInput
                      style={styles.listItemInput}
                      value={constraint.description}
                      onChangeText={(text) =>
                        setCrs(prev => {
                          if (!prev) return prev;
                          const updated = prev.constraints.map((c, idx) =>
                            idx === i ? { ...c, description: text } : c
                          );
                          return { ...prev, constraints: updated };
                        })
                      }
                      placeholder="Constraint description"
                      placeholderTextColor={LightTheme.textTertiary}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.removePill}
                      onPress={() =>
                        setCrs(prev => {
                          if (!prev) return prev;
                          const updated = prev.constraints.filter((_, idx) => idx !== i);
                          return { ...prev, constraints: updated };
                        })
                      }
                    >
                      <Text style={styles.removePillText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.listItemText}>{constraint.description}</Text>
                )}
              </View>
            ))}
            {isEditingCRS && (
              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  setCrs(prev => {
                    if (!prev) return prev;
                    const nextConstraints = prev.constraints ? [...prev.constraints] : [];
                    nextConstraints.push({
                      constraint_type: 'other',
                      description: '',
                      severity: 'medium',
                    });
                    return { ...prev, constraints: nextConstraints };
                  })
                }
              >
                <Text style={styles.addRowButtonText}>+ Add Constraint</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {crs?.acceptance_criteria && crs.acceptance_criteria.length > 0 && (
          <View style={styles.specSection}>
            <Text style={styles.specSectionTitle}>Acceptance Criteria</Text>
            {crs.acceptance_criteria.map((criteria, i) => (
              <View key={i} style={styles.checklistItem}>
                <View style={styles.checkbox} />
                {isEditingCRS ? (
                  <View style={styles.editableRow}>
                    <TextInput
                      style={styles.checklistInput}
                      value={criteria.criterion}
                      onChangeText={(text) =>
                        setCrs(prev => {
                          if (!prev) return prev;
                          const updated = prev.acceptance_criteria.map((c, idx) =>
                            idx === i ? { ...c, criterion: text } : c
                          );
                          return { ...prev, acceptance_criteria: updated };
                        })
                      }
                      placeholder="Acceptance criterion"
                      placeholderTextColor={LightTheme.textTertiary}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.removePill}
                      onPress={() =>
                        setCrs(prev => {
                          if (!prev) return prev;
                          const updated = prev.acceptance_criteria.filter((_, idx) => idx !== i);
                          return { ...prev, acceptance_criteria: updated };
                        })
                      }
                    >
                      <Text style={styles.removePillText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.checklistText}>{criteria.criterion}</Text>
                )}
              </View>
            ))}
            {isEditingCRS && (
              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  setCrs(prev => {
                    if (!prev) return prev;
                    const nextCriteria = prev.acceptance_criteria ? [...prev.acceptance_criteria] : [];
                    nextCriteria.push({
                      criterion: '',
                      testable: true,
                      priority: 'medium',
                    });
                    return { ...prev, acceptance_criteria: nextCriteria };
                  })
                }
              >
                <Text style={styles.addRowButtonText}>+ Add Acceptance Criterion</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleGeneratePlan}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Generate Implementation Plan</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderClarifyStep = () => (
    <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.resultTitle}>Clarification</Text>
          <Text style={styles.resultSubtitle}>Help us understand better</Text>
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.specCard}>
        <Text style={styles.specSummary}>We need a bit more detail to generate a precise plan.</Text>
        {clarifyQuestions.map((q, idx) => (
          <View key={idx} style={styles.questionBlock}>
            <Text style={styles.questionText}>{q.question}</Text>
            <TextInput
              placeholder="Your answer"
              placeholderTextColor={LightTheme.textTertiary}
              value={clarifyAnswers[idx] || ''}
              onChangeText={(t) => setClarifyAnswers(prev => ({ ...prev, [idx]: t }))}
              style={styles.answerInput}
              multiline
            />
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={handleSubmitClarifications}
        disabled={loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderPlanStep = () => (
    <View style={styles.planScreen}>
      <View style={styles.planHeaderWrapper}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting.line1}</Text>
            <Text style={styles.greetingAccent}>{greeting.line2}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('/welcome')}
          >
            <Text style={styles.profileButtonText}>CV</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.planScrollContent}>
        <View style={styles.resultHeader}>
          <View style={styles.resultHeaderTitle}>
            <Text style={styles.resultTitle}>Implementation</Text>
            <Text style={styles.resultSubtitle}>Review and refine your execution plan</Text>
          </View>
        </View>

        <View style={styles.inlineActionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditingPlan(prev => !prev)}
          >
            <Text style={styles.editButtonText}>{isEditingPlan ? 'Done Editing' : 'Edit Plan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>

        {planModelUsed === 'fallback' && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>Showing fallback plan. Configure API key for detailed plans.</Text>
          </View>
        )}

        <View style={styles.planCard}>
          {isEditingPlan ? (
            <>
              <TextInput
                style={styles.planTitleInput}
                value={plan?.title || ''}
                onChangeText={(text) =>
                  setPlan(prev => prev ? { ...prev, title: text } : prev)
                }
                placeholder="Plan title"
                placeholderTextColor={LightTheme.textTertiary}
              />
              <TextInput
                style={styles.planSummaryInput}
                value={plan?.summary || ''}
                onChangeText={(text) =>
                  setPlan(prev => prev ? { ...prev, summary: text } : prev)
                }
                placeholder="Plan summary"
                placeholderTextColor={LightTheme.textTertiary}
                multiline
              />
            </>
          ) : (
            <>
              <Text style={styles.planTitle}>{plan?.title}</Text>
              <Text style={styles.planSummary}>{plan?.summary}</Text>
            </>
          )}
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              {isEditingPlan ? (
                <TextInput
                  style={styles.statInput}
                  value={plan?.estimated_total_time || ''}
                  onChangeText={(text) =>
                    setPlan(prev => prev ? { ...prev, estimated_total_time: text } : prev)
                  }
                  placeholder="Total time"
                  placeholderTextColor={LightTheme.textTertiary}
                />
              ) : (
                <>
                  <Text style={styles.statValue}>{plan?.estimated_total_time}</Text>
                  <Text style={styles.statLabel}>Time</Text>
                </>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              {isEditingPlan ? (
                <TextInput
                  style={styles.statInput}
                  value={String(plan?.complexity_score ?? '')}
                  onChangeText={(text) =>
                    setPlan(prev => prev ? { ...prev, complexity_score: Number(text) || 0 } : prev)
                  }
                  placeholder="Complexity (0-10)"
                  placeholderTextColor={LightTheme.textTertiary}
                  keyboardType="numeric"
                />
              ) : (
                <>
                  <Text style={styles.statValue}>{plan?.complexity_score}/10</Text>
                  <Text style={styles.statLabel}>Complexity</Text>
                </>
              )}
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round((plan?.confidence_score || 0) * 100)}%</Text>
              <Text style={styles.statLabel}>Confidence</Text>
            </View>
          </View>

          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Steps</Text>
            {plan?.steps.map((step, index) => (
              <View key={step.step_number} style={styles.stepCard}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.step_number}</Text>
                </View>
                <View style={styles.stepContent}>
                  {isEditingPlan ? (
                    <>
                      <TextInput
                        style={styles.stepTitleInput}
                        value={step.title}
                        onChangeText={(text) =>
                          setPlan(prev => {
                            if (!prev) return prev;
                            const updated = prev.steps.map((s, idx) =>
                              idx === index ? { ...s, title: text } : s
                            );
                            return { ...prev, steps: updated };
                          })
                        }
                        placeholder="Step title"
                        placeholderTextColor={LightTheme.textTertiary}
                      />
                      <TextInput
                        style={styles.stepDescriptionInput}
                        value={step.description}
                        onChangeText={(text) =>
                          setPlan(prev => {
                            if (!prev) return prev;
                            const updated = prev.steps.map((s, idx) =>
                              idx === index ? { ...s, description: text } : s
                            );
                            return { ...prev, steps: updated };
                          })
                        }
                        placeholder="Step description"
                        placeholderTextColor={LightTheme.textTertiary}
                        multiline
                      />
                      <TextInput
                        style={styles.stepMetaInput}
                        value={`${step.step_type} • ${step.estimated_time}`}
                        editable={false}
                      />
                      <TouchableOpacity
                        style={styles.removePill}
                        onPress={() =>
                          setPlan(prev => {
                            if (!prev) return prev;
                            const updated = prev.steps.filter((_, idx) => idx !== index);
                            const reNumbered = updated.map((s, idx) => ({
                              ...s,
                              step_number: idx + 1,
                            }));
                            return { ...prev, steps: reNumbered };
                          })
                        }
                      >
                        <Text style={styles.removePillText}>Remove Step</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDescription}>{step.description}</Text>
                      <Text style={styles.stepMeta}>{step.step_type} • {step.estimated_time}</Text>
                    </>
                  )}
                </View>
              </View>
            ))}
            {isEditingPlan && (
              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  setPlan(prev => {
                    if (!prev) return prev;
                    const nextSteps = prev.steps ? [...prev.steps] : [];
                    const nextNumber = nextSteps.length + 1;
                    nextSteps.push({
                      step_number: nextNumber,
                      title: `Step ${nextNumber}`,
                      description: '',
                      step_type: 'implementation',
                      estimated_time: '30 minutes',
                      dependencies: [],
                      reversible: true,
                    });
                    return { ...prev, steps: nextSteps };
                  })
                }
              >
                <Text style={styles.addRowButtonText}>+ Add Step</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Files to Change</Text>
            {plan?.files_to_change.map((file, index) => (
              <View key={index} style={styles.fileCard}>
                {isEditingPlan ? (
                  <>
                    <TextInput
                      style={styles.filePathInput}
                      value={file.path}
                      onChangeText={(text) =>
                        setPlan(prev => {
                          if (!prev) return prev;
                          const updated = prev.files_to_change.map((f, idx) =>
                            idx === index ? { ...f, path: text } : f
                          );
                          return { ...prev, files_to_change: updated };
                        })
                      }
                      placeholder="File path"
                      placeholderTextColor={LightTheme.textTertiary}
                    />
                    <TextInput
                      style={styles.fileIntentInput}
                      value={file.intent}
                      onChangeText={(text) =>
                        setPlan(prev => {
                          if (!prev) return prev;
                          const updated = prev.files_to_change.map((f, idx) =>
                            idx === index ? { ...f, intent: text } : f
                          );
                          return { ...prev, files_to_change: updated };
                        })
                      }
                      placeholder="Intent (create/modify/delete)"
                      placeholderTextColor={LightTheme.textTertiary}
                    />
                    <TextInput
                      style={styles.fileRationaleInput}
                      value={file.rationale}
                      onChangeText={(text) =>
                        setPlan(prev => {
                          if (!prev) return prev;
                          const updated = prev.files_to_change.map((f, idx) =>
                            idx === index ? { ...f, rationale: text } : f
                          );
                          return { ...prev, files_to_change: updated };
                        })
                      }
                      placeholder="Rationale"
                      placeholderTextColor={LightTheme.textTertiary}
                      multiline
                    />
                    <TouchableOpacity
                      style={styles.removePill}
                      onPress={() =>
                        setPlan(prev => {
                          if (!prev) return prev;
                          const updated = prev.files_to_change.filter((_, idx) => idx !== index);
                          // Recalculate priorities to ensure they're sequential
                          const rePrioritized = updated.map((f, idx) => ({
                            ...f,
                            priority: idx + 1,
                          }));
                          return { ...prev, files_to_change: rePrioritized };
                        })
                      }
                    >
                      <Text style={styles.removePillText}>Remove File</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.filePath}>{file.path}</Text>
                    <View style={styles.fileIntentBadge}>
                      <Text style={styles.fileIntentText}>{file.intent}</Text>
                    </View>
                    <Text style={styles.fileRationale}>{file.rationale}</Text>
                  </>
                )}
              </View>
            ))}
            {isEditingPlan && (
              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() => {
                  if (repoMode === 'existing' && selectedRepo) {
                    setShowPlanFilePicker(true);
                    setSelectedPlanFiles({});
                    setPlanPathHistory([]);
                    setPlanFileSearch('');
                    fetchPlanFileTree('');
                  } else {
                    // For new repos (no GitHub tree yet), fall back to manual entry
                    setPlan(prev => {
                      if (!prev) return prev;
                      const nextFiles = prev.files_to_change ? [...prev.files_to_change] : [];
                      nextFiles.push({
                        path: '',
                        intent: 'modify',
                        rationale: '',
                        priority: nextFiles.length + 1,
                      });
                      return { ...prev, files_to_change: nextFiles };
                    });
                  }
                }}
              >
                <Text style={styles.addRowButtonText}>+ Add File</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress tracker */}
          {jobProgress && (
            <View style={styles.jobProgressContainer}>
              <View style={styles.jobProgressHeader}>
                <Text style={styles.jobProgressMessage}>{jobProgress.message}</Text>
                <Text style={styles.jobProgressPercentage}>{jobProgress.percentage}%</Text>
              </View>
              <View style={styles.jobProgressBarBg}>
                <View style={[styles.jobProgressBar, { width: `${jobProgress.percentage}%` }]} />
              </View>
              {jobId && (
                <Text style={styles.jobProgressId}>Job: {jobId.slice(0, 8)}...</Text>
              )}
            </View>
          )}

          {confirmVisible && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Code changes pushed to GitHub!</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.stickyActionContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.executeButton, creatingPR && styles.buttonDisabled]}
            onPress={handleAcceptPlan}
            disabled={creatingPR}
            activeOpacity={0.9}
          >
            {creatingPR ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.executeButtonIcon}>🤖</Text>
                <Text style={styles.executeButtonText}>Execute with AI</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.declineButton, creatingPR && styles.buttonDisabled]}
            onPress={() => {
              setPlan(null);
              setCurrentStep('input');
            }}
            disabled={creatingPR}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {currentStep === 'plan' ? (
        // Plan step has its own layout with sticky buttons - render outside outer ScrollView
        renderPlanStep()
      ) : (
        // Other steps render inside the outer ScrollView
        <View style={styles.scrollOuter}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting.line1}</Text>
                <Text style={styles.greetingAccent}>{greeting.line2}</Text>
              </View>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => router.push('/welcome')}
              >
                <Text style={styles.profileButtonText}>CV</Text>
              </TouchableOpacity>
            </View>

            {currentStep === 'input' && renderInputStep()}
            {currentStep === 'clarify' && renderClarifyStep()}
            {currentStep === 'crs' && renderCRSStep()}
          </ScrollView>
        </View>
      )}

      {/* Plan file picker overlay - rendered outside ScrollView for proper absolute positioning */}
      {currentStep === 'plan' && showPlanFilePicker && selectedRepo && (
        <View style={styles.planFilePickerOverlay}>
          <View style={styles.planFilePickerCard}>
            <View style={styles.planFilePickerHeader}>
              <TouchableOpacity onPress={handleBackInPlanFileTree} style={styles.planFilePickerBackButton}>
                <Text style={styles.planFilePickerBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.planFilePickerPath} numberOfLines={1}>
                {planCurrentPath || selectedRepo.full_name}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowPlanFilePicker(false);
                setPlanFileSearch('');
              }} style={styles.planFilePickerCloseButton}>
                <Text style={styles.planFilePickerCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.planFilePickerSearchRow}>
              <TextInput
                style={styles.planFilePickerSearchInput}
                placeholder="Search files..."
                placeholderTextColor={LightTheme.textTertiary}
                value={planFileSearch}
                onChangeText={setPlanFileSearch}
              />
            </View>

            {loadingPlanFiles ? (
              <View style={styles.planFilePickerLoading}>
                <ActivityIndicator size="small" color={Accent.primary} />
              </View>
            ) : (
              <FlatList
                data={planFileTree.filter(item =>
                  !planFileSearch.trim()
                    ? true
                    : item.path.toLowerCase().includes(planFileSearch.trim().toLowerCase())
                )}
                keyExtractor={(item) => item.path}
                renderItem={({ item }) => {
                  const checked = !!selectedPlanFiles[item.path];
                  return (
                    <TouchableOpacity
                      style={styles.planFilePickerItem}
                      onPress={() => handlePlanFileItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.planFilePickerIcon}>
                        {item.type === 'dir' ? '📁' : '📄'}
                      </Text>
                      <Text style={styles.planFilePickerName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.type === 'file' && (
                        <View style={[styles.planFilePickerCheckbox, checked && styles.planFilePickerCheckboxChecked]}>
                          {checked && <Text style={styles.planFilePickerCheckboxMark}>✓</Text>}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.planFilePickerList}
              />
            )}

            <TouchableOpacity
              style={[styles.primaryButton, (!Object.keys(selectedPlanFiles).length) && styles.buttonDisabled]}
              onPress={handleConfirmPlanFileSelection}
              disabled={!Object.keys(selectedPlanFiles).length}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Add Selected Files</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: LightTheme.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  scrollOuter: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xl,
  },
  greeting: {
    ...Typography.displaySmall,
    color: LightTheme.text,
    letterSpacing: -0.5,
  },
  greetingAccent: {
    ...Typography.displaySmall,
    color: Accent.primary,
    letterSpacing: -0.5,
    marginTop: -4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.light.md,
  },
  profileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Typography.labelMedium,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdown: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    ...Typography.bodyLarge,
    color: LightTheme.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  dropdownChevron: {
    fontSize: 12,
    color: LightTheme.textTertiary,
  },
  dropdownList: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    ...Shadows.light.md,
    overflow: 'hidden',
  },
  dropdownEmpty: {
    padding: Spacing.md,
    ...Typography.bodyMedium,
    color: LightTheme.textTertiary,
  },
  dropdownItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  dropdownItemText: {
    ...Typography.bodyMedium,
    color: LightTheme.text,
  },
  authPrompt: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  authPromptIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  authPromptText: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    flex: 1,
  },
  fileBrowserButton: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  fileBrowserButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  fileBrowserButtonText: {
    ...Typography.labelLarge,
    color: Accent.primary,
  },
  fileBrowserContainer: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    maxHeight: 350,
    ...Shadows.light.md,
    overflow: 'hidden',
  },
  fileBrowserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.border,
    backgroundColor: LightTheme.backgroundSecondary,
  },
  fileBrowserBackButton: {
    paddingHorizontal: Spacing.sm,
  },
  fileBrowserBackText: {
    ...Typography.labelMedium,
    color: Accent.primary,
  },
  fileBrowserPath: {
    flex: 1,
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  fileBrowserCloseButton: {
    paddingHorizontal: Spacing.sm,
  },
  fileBrowserCloseText: {
    fontSize: 18,
    color: LightTheme.textTertiary,
  },
  fileBrowserLoading: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileTreeList: {
    maxHeight: 280,
  },
  fileTreeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  fileTreeIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
  },
  fileTreeName: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.text,
  },
  textArea: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyLarge,
    color: LightTheme.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: Accent.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    ...Shadows.light.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultHeaderTitle: {
    flex: 1,
  },
  resultHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  inlineActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  resultTitle: {
    ...Typography.h1,
    color: LightTheme.text,
  },
  resultSubtitle: {
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    marginTop: 2,
  },
  resetButton: {
    backgroundColor: LightTheme.backgroundSecondary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  resetButtonText: {
    ...Typography.labelMedium,
    color: LightTheme.textSecondary,
  },
  editButton: {
    backgroundColor: LightTheme.backgroundSecondary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
  },
  editButtonText: {
    ...Typography.labelMedium,
    color: Accent.primary,
  },
  specCard: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.light.md,
  },
  specGoal: {
    ...Typography.h2,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  specSummary: {
    ...Typography.bodyLarge,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  specGoalInput: {
    ...Typography.h2,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  specSummaryInput: {
    ...Typography.bodyLarge,
    color: LightTheme.text,
    marginBottom: Spacing.md,
    lineHeight: 24,
  },
  metaInput: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    ...Typography.labelSmall,
    color: LightTheme.text,
    minWidth: 80,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaBadge: {
    backgroundColor: LightTheme.backgroundTertiary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm,
  },
  metaBadgeAccent: {
    backgroundColor: Accent.primary + '20',
  },
  metaBadgeText: {
    ...Typography.labelSmall,
    color: LightTheme.textSecondary,
    textTransform: 'uppercase',
  },
  metaBadgeTextAccent: {
    ...Typography.labelSmall,
    color: Accent.primary,
    fontWeight: '600',
  },
  specSection: {
    marginTop: Spacing.md,
  },
  specSectionTitle: {
    ...Typography.labelLarge,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  listItemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Accent.primary,
    marginTop: 8,
    marginRight: Spacing.sm,
  },
  listItemText: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.textSecondary,
    lineHeight: 22,
  },
  listItemInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.text,
    lineHeight: 22,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: LightTheme.border,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  checklistText: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.text,
    lineHeight: 22,
  },
  checklistInput: {
    flex: 1,
    ...Typography.bodyMedium,
    color: LightTheme.text,
    lineHeight: 22,
  },
  editableRow: {
    flex: 1,
  },
  addRowButton: {
    marginTop: Spacing.sm,
  },
  addRowButtonText: {
    ...Typography.labelMedium,
    color: Accent.primary,
  },
  removePill: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: LightTheme.backgroundTertiary,
  },
  removePillText: {
    ...Typography.labelSmall,
    color: LightTheme.textSecondary,
  },
  questionBlock: {
    marginTop: Spacing.md,
  },
  questionText: {
    ...Typography.labelLarge,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  answerInput: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.bodyMedium,
    color: LightTheme.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  warningBanner: {
    backgroundColor: '#FFF4E5',
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  warningText: {
    flex: 1,
    ...Typography.bodySmall,
    color: '#8A5300',
  },
  planCard: {
    backgroundColor: LightTheme.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.light.md,
  },
  planTitle: {
    ...Typography.h2,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  planSummary: {
    ...Typography.bodyLarge,
    color: LightTheme.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  planTitleInput: {
    ...Typography.h2,
    color: LightTheme.text,
    marginBottom: Spacing.sm,
  },
  planSummaryInput: {
    ...Typography.bodyLarge,
    color: LightTheme.text,
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    color: LightTheme.text,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
    marginTop: 2,
  },
  statInput: {
    ...Typography.bodyMedium,
    color: LightTheme.text,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.sm,
    minWidth: 80,
  },
  statDivider: {
    width: 1,
    backgroundColor: LightTheme.border,
    marginHorizontal: Spacing.sm,
  },
  planSection: {
    marginBottom: Spacing.lg,
  },
  planSectionTitle: {
    ...Typography.labelLarge,
    color: LightTheme.text,
    marginBottom: Spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.labelLarge,
    color: LightTheme.text,
    marginBottom: 4,
  },
  stepTitleInput: {
    ...Typography.labelLarge,
    color: LightTheme.text,
    marginBottom: 4,
  },
  stepDescription: {
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  stepDescriptionInput: {
    ...Typography.bodySmall,
    color: LightTheme.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  stepMetaInput: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
  },
  stepMeta: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
  },
  fileCard: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filePath: {
    ...Typography.labelMedium,
    color: LightTheme.text,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs,
  },
  filePathInput: {
    ...Typography.labelMedium,
    color: LightTheme.text,
    fontFamily: 'monospace',
    marginBottom: Spacing.xs,
  },
  fileIntentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Accent.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  fileIntentText: {
    ...Typography.labelSmall,
    color: Accent.primary,
    textTransform: 'uppercase',
  },
  fileRationale: {
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
    lineHeight: 18,
  },
  fileIntentInput: {
    ...Typography.labelSmall,
    color: LightTheme.text,
    marginBottom: Spacing.xs,
  },
  fileRationaleInput: {
    ...Typography.bodySmall,
    color: LightTheme.text,
    lineHeight: 18,
  },
  planFilePickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  planFilePickerCard: {
    backgroundColor: LightTheme.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.md,
    maxHeight: 420,
    ...Shadows.light.md,
  },
  planFilePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  planFilePickerBackButton: {
    paddingHorizontal: Spacing.sm,
  },
  planFilePickerBackText: {
    ...Typography.labelMedium,
    color: Accent.primary,
  },
  planFilePickerPath: {
    flex: 1,
    ...Typography.bodySmall,
    color: LightTheme.textSecondary,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  planFilePickerCloseButton: {
    paddingHorizontal: Spacing.sm,
  },
  planFilePickerCloseText: {
    fontSize: 18,
    color: LightTheme.textTertiary,
  },
  planFilePickerSearchRow: {
    marginBottom: Spacing.sm,
  },
  planFilePickerSearchInput: {
    backgroundColor: LightTheme.backgroundSecondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodySmall,
    color: LightTheme.text,
  },
  planFilePickerLoading: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planFilePickerList: {
    maxHeight: 260,
    marginBottom: Spacing.md,
  },
  planFilePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: LightTheme.borderLight,
  },
  planFilePickerIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  planFilePickerName: {
    flex: 1,
    ...Typography.bodySmall,
    color: LightTheme.text,
  },
  planFilePickerCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LightTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFilePickerCheckboxChecked: {
    backgroundColor: Accent.primary,
    borderColor: Accent.primary,
  },
  planFilePickerCheckboxMark: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  jobProgressContainer: {
    backgroundColor: Accent.primary + '10',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Accent.primary + '30',
  },
  jobProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  jobProgressMessage: {
    ...Typography.labelMedium,
    color: Accent.primary,
    flex: 1,
  },
  jobProgressPercentage: {
    ...Typography.labelLarge,
    color: Accent.primary,
    fontWeight: '700',
  },
  jobProgressBarBg: {
    height: 6,
    backgroundColor: Accent.primary + '30',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  jobProgressBar: {
    height: '100%',
    backgroundColor: Accent.primary,
    borderRadius: 3,
  },
  jobProgressId: {
    ...Typography.labelSmall,
    color: LightTheme.textTertiary,
    fontFamily: 'monospace',
  },
  planScreen: {
    flex: 1,
  },
  planHeaderWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.lg,
  },
  planScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stickyActionContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: LightTheme.background,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  executeButton: {
    flex: 2,
    backgroundColor: Accent.success,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.light.sm,
  },
  executeButtonIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  executeButtonText: {
    ...Typography.labelLarge,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: LightTheme.backgroundTertiary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    ...Typography.labelLarge,
    color: LightTheme.textSecondary,
  },
  successBanner: {
    backgroundColor: Accent.success + '15',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  successText: {
    ...Typography.labelMedium,
    color: Accent.success,
    fontWeight: '600',
  },
});
