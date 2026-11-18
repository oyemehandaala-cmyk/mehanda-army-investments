import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Linking as NativeLinking,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  LockKeyhole,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react-native';
import { decode } from 'base64-arraybuffer';
import { COMPANY, FAQS, LEGAL_CONTENT, SERVICES, SUPPORT_API } from './src/data/company';
import { isSupabaseConfigured, supabase } from './src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type Screen =
  | 'home'
  | 'services'
  | 'assistant'
  | 'profile'
  | 'notifications'
  | 'transactions'
  | 'help'
  | 'privacy'
  | 'terms'
  | 'risk'
  | 'auth';
type AuthMode = 'login' | 'signup' | 'reset' | 'new-password';
type ChatMessage = { role: 'user' | 'assistant'; text: string };
type UserProfile = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  phone_verified?: boolean;
};
type Transaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number | string;
  transaction_type: string | null;
  status: string;
};

const COLORS = {
  navy: '#071426',
  navySoft: '#10243B',
  gold: '#D5AE57',
  goldLight: '#F6E8C4',
  white: '#FFFFFF',
  paper: '#F5F6F8',
  ink: '#152235',
  muted: '#64748B',
  border: '#E1E5EB',
  green: '#0A8F70',
  red: '#B42318',
};

const MAX_CHAT_HISTORY = 8;
const INITIAL_CHAT: ChatMessage = {
  role: 'assistant',
  text: 'Hello! I can help with general questions about the company and its published services. I do not have access to your account or give personalized financial advice.',
};

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function MoneyNotice() {
  return (
    <View style={styles.notice}>
      <ShieldCheck color={COLORS.gold} size={19} />
      <Text style={styles.noticeText}>
        Investments are subject to market risk. Returns are not guaranteed. This app does not accept investment deposits.
      </Text>
    </View>
  );
}

function AppButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType ?? 'default'}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8B95A3"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function ContentCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <TrendingUp color={COLORS.gold} size={size * 0.53} strokeWidth={2.2} />
    </View>
  );
}

function AppContent() {
  const [booting, setBooting] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardingPage, setOnboardingPage] = useState(0);
  const [screen, setScreen] = useState<Screen>('home');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [user, setUser] = useState<{
    id: string;
    email: string;
    fullName: string;
    verified: boolean;
  } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileRefreshVersion, setProfileRefreshVersion] = useState(0);
  const [profileError, setProfileError] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionError, setTransactionError] = useState('');
  const [transactionsBusy, setTransactionsBusy] = useState(false);
  const [chatStatus, setChatStatus] = useState<'checking' | 'ready' | 'unavailable'>(
    SUPPORT_API.baseUrl ? 'checking' : 'unavailable',
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([INITIAL_CHAT]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const chatScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const handledAuthCodes = useRef(new Set<string>());
  const authValidationVersion = useRef(0);

  const configured = isSupabaseConfigured;
  const activeProfile = profile;
  const displayName = activeProfile?.full_name || user?.fullName || 'Client';

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      try {
        const [seen, sessionResult] = await Promise.all([
          import('expo-secure-store').then(({ getItemAsync }) => getItemAsync('onboarding-complete')),
          configured ? supabase.auth.getSession() : Promise.resolve({ data: { session: null }, error: null }),
        ]);
        if (!active) return;
        if (!seen) setOnboarding(true);
        const session = sessionResult.data.session;
        if (session?.user) {
          const { data: currentData, error: validationError } = await supabase.auth.getUser();
          if (validationError || !currentData.user) {
            await supabase.auth.signOut();
            if (active) {
              setAuthMode('login');
              setAuthError(`Your saved session could not be validated: ${validationError?.message ?? 'Please sign in again.'}`);
              setScreen('auth');
            }
            return;
          }
          const currentUser = currentData.user;
          if (!active) return;
          setUser({
            id: currentUser.id,
            email: currentUser.email ?? '',
            fullName:
              (currentUser.user_metadata?.full_name as string | undefined) ??
              currentUser.email?.split('@')[0] ??
              'Client',
            verified: Boolean(currentUser.email_confirmed_at),
          });
        }
        if (sessionResult.error) {
          setAuthMode('login');
          setAuthError(`Could not restore your sign-in session: ${sessionResult.error.message}`);
          setScreen('auth');
        }
      } catch (error) {
        if (active) {
          setAuthMode('login');
          setAuthError(`Could not restore your sign-in session: ${messageOf(error, 'Unknown error')}`);
          setScreen('auth');
        }
      } finally {
        if (active) setBooting(false);
      }
    };
    void initialize();
    return () => {
      active = false;
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentVersion = ++authValidationVersion.current;
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setProfilePhoto(null);
        setScreen('home');
        return;
      }
      setTimeout(() => {
        void supabase.auth.getUser().then(({ data: currentData, error }) => {
          if (currentVersion !== authValidationVersion.current) return;
          if (error || !currentData.user) {
            setUser(null);
            void supabase.auth.signOut().finally(() => {
              setAuthMode('login');
              setAuthError(`Your session could not be validated: ${error?.message ?? 'Please sign in again.'}`);
              setScreen('auth');
            });
            return;
          }
          const current = currentData.user;
          setUser({
            id: current.id,
            email: current.email ?? '',
            fullName:
              (current.user_metadata?.full_name as string | undefined) ??
              current.email?.split('@')[0] ??
              'Client',
            verified: Boolean(current.email_confirmed_at),
          });
          if (current.email_confirmed_at) {
            setAuthError('');
            setScreen('profile');
          }
        }).catch((error: unknown) => {
          if (currentVersion !== authValidationVersion.current) return;
          setUser(null);
          setAuthMode('login');
          setAuthError(`Your session could not be validated: ${messageOf(error, 'Please sign in again.')}`);
          setScreen('auth');
        });
      }, 0);
    });
    return () => {
      authValidationVersion.current += 1;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      setScreen('home');
      return true;
    });
    return () => subscription.remove();
  }, [screen]);

  useEffect(() => {
    if (!configured) return;
    void supabase.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void supabase.auth.startAutoRefresh();
      else void supabase.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, [configured]);

  const handleAuthUrl = useCallback(
    async (url: string) => {
      if (!configured) return;
      try {
        const parsed = Linking.parse(url);
        const params = parsed.queryParams ?? {};
        const code = typeof params.code === 'string' ? params.code : null;
        const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
        const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
        if (code) {
          if (handledAuthCodes.current.has(code)) return;
          handledAuthCodes.current.add(code);
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            handledAuthCodes.current.delete(code);
            throw error;
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else if (params.error_description) {
          throw new Error(String(params.error_description));
        }
        if (params.type === 'recovery' || parsed.path?.toLowerCase().includes('reset-password')) {
          setAuthMode('new-password');
          setScreen('auth');
        } else if (parsed.path?.toLowerCase().includes('verify-email')) {
          setAuthMessage('Your email link has been verified. You can now sign in.');
          setAuthMode('login');
          setScreen('auth');
        }
      } catch (error) {
        setAuthError(`Could not complete the sign-in link: ${messageOf(error, 'Please request a new link.')}`);
        setAuthMode('login');
        setScreen('auth');
      }
    },
    [configured],
  );

  useEffect(() => {
    const subscription = NativeLinking.addEventListener('url', ({ url }) => void handleAuthUrl(url));
    void NativeLinking.getInitialURL().then((url) => {
      if (url) void handleAuthUrl(url);
    });
    return () => subscription.remove();
  }, [handleAuthUrl]);

  useEffect(() => {
    if (!configured || !user?.verified) return;
    let active = true;
    const loadProfile = async () => {
      setProfileError('');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, phone_verified')
        .eq('id', user.id)
        .single();
      if (!active) return;
      if (error) {
        setProfileError(`Profile details could not be loaded: ${error.message}`);
      } else {
        setProfile(data as UserProfile);
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
        if (SUPPORT_API.baseUrl) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError || !sessionData.session) {
            setProfileError(`Could not load your profile picture: ${sessionError?.message ?? 'Sign in again.'}`);
          } else {
            try {
              const response = await fetch(`${SUPPORT_API.baseUrl}/api/profile-photo`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'get' }),
              });
              const payload = await response.json();
              if (!response.ok) throw new Error(payload.error ?? 'The photo service could not return your picture.');
              if (active) setProfilePhoto(typeof payload.photoUrl === 'string' ? payload.photoUrl : null);
            } catch (photoError) {
              if (active) setProfileError(`Could not load your profile picture: ${messageOf(photoError, 'Please retry.')}`);
            }
          }
        }
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [configured, profileRefreshVersion, user?.id, user?.verified]);

  useEffect(() => {
    if (screen !== 'assistant' || !SUPPORT_API.baseUrl) return;
    let active = true;
    fetch(`${SUPPORT_API.baseUrl}/api/support-chat`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.configured) throw new Error(result.error ?? 'AI provider is not configured.');
        if (active) setChatStatus('ready');
      })
      .catch(() => {
        if (active) setChatStatus('unavailable');
      });
    return () => {
      active = false;
    };
  }, [screen]);

  const loadTransactions = useCallback(async () => {
    if (!configured || !user?.verified) {
      setTransactionError('Sign in with a verified email to view account transactions.');
      return;
    }
    setTransactionsBusy(true);
    setTransactionError('');
    const { data, error } = await supabase
      .from('transactions')
      .select('id, transaction_date, description, amount, transaction_type, status')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(50);
    setTransactionsBusy(false);
    if (error) {
      setTransactionError(`Transaction history is not available: ${error.message}`);
      return;
    }
    setTransactions((data ?? []) as Transaction[]);
  }, [configured, user?.id, user?.verified]);

  const openTransactions = () => {
    setScreen('transactions');
    void loadTransactions();
  };

  const finishOnboarding = async () => {
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync('onboarding-complete', 'true');
    } catch (error) {
      setAuthError(`Onboarding preference could not be saved: ${messageOf(error, 'Unknown error')}`);
    }
    setOnboarding(false);
  };

  const refreshCurrent = async () => {
    setRefreshing(true);
    if (screen === 'transactions') await loadTransactions();
    if (screen === 'profile' && user?.verified) setProfileRefreshVersion((version) => version + 1);
    if (screen === 'assistant' && SUPPORT_API.baseUrl) {
      try {
        const response = await fetch(`${SUPPORT_API.baseUrl}/api/support-chat`);
        const result = await response.json();
        setChatStatus(response.ok && result.configured ? 'ready' : 'unavailable');
      } catch {
        setChatStatus('unavailable');
      }
    }
    setRefreshing(false);
  };

  const startLogin = (mode: AuthMode = 'login') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthMessage('');
    setScreen('auth');
  };

  const submitAuth = async () => {
    if (!configured) {
      setAuthError('Sign-in is not enabled yet. Add the public Supabase URL and publishable key to mobile-app/.env.');
      return;
    }
    setAuthError('');
    setAuthMessage('');
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        if (!fullName.trim()) throw new Error('Enter your full name.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const redirectTo = Linking.createURL('auth/verify-email');
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: fullName.trim(), phone: phone.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setAuthMessage('Registration submitted. Check your email and verify the address before signing in.');
        } else {
          setAuthMessage('Account created. Verify your email before using your account.');
        }
      } else if (authMode === 'reset') {
        const redirectTo = Linking.createURL('auth/reset-password');
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
        if (error) throw error;
        setAuthMessage('If the address belongs to an account, password recovery instructions have been sent.');
      } else if (authMode === 'new-password') {
        if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setAuthMessage('Password updated. Sign in with your new password.');
        setAuthMode('login');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        if (!data.user.email_confirmed_at) {
          setAuthMessage('Please verify your email using the link in your inbox before continuing.');
          return;
        }
        setScreen('profile');
      }
    } catch (error) {
      setAuthError(messageOf(error, 'Authentication could not be completed. Please try again.'));
    } finally {
      setAuthBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!configured) {
      setAuthError('Google sign-in requires a configured Supabase project and Google OAuth provider.');
      return;
    }
    setAuthError('');
    setAuthMessage('');
    setAuthBusy(true);
    try {
      const redirectTo = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Supabase did not return an OAuth sign-in URL.');
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') await handleAuthUrl(result.url);
      else if (result.type === 'cancel') setAuthMessage('Google sign-in was cancelled.');
      else if (result.type === 'dismiss') setAuthMessage('Google sign-in was closed before completion.');
    } catch (error) {
      setAuthError(`Google sign-in failed: ${messageOf(error, 'Please try again.')}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    if (!configured) return;
    setProfileError('');
    const { error } = await supabase.auth.signOut();
    if (error) setProfileError(`Could not sign out: ${error.message}`);
    else {
      setProfile(null);
      setScreen('home');
    }
  };

  const saveProfile = async () => {
    if (!configured || !user?.verified) return;
    if (!fullName.trim()) {
      setProfileError('Full name is required.');
      return;
    }
    setProfileBusy(true);
    setProfileError('');
    setProfileMessage('');
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)
      .select('id, full_name, phone, email, phone_verified')
      .single();
    setProfileBusy(false);
    if (error) setProfileError(`Profile update failed: ${error.message}`);
    else {
      setProfile(data as UserProfile);
      setProfileMessage('Your profile was updated.');
    }
  };

  const uploadPhoto = async () => {
    if (!configured || !user?.verified) return;
    if (!SUPPORT_API.baseUrl) {
      setProfileError('Photo uploads need the existing website API origin configured as EXPO_PUBLIC_API_BASE_URL.');
      return;
    }
    setProfileError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileError('Allow photo-library access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) return;
    const imageBase64 = asset.base64;
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setProfileError('Choose an image smaller than 5 MB.');
      return;
    }
    setProfileBusy(true);
    try {
      const contentType = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        throw new Error('Choose a JPG, PNG, or WebP image.');
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw sessionError ?? new Error('Please sign in again.');
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(`${user.id}/upload`, decode(imageBase64), {
          cacheControl: '0',
          contentType,
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const response = await fetch(`${SUPPORT_API.baseUrl}/api/profile-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'process' }),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.photoUrl !== 'string') {
        throw new Error(payload.error ?? 'The photo service did not return a signed profile image.');
      }
      setProfilePhoto(payload.photoUrl);
      setProfileMessage('Your profile picture was updated.');
    } catch (error) {
      setProfileError(`Photo upload failed: ${messageOf(error, 'Please try again.')}`);
    } finally {
      setProfileBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!configured || !user?.verified || !SUPPORT_API.baseUrl) return;
    setProfileBusy(true);
    setProfileError('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw error ?? new Error('Please sign in again.');
      const response = await fetch(`${SUPPORT_API.baseUrl}/api/profile-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'remove' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'The profile picture could not be removed.');
      setProfilePhoto(null);
      setProfileMessage('Your profile picture was removed.');
    } catch (error) {
      setProfileError(`Photo removal failed: ${messageOf(error, 'Please try again.')}`);
    } finally {
      setProfileBusy(false);
    }
  };

  const askAssistant = async (retryQuestion?: string) => {
    const question = (retryQuestion ?? chatInput).trim();
    if (!question || chatBusy) return;
    if (!SUPPORT_API.baseUrl) {
      setChatStatus('unavailable');
      setChatError('AI support is not configured. Set EXPO_PUBLIC_API_BASE_URL to the deployed website origin that hosts /api/support-chat.');
      return;
    }
    const historyMessages = [...chatMessages];
    if (retryQuestion) {
      const failedQuestionIndex = historyMessages.findLastIndex(
        (message) => message.role === 'user' && message.text === question,
      );
      if (failedQuestionIndex >= 0) historyMessages.splice(failedQuestionIndex, 1);
    }
    const context = historyMessages
      .filter((message) => message !== INITIAL_CHAT)
      .slice(-MAX_CHAT_HISTORY)
      .map(({ role, text }) => ({ role, text }));
    if (!retryQuestion) setChatMessages((current) => [...current, { role: 'user', text: question }]);
    setChatInput('');
    setChatError('');
    setChatBusy(true);
    try {
      const response = await fetch(`${SUPPORT_API.baseUrl}/api/support-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message: question, history: context }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || typeof result.answer !== 'string') {
        throw new Error(result.error ?? 'The AI assistant could not answer. Retry or contact official support.');
      }
      setChatStatus('ready');
      setChatMessages((current) => [...current, { role: 'assistant', text: result.answer }]);
    } catch (error) {
      const reason = messageOf(error, 'The AI service could not be reached.');
      setChatStatus('unavailable');
      setChatError(reason);
    } finally {
      setChatBusy(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const retryChat = () => {
    const lastQuestion = [...chatMessages].reverse().find((message) => message.role === 'user')?.text;
    if (lastQuestion) void askAssistant(lastQuestion);
  };

  const openContact = async (target: 'phone' | 'email' | 'whatsapp') => {
    const urls = {
      phone: `tel:${COMPANY.phone.replace(/[^\d+]/g, '')}`,
      email: `mailto:${COMPANY.email}`,
      whatsapp: COMPANY.whatsapp,
    };
    try {
      await NativeLinking.openURL(urls[target]);
    } catch (error) {
      Alert.alert('Unable to open app', messageOf(error, 'Try again or use the contact details shown.'));
    }
  };

  const title = useMemo(() => {
    const titles: Partial<Record<Screen, string>> = {
      home: 'Welcome',
      services: 'Our services',
      assistant: 'AI assistant',
      profile: 'Your account',
      notifications: 'Announcements',
      transactions: 'Transaction history',
      help: 'Help & FAQ',
      privacy: 'Privacy policy',
      terms: 'Terms & conditions',
      risk: 'Risk disclosure',
      auth: 'Secure account',
    };
    return titles[screen] ?? COMPANY.name;
  }, [screen]);

  if (booting) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <BrandMark size={70} />
        <Text style={styles.loadingBrand}>{COMPANY.name}</Text>
        <ActivityIndicator color={COLORS.gold} style={styles.loadingIndicator} />
      </SafeAreaView>
    );
  }

  if (onboarding) {
    const slides = [
      {
        icon: ShieldCheck,
        title: 'Clarity before commitment',
        body: 'Explore the company and its published services. This app does not promise returns or take custody of investment funds.',
      },
      {
        icon: BriefcaseBusiness,
        title: 'Secure account access',
        body: 'Sign in with the existing company Supabase project. Your private account information is not shown to other users.',
      },
      {
        icon: MessageCircle,
        title: 'Support in your language',
        body: 'Ask general questions in English, Hindi, or Hinglish. The AI assistant cannot access account records or provide personal financial advice.',
      },
    ];
    const SlideIcon = slides[onboardingPage].icon;
    return (
      <SafeAreaView style={styles.onboardingScreen}>
        <StatusBar style="light" />
        <View style={styles.onboardingTop}>
          <BrandMark size={58} />
          <Text style={styles.onboardingBrand}>{COMPANY.name}</Text>
        </View>
        <View style={styles.onboardingContent}>
          <View style={styles.onboardingIcon}>
            <SlideIcon color={COLORS.gold} size={44} strokeWidth={1.8} />
          </View>
          <Text style={styles.onboardingTitle}>{slides[onboardingPage].title}</Text>
          <Text style={styles.onboardingBody}>{slides[onboardingPage].body}</Text>
          <View style={styles.dots}>
            {slides.map((slide, index) => (
              <View key={slide.title} style={[styles.dot, index === onboardingPage && styles.dotActive]} />
            ))}
          </View>
        </View>
        <View style={styles.onboardingActions}>
          <Pressable onPress={() => void finishOnboarding()}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <AppButton
            label={onboardingPage === slides.length - 1 ? 'Get started' : 'Continue'}
            onPress={() => {
              if (onboardingPage === slides.length - 1) void finishOnboarding();
              else setOnboardingPage((page) => page + 1);
            }}
            icon={<ArrowRight color={COLORS.navy} size={18} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        {screen !== 'home' ? (
          <Pressable accessibilityLabel="Go back to home" onPress={() => setScreen('home')} style={styles.headerBack}>
            <ChevronLeft color={COLORS.white} size={22} />
          </Pressable>
        ) : (
          <BrandMark size={38} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{screen === 'home' ? 'Disciplined wealth management' : COMPANY.name}</Text>
        </View>
        <Pressable accessibilityLabel="Open announcements" onPress={() => setScreen('notifications')} style={styles.headerAction}>
          <Bell color={COLORS.gold} size={20} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshCurrent()} tintColor={COLORS.gold} />}
      >
        {screen === 'home' && (
          <HomeScreen
            displayName={displayName}
            user={user}
            go={setScreen}
            openAuth={() => startLogin()}
            openContact={(target) => void openContact(target)}
          />
        )}
        {screen === 'services' && <ServicesScreen go={setScreen} openContact={() => void openContact('phone')} />}
        {screen === 'assistant' && (
          <AssistantScreen
            status={chatStatus}
            messages={chatMessages}
            input={chatInput}
            busy={chatBusy}
            error={chatError}
            onChange={setChatInput}
            onSend={() => void askAssistant()}
            onRetry={retryChat}
            scrollRef={chatScrollRef}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            user={user}
            profile={profile}
            photo={profilePhoto}
            fullName={fullName}
            phone={phone}
            busy={profileBusy}
            error={profileError}
            message={profileMessage}
            openAuth={() => startLogin()}
            onName={setFullName}
            onPhone={setPhone}
            onSave={() => void saveProfile()}
            onPhoto={() => void uploadPhoto()}
            onRemovePhoto={() => void removePhoto()}
            onSignOut={() => void signOut()}
            openTransactions={openTransactions}
          />
        )}
        {screen === 'notifications' && <NotificationsScreen />}
        {screen === 'transactions' && (
          <TransactionsScreen
            items={transactions}
            error={transactionError}
            busy={transactionsBusy}
            onRetry={() => void loadTransactions()}
          />
        )}
        {screen === 'help' && <HelpScreen go={setScreen} openContact={(target) => void openContact(target)} />}
        {screen === 'privacy' && <LegalScreen kind="privacy" />}
        {screen === 'terms' && <LegalScreen kind="terms" />}
        {screen === 'risk' && <LegalScreen kind="risk" />}
        {screen === 'auth' && (
          <AuthScreen
            mode={authMode}
            error={authError}
            message={authMessage}
            busy={authBusy}
            configured={configured}
            email={email}
            password={password}
            fullName={fullName}
            phone={phone}
            newPassword={newPassword}
            setEmail={setEmail}
            setPassword={setPassword}
            setFullName={setFullName}
            setPhone={setPhone}
            setNewPassword={setNewPassword}
            onSubmit={() => void submitAuth()}
            onGoogle={() => void signInWithGoogle()}
            setMode={(mode) => {
              setAuthError('');
              setAuthMessage('');
              setAuthMode(mode);
            }}
          />
        )}
        {screen !== 'home' && screen !== 'assistant' && screen !== 'auth' && <MoneyNotice />}
      </ScrollView>
      <BottomNavigation current={screen} onChange={setScreen} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function HomeScreen({
  displayName,
  user,
  go,
  openAuth,
  openContact,
}: {
  displayName: string;
  user: { verified: boolean } | null;
  go: (screen: Screen) => void;
  openAuth: () => void;
  openContact: (target: 'phone' | 'email' | 'whatsapp') => void;
}) {
  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroTopline}>
          <Text style={styles.eyebrow}>MEHANDA ARMY INVESTMENTS PRIVATE LIMITED</Text>
          <View style={styles.heroMark}><TrendingUp size={22} color={COLORS.gold} /></View>
        </View>
        <Text style={styles.heroTitle}>{user?.verified ? `Welcome, ${displayName}` : 'Disciplined wealth. Thoughtful planning.'}</Text>
        <Text style={styles.heroBody}>
          Multi-asset portfolio planning and capital preservation information for working professionals, defence veterans, and families.
        </Text>
        <AppButton label="Explore our services" onPress={() => go('services')} icon={<ArrowRight size={17} color={COLORS.navy} />} />
        <View style={styles.heroFoot}>
          <ShieldCheck size={15} color={COLORS.gold} />
          <Text style={styles.heroFootText}>No guaranteed returns. Market-linked investments carry risk.</Text>
        </View>
      </View>

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionEyebrow}>WHAT WE DO</Text>
          <Text style={styles.sectionTitle}>Published services</Text>
        </View>
        <Pressable onPress={() => go('services')} style={styles.textLink}>
          <Text style={styles.textLinkText}>View all</Text><ChevronRight size={16} color={COLORS.gold} />
        </Pressable>
      </View>
      {SERVICES.slice(0, 2).map((service) => (
        <Pressable key={service.title} onPress={() => go('services')} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
          <View style={styles.serviceIcon}><BriefcaseBusiness color={COLORS.gold} size={21} /></View>
          <View style={styles.serviceCopy}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text numberOfLines={2} style={styles.serviceDescription}>{service.description}</Text>
          </View>
          <ChevronRight color={COLORS.muted} size={18} />
        </Pressable>
      ))}

      <ContentCard style={styles.accountCard}>
        <View style={styles.inlineIcon}><LockKeyhole color={COLORS.gold} size={20} /></View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{user?.verified ? 'Your account' : 'Secure client access'}</Text>
          <Text style={styles.bodyText}>
            {user?.verified
              ? 'Manage your profile and view available account records.'
              : 'Use the company’s existing secure account service. Email verification is required.'}
          </Text>
          <Pressable onPress={user?.verified ? () => go('profile') : openAuth} style={styles.inlineLink}>
            <Text style={styles.inlineLinkText}>{user?.verified ? 'Open profile' : 'Sign in or create account'}</Text>
            <ArrowRight size={16} color={COLORS.gold} />
          </Pressable>
        </View>
      </ContentCard>

      <ContentCard style={styles.assistantCard}>
        <View style={styles.assistantIcon}><Sparkles size={20} color={COLORS.gold} /></View>
        <Text style={styles.cardTitle}>Questions? Ask the AI assistant</Text>
        <Text style={styles.bodyText}>Dynamic answers are available only when the secure company AI service is configured.</Text>
        <AppButton label="Open assistant" secondary onPress={() => go('assistant')} icon={<MessageCircle size={17} color={COLORS.navy} />} />
      </ContentCard>

      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionEyebrow}>TALK TO US</Text>
          <Text style={styles.sectionTitle}>Official contact</Text>
        </View>
      </View>
      <ContactRow icon={Phone} title="Call" subtitle={COMPANY.phone} onPress={() => openContact('phone')} />
      <ContactRow icon={Mail} title="Email" subtitle={COMPANY.email} onPress={() => openContact('email')} />
      <ContactRow icon={MessageCircle} title="WhatsApp" subtitle="Open the official support channel" onPress={() => openContact('whatsapp')} />
      <MoneyNotice />
      <Text style={styles.footerText}>Company services and availability should be confirmed directly with official support.</Text>
      <PolicyLink label="Help, FAQ & privacy information" onPress={() => go('help')} />
    </View>
  );
}

function ServicesScreen({ go, openContact }: { go: (screen: Screen) => void; openContact: () => void }) {
  return (
    <View>
      <Text style={styles.pageIntro}>
        These descriptions reflect services published on the company website. Contact the company to confirm current availability.
      </Text>
      {SERVICES.map((service, index) => (
        <ContentCard key={service.title} style={styles.serviceDetailCard}>
          <View style={styles.serviceDetailHeader}>
            <View style={styles.serviceIcon}><Text style={styles.serviceNumber}>0{index + 1}</Text></View>
            <Text style={styles.tag}>{service.tag}</Text>
          </View>
          <Text style={styles.cardTitle}>{service.title}</Text>
          <Text style={styles.bodyText}>{service.description}</Text>
          <View style={styles.featureList}>
            {service.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Check size={16} color={COLORS.green} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </ContentCard>
      ))}
      <ContentCard>
        <Text style={styles.cardTitle}>Important information</Text>
        <Text style={styles.bodyText}>
          Website descriptions are not a guarantee of licences, regulatory status, investment performance, or product availability.
          No investment returns are guaranteed. Do not transfer funds based on app content.
        </Text>
        <AppButton label="Contact official support" onPress={openContact} icon={<Phone size={17} color={COLORS.navy} />} />
      </ContentCard>
      <Pressable onPress={() => go('notifications')} style={styles.menuRow}>
        <Bell color={COLORS.gold} size={20} /><Text style={styles.menuRowText}>Announcements</Text><ChevronRight color={COLORS.muted} size={18} />
      </Pressable>
    </View>
  );
}

function AssistantScreen({
  status,
  messages,
  input,
  busy,
  error,
  onChange,
  onSend,
  onRetry,
  scrollRef,
}: {
  status: 'checking' | 'ready' | 'unavailable';
  messages: ChatMessage[];
  input: string;
  busy: boolean;
  error: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
  scrollRef: React.RefObject<React.ElementRef<typeof ScrollView> | null>;
}) {
  return (
    <View style={styles.assistantScreen}>
      <ContentCard style={styles.chatNotice}>
        <View style={styles.chatStatusRow}>
          <View style={[styles.statusDot, status === 'ready' && styles.statusDotReady]} />
          <Text style={styles.cardTitle}>
            {status === 'checking' ? 'Checking secure AI service' : status === 'ready' ? 'Secure AI service available' : 'AI service unavailable'}
          </Text>
        </View>
        <Text style={styles.bodyText}>
          {status === 'unavailable'
            ? 'The real AI endpoint or its server-side provider key is not configured. No automated or demo response will be shown.'
            : 'Ask general company questions in Hindi, English, or Hinglish. Do not send passwords, OTPs, PINs, bank details, or identity numbers.'}
        </Text>
      </ContentCard>
      {!SUPPORT_API.baseUrl && <ErrorBanner text="Setup required: configure EXPO_PUBLIC_API_BASE_URL with the deployed website origin that serves /api/support-chat." />}
      <ScrollView
        ref={scrollRef}
        style={styles.chatFeed}
        contentContainerStyle={styles.chatFeedContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View key={`${message.role}-${index}`} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
            <Text style={[styles.bubbleText, message.role === 'user' && styles.userBubbleText]}>{message.text}</Text>
          </View>
        ))}
        {busy && (
          <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color={COLORS.gold} />
            <Text style={styles.bodyText}>Waiting for the AI response…</Text>
          </View>
        )}
      </ScrollView>
      {error ? (
        <View style={styles.errorBlock}>
          <ErrorBanner text={error} />
          <AppButton label="Retry last question" secondary onPress={onRetry} icon={<RefreshCw size={17} color={COLORS.navy} />} />
        </View>
      ) : null}
      <View style={styles.chatComposer}>
        <TextInput
          accessibilityLabel="Ask a general question"
          editable={!busy}
          multiline
          onChangeText={onChange}
          onSubmitEditing={onSend}
          placeholder="Ask a general question…"
          placeholderTextColor="#8B95A3"
          style={styles.chatInput}
          value={input}
        />
        <Pressable accessibilityLabel="Send question" disabled={busy || !input.trim()} onPress={onSend} style={[styles.sendButton, (busy || !input.trim()) && styles.buttonDisabled]}>
          {busy ? <ActivityIndicator size="small" color={COLORS.navy} /> : <Send size={18} color={COLORS.navy} />}
        </Pressable>
      </View>
    </View>
  );
}

function ProfileScreen({
  user,
  profile,
  photo,
  fullName,
  phone,
  busy,
  error,
  message,
  openAuth,
  onName,
  onPhone,
  onSave,
  onPhoto,
  onRemovePhoto,
  onSignOut,
  openTransactions,
}: {
  user: { id: string; email: string; verified: boolean } | null;
  profile: UserProfile | null;
  photo: string | null;
  fullName: string;
  phone: string;
  busy: boolean;
  error: string;
  message: string;
  openAuth: () => void;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onSave: () => void;
  onPhoto: () => void;
  onRemovePhoto: () => void;
  onSignOut: () => void;
  openTransactions: () => void;
}) {
  if (!user) {
    return (
      <ContentCard style={styles.authGate}>
        <View style={styles.gateIcon}><LockKeyhole color={COLORS.gold} size={26} /></View>
        <Text style={styles.cardTitle}>Sign in to your account</Text>
        <Text style={styles.bodyText}>Your private profile and transaction records require an email-verified account.</Text>
        {!isSupabaseConfigured && <ErrorBanner text="Supabase is not configured. Add the public Supabase URL and publishable key in mobile-app/.env." />}
        <AppButton label="Sign in or create account" onPress={openAuth} icon={<ArrowRight size={17} color={COLORS.navy} />} />
      </ContentCard>
    );
  }
  if (!user.verified) {
    return (
      <ContentCard style={styles.authGate}>
        <View style={styles.gateIcon}><Mail color={COLORS.gold} size={26} /></View>
        <Text style={styles.cardTitle}>Verify your email address</Text>
        <Text style={styles.bodyText}>A verified email is required before this app can display or update your account information.</Text>
        <Text style={styles.mutedValue}>{user.email}</Text>
        <ErrorBanner text="Open the verification link in your email. If it does not open the app, complete verification in the existing website." />
      </ContentCard>
    );
  }
  return (
    <View>
      <ContentCard style={styles.profileHero}>
        <View style={styles.avatar}>
          {photo ? <Image source={{ uri: photo }} style={styles.avatarImage} /> : <UserRound color={COLORS.gold} size={31} />}
        </View>
        <Text style={styles.profileName}>{profile?.full_name || fullName || 'Client'}</Text>
        <Text style={styles.profileEmail}>{profile?.email || user.email}</Text>
        <View style={styles.verifiedBadge}><ShieldCheck size={14} color={COLORS.green} /><Text style={styles.verifiedText}>Email verified</Text></View>
        <View style={styles.profilePhotoActions}>
          <AppButton label={busy ? 'Please wait…' : 'Change photo'} disabled={busy} secondary onPress={onPhoto} />
          {photo ? <Pressable disabled={busy} onPress={onRemovePhoto} style={styles.textLink}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
        </View>
        <Text style={styles.photoHint}>JPG, PNG, or WebP • maximum 5 MB. Images are processed by the company’s private photo service.</Text>
      </ContentCard>
      <ContentCard>
        <Text style={styles.cardTitle}>Personal details</Text>
        {profile ? (
          <>
            <Field label="Full name" value={fullName} onChangeText={onName} placeholder="Your full name" autoCapitalize="words" />
            <Field label="Phone (optional)" value={phone} onChangeText={onPhone} placeholder="Phone number" keyboardType="phone-pad" />
            <Text style={styles.photoHint}>Phone numbers are not OTP-verified by the current website service.</Text>
            <AppButton label={busy ? 'Saving…' : 'Save profile'} disabled={busy} onPress={onSave} icon={<Check size={17} color={COLORS.navy} />} />
          </>
        ) : (
          <Text style={styles.bodyText}>Loading your profile from the company database… If it remains unavailable, refresh this screen.</Text>
        )}
        {error ? <ErrorBanner text={error} /> : null}
        {message ? <SuccessBanner text={message} /> : null}
      </ContentCard>
      <Pressable onPress={openTransactions} style={styles.menuRow}>
        <FileText color={COLORS.gold} size={20} /><Text style={styles.menuRowText}>Transaction history</Text><ChevronRight color={COLORS.muted} size={18} />
      </Pressable>
      <AppButton label="Sign out" secondary onPress={onSignOut} icon={<LogOut size={17} color={COLORS.navy} />} />
    </View>
  );
}

function NotificationsScreen() {
  return (
    <View>
      <ContentCard style={styles.announcementCard}>
        <View style={styles.announcementIcon}><Bell color={COLORS.gold} size={21} /></View>
        <Text style={styles.eyebrow}>COMPANY INFORMATION</Text>
        <Text style={styles.cardTitle}>Student Small Loan — Coming Soon</Text>
        <Text style={styles.bodyText}>
          The website describes the Student Small Loan as a proposed service marked “Coming Soon.” Applications, approvals, and disbursements are not currently available. Do not send identity documents or payments through chat.
        </Text>
        <Text style={styles.photoHint}>This is public company information, not a personal notification.</Text>
      </ContentCard>
      <ContentCard>
        <Text style={styles.cardTitle}>No other announcements</Text>
        <Text style={styles.bodyText}>There is no configured live announcements feed in the existing backend. This screen will not invent personal notifications.</Text>
      </ContentCard>
    </View>
  );
}

function TransactionsScreen({
  items,
  error,
  busy,
  onRetry,
}: {
  items: Transaction[];
  error: string;
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <View>
      <ContentCard style={styles.transactionNotice}>
        <ShieldCheck color={COLORS.gold} size={19} />
        <Text style={styles.bodyText}>This screen reads existing rows from the user-scoped Supabase transactions table. The database enforces row-level access policies.</Text>
      </ContentCard>
      {busy ? (
        <View style={styles.inlineLoading}><ActivityIndicator color={COLORS.gold} /><Text style={styles.bodyText}>Loading records…</Text></View>
      ) : error ? (
        <View><ErrorBanner text={error} /><AppButton label="Retry" secondary onPress={onRetry} icon={<RefreshCw size={16} color={COLORS.navy} />} /></View>
      ) : items.length === 0 ? (
        <ContentCard style={styles.emptyState}>
          <View style={styles.gateIcon}><FileText color={COLORS.gold} size={25} /></View>
          <Text style={styles.cardTitle}>No transaction records</Text>
          <Text style={styles.bodyText}>No records were returned for your verified account. This app will not create sample transactions or receipts.</Text>
        </ContentCard>
      ) : (
        items.map((item) => {
          const positive = ['sip_contribution', 'lumpsum_investment', 'dividend'].includes(item.transaction_type ?? '');
          return (
            <ContentCard key={item.id} style={styles.transactionCard}>
              <View style={[styles.transactionIcon, positive ? styles.transactionPositive : styles.transactionNeutral]}>
                {positive ? <ArrowDownLeft size={18} color={COLORS.green} /> : <ArrowUpRight size={18} color={COLORS.navySoft} />}
              </View>
              <View style={styles.transactionCopy}>
                <Text style={styles.transactionTitle}>{item.description}</Text>
                <Text style={styles.photoHint}>{new Date(item.transaction_date).toLocaleDateString()} · {item.status}</Text>
              </View>
              <Text style={styles.transactionAmount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>
            </ContentCard>
          );
        })
      )}
      <Text style={styles.footerText}>Downloadable receipts are not exposed by the verified backend for this mobile app.</Text>
    </View>
  );
}

function HelpScreen({
  go,
  openContact,
}: {
  go: (screen: Screen) => void;
  openContact: (target: 'phone' | 'email' | 'whatsapp') => void;
}) {
  return (
    <View>
      <ContentCard>
        <View style={styles.inlineIcon}><CircleHelp color={COLORS.gold} size={20} /></View>
        <Text style={styles.cardTitle}>Frequently asked questions</Text>
        {FAQS.map((item) => (
          <View key={item.question} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.bodyText}>{item.answer}</Text>
          </View>
        ))}
      </ContentCard>
      <ContentCard>
        <Text style={styles.cardTitle}>Official support</Text>
        <Text style={styles.bodyText}>Monday–Saturday, 9:30 AM–6:30 PM IST (as listed on the company website).</Text>
        <ContactRow icon={Phone} title="Call" subtitle={COMPANY.phone} onPress={() => openContact('phone')} />
        <ContactRow icon={Mail} title="Email" subtitle={COMPANY.email} onPress={() => openContact('email')} />
        <ContactRow icon={MessageCircle} title="WhatsApp" subtitle="Message official support" onPress={() => openContact('whatsapp')} />
      </ContentCard>
      <ContentCard>
        <Text style={styles.cardTitle}>Policies</Text>
        <PolicyLink label="Privacy policy" onPress={() => go('privacy')} />
        <PolicyLink label="Terms & conditions" onPress={() => go('terms')} />
        <PolicyLink label="Risk disclosure" onPress={() => go('risk')} />
      </ContentCard>
    </View>
  );
}

function LegalScreen({ kind }: { kind: 'privacy' | 'terms' | 'risk' }) {
  const content = LEGAL_CONTENT[kind];
  return (
    <View>
      <ContentCard style={styles.legalHeader}>
        <FileText color={COLORS.gold} size={22} />
        <Text style={styles.cardTitle}>{content.title}</Text>
        <Text style={styles.photoHint}>Company website policy summary</Text>
      </ContentCard>
      {content.sections.map((section) => (
        <ContentCard key={section.title}>
          <Text style={styles.faqQuestion}>{section.title}</Text>
          <Text style={styles.bodyText}>{section.body}</Text>
        </ContentCard>
      ))}
      {kind === 'risk' && <MoneyNotice />}
    </View>
  );
}

function AuthScreen({
  mode,
  error,
  message,
  busy,
  configured,
  email,
  password,
  fullName,
  phone,
  newPassword,
  setEmail,
  setPassword,
  setFullName,
  setPhone,
  setNewPassword,
  onSubmit,
  onGoogle,
  setMode,
}: {
  mode: AuthMode;
  error: string;
  message: string;
  busy: boolean;
  configured: boolean;
  email: string;
  password: string;
  fullName: string;
  phone: string;
  newPassword: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setFullName: (value: string) => void;
  setPhone: (value: string) => void;
  setNewPassword: (value: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
  setMode: (mode: AuthMode) => void;
}) {
  const titles: Record<AuthMode, string> = {
    login: 'Welcome back',
    signup: 'Create your account',
    reset: 'Reset your password',
    'new-password': 'Choose a new password',
  };
  const labels: Record<AuthMode, string> = {
    login: 'Sign in securely',
    signup: 'Create account',
    reset: 'Send recovery email',
    'new-password': 'Update password',
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ContentCard style={styles.authCard}>
        <View style={styles.authLogo}><BrandMark size={52} /></View>
        <Text style={styles.authTitle}>{titles[mode]}</Text>
        <Text style={styles.bodyText}>
          {mode === 'signup'
            ? 'Accounts use the existing Supabase Auth project. Email verification is required.'
            : mode === 'new-password'
              ? 'Use the recovery link sent by Supabase to set a new password.'
              : 'Your sign-in is handled by the company’s existing secure account service.'}
        </Text>
        {!configured ? <ErrorBanner text="Backend setup required. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to mobile-app/.env." /> : null}
        {mode === 'signup' ? (
          <>
            <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          </>
        ) : null}
        {mode !== 'new-password' ? (
          <Field label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" />
        ) : null}
        {mode === 'login' || mode === 'signup' ? (
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry />
        ) : null}
        {mode === 'new-password' ? (
          <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="At least 8 characters" secureTextEntry />
        ) : null}
        {error ? <ErrorBanner text={error} /> : null}
        {message ? <SuccessBanner text={message} /> : null}
        <AppButton label={busy ? 'Please wait…' : labels[mode]} disabled={busy || !configured} onPress={onSubmit} icon={busy ? <ActivityIndicator color={COLORS.navy} /> : <LockKeyhole size={17} color={COLORS.navy} />} />
        {mode === 'login' ? (
          <>
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
            <AppButton label="Continue with Google" secondary disabled={busy || !configured} onPress={onGoogle} icon={<Text style={styles.googleG}>G</Text>} />
            <Pressable onPress={() => setMode('reset')} style={styles.centerLink}><Text style={styles.inlineLinkText}>Forgot password?</Text></Pressable>
            <Pressable onPress={() => setMode('signup')} style={styles.centerLink}><Text style={styles.bodyText}>New here? <Text style={styles.inlineLinkText}>Create an account</Text></Text></Pressable>
          </>
        ) : null}
        {mode === 'signup' ? (
          <Pressable onPress={() => setMode('login')} style={styles.centerLink}><Text style={styles.bodyText}>Already registered? <Text style={styles.inlineLinkText}>Sign in</Text></Text></Pressable>
        ) : null}
        {mode === 'reset' || mode === 'new-password' ? (
          <Pressable onPress={() => setMode('login')} style={styles.centerLink}><Text style={styles.inlineLinkText}>Back to sign in</Text></Pressable>
        ) : null}
        <Text style={styles.photoHint}>Never share your password, OTP, recovery link, or bank credentials with anyone.</Text>
      </ContentCard>
    </KeyboardAvoidingView>
  );
}

function ContactRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: {
  icon: typeof Phone;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.contactRow, pressed && styles.pressed]}>
      <View style={styles.contactIcon}><Icon size={18} color={COLORS.gold} /></View>
      <View style={styles.flex}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactSubtitle}>{subtitle}</Text>
      </View>
      <ArrowRight color={COLORS.muted} size={17} />
    </Pressable>
  );
}

function PolicyLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.policyLink}>
      <Text style={styles.bodyText}>{label}</Text><ChevronRight color={COLORS.muted} size={17} />
    </Pressable>
  );
}

function BottomNavigation({ current, onChange }: { current: Screen; onChange: (screen: Screen) => void }) {
  const items = [
    { screen: 'home' as const, label: 'Home', icon: Home },
    { screen: 'services' as const, label: 'Services', icon: BriefcaseBusiness },
    { screen: 'assistant' as const, label: 'AI support', icon: MessageCircle },
    { screen: 'profile' as const, label: 'Account', icon: UserRound },
  ];
  return (
    <View style={styles.bottomNav}>
      {items.map(({ screen, label, icon: Icon }) => {
        const active = current === screen;
        return (
          <Pressable key={screen} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => onChange(screen)} style={styles.tab}>
            <Icon color={active ? COLORS.gold : '#9AA6B5'} size={20} strokeWidth={active ? 2.3 : 1.8} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <View style={styles.errorBanner}>
      <X size={16} color={COLORS.red} />
      <Text style={styles.errorText}>{text}</Text>
    </View>
  );
}

function SuccessBanner({ text }: { text: string }) {
  return (
    <View style={styles.successBanner}>
      <Check size={16} color={COLORS.green} />
      <Text style={styles.successText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.paper },
  loadingScreen: { flex: 1, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  loadingBrand: { color: COLORS.white, fontSize: 16, fontWeight: '800', letterSpacing: 1.1, marginTop: 16, textAlign: 'center' },
  loadingIndicator: { marginTop: 28 },
  header: { minHeight: 74, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navy },
  headerBack: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#142640', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerText: { flex: 1, marginLeft: 11 },
  headerTitle: { color: COLORS.white, fontSize: 17, fontWeight: '800' },
  headerSubtitle: { color: '#A8B4C4', fontSize: 10, marginTop: 3, letterSpacing: 0.25 },
  headerAction: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#142640', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  brandMark: { backgroundColor: '#12243A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334156' },
  scrollContent: { padding: 18, paddingBottom: 34 },
  hero: { borderRadius: 25, padding: 22, backgroundColor: COLORS.navy, marginBottom: 27 },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: COLORS.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  heroMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#182A41', borderWidth: 1, borderColor: '#38465A' },
  heroTitle: { color: COLORS.white, fontSize: 27, fontWeight: '800', lineHeight: 34, marginTop: 20, letterSpacing: -0.5 },
  heroBody: { color: '#C4CDD8', fontSize: 13, lineHeight: 20, marginTop: 11, marginBottom: 20 },
  button: { minHeight: 47, paddingHorizontal: 17, borderRadius: 14, backgroundColor: COLORS.gold, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 13 },
  buttonSecondary: { backgroundColor: '#F4E9CD', borderWidth: 1, borderColor: '#E9D7AA' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORS.navy, fontSize: 13, fontWeight: '800' },
  buttonTextSecondary: { color: COLORS.navy },
  pressed: { opacity: 0.78 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 17 },
  heroFootText: { color: '#C5CED8', fontSize: 10, flex: 1 },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 7, marginBottom: 12 },
  sectionEyebrow: { color: COLORS.gold, fontWeight: '800', letterSpacing: 1.5, fontSize: 9 },
  sectionTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '800', marginTop: 4 },
  textLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  textLinkText: { color: COLORS.navySoft, fontWeight: '700', fontSize: 12 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  serviceIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#FBF7EC', alignItems: 'center', justifyContent: 'center' },
  serviceCopy: { flex: 1, marginHorizontal: 12 },
  serviceTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  serviceDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  card: { backgroundColor: COLORS.white, borderRadius: 19, padding: 17, borderWidth: 1, borderColor: COLORS.border, marginBottom: 13 },
  accountCard: { marginTop: 9, flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  inlineIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7EC' },
  cardTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '800', lineHeight: 21, marginBottom: 5 },
  bodyText: { color: '#586578', fontSize: 12, lineHeight: 18 },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  inlineLinkText: { color: COLORS.navySoft, fontSize: 12, fontWeight: '800' },
  assistantCard: { padding: 19 },
  assistantIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderRadius: 15, backgroundColor: COLORS.navy, marginTop: 14 },
  noticeText: { color: '#E5EAF1', fontSize: 10, lineHeight: 15, flex: 1 },
  footerText: { color: COLORS.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginVertical: 16 },
  pageIntro: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  serviceDetailCard: { padding: 18 },
  serviceDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  serviceNumber: { color: COLORS.navySoft, fontSize: 12, fontWeight: '900' },
  tag: { color: COLORS.navySoft, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, backgroundColor: '#F1F4F7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  featureList: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 13, paddingTop: 11, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { flex: 1, color: '#354255', fontSize: 11, lineHeight: 17 },
  assistantScreen: { height: '100%', minHeight: 480 },
  chatNotice: { padding: 14, marginBottom: 12 },
  chatStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D68A28' },
  statusDotReady: { backgroundColor: COLORS.green },
  chatFeed: { flex: 1, minHeight: 215 },
  chatFeedContent: { paddingVertical: 8, gap: 10 },
  bubble: { maxWidth: '88%', paddingHorizontal: 13, paddingVertical: 11, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.navy },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { color: COLORS.ink, fontSize: 12, lineHeight: 18 },
  userBubbleText: { color: COLORS.white },
  typingBubble: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  chatComposer: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 8, marginTop: 9, backgroundColor: COLORS.white, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border },
  chatInput: { flex: 1, color: COLORS.ink, fontSize: 13, lineHeight: 18, maxHeight: 90, paddingHorizontal: 9, paddingVertical: 8 },
  sendButton: { width: 41, height: 41, borderRadius: 13, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  errorBlock: { marginTop: 8 },
  fieldWrap: { marginTop: 14 },
  fieldLabel: { color: COLORS.ink, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  input: { minHeight: 47, borderRadius: 12, borderWidth: 1, borderColor: '#D8DEE6', paddingHorizontal: 13, color: COLORS.ink, fontSize: 13, backgroundColor: '#FCFCFD' },
  authGate: { alignItems: 'center', padding: 23 },
  gateIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7EC', marginBottom: 13 },
  mutedValue: { color: COLORS.ink, fontWeight: '700', fontSize: 13, marginVertical: 8 },
  profileHero: { alignItems: 'center', paddingTop: 22 },
  avatar: { width: 75, height: 75, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.navy, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.gold },
  avatarImage: { width: '100%', height: '100%' },
  profileName: { color: COLORS.ink, fontSize: 18, fontWeight: '800', marginTop: 11 },
  profileEmail: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#E8F6F1', borderRadius: 20, marginTop: 9 },
  verifiedText: { color: COLORS.green, fontWeight: '700', fontSize: 10 },
  profilePhotoActions: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  photoHint: { color: COLORS.muted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  removeText: { color: COLORS.red, fontSize: 12, fontWeight: '700' },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3F2', borderColor: '#FECDCA', borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 11 },
  errorText: { flex: 1, color: '#912018', fontSize: 11, lineHeight: 16 },
  successBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#ECFDF3', borderColor: '#ABEFC6', borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 11 },
  successText: { flex: 1, color: '#067647', fontSize: 11, lineHeight: 16 },
  menuRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 11 },
  menuRowText: { flex: 1, color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  announcementCard: { overflow: 'hidden', borderTopWidth: 3, borderTopColor: COLORS.gold },
  announcementIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  transactionNotice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  inlineLoading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 28 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  transactionIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  transactionPositive: { backgroundColor: '#E8F6F1' },
  transactionNeutral: { backgroundColor: '#EFF2F6' },
  transactionCopy: { flex: 1 },
  transactionTitle: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  transactionAmount: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  faqItem: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 12 },
  faqQuestion: { color: COLORS.ink, fontSize: 13, fontWeight: '800', lineHeight: 18, marginBottom: 5 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0F4' },
  contactIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  contactTitle: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  contactSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  policyLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 43, borderTopWidth: 1, borderTopColor: '#EEF0F4' },
  legalHeader: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  authCard: { padding: 19 },
  authLogo: { alignItems: 'center', marginBottom: 8 },
  authTitle: { color: COLORS.ink, fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 5 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { color: COLORS.muted, fontSize: 11 },
  googleG: { color: '#4285F4', fontWeight: '900', fontSize: 18 },
  centerLink: { alignItems: 'center', marginTop: 15 },
  bottomNav: { minHeight: 67, borderTopColor: '#E5E8ED', borderTopWidth: 1, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 9, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabLabel: { color: '#8E99A8', fontSize: 9, fontWeight: '600' },
  tabLabelActive: { color: COLORS.navy, fontWeight: '800' },
  onboardingScreen: { flex: 1, backgroundColor: COLORS.navy, padding: 25, justifyContent: 'space-between' },
  onboardingTop: { alignItems: 'center', marginTop: 30 },
  onboardingBrand: { color: COLORS.white, fontSize: 13, textAlign: 'center', fontWeight: '800', letterSpacing: 1, marginTop: 13 },
  onboardingContent: { alignItems: 'center', paddingHorizontal: 8 },
  onboardingIcon: { width: 94, height: 94, borderRadius: 31, backgroundColor: '#15283F', borderColor: '#34445A', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  onboardingTitle: { color: COLORS.white, fontSize: 26, lineHeight: 33, fontWeight: '900', textAlign: 'center' },
  onboardingBody: { color: '#C3CEDB', fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: 13 },
  dots: { flexDirection: 'row', gap: 7, marginTop: 28 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#475569' },
  dotActive: { width: 22, backgroundColor: COLORS.gold },
  onboardingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  skipText: { color: '#C3CEDB', fontSize: 13, fontWeight: '700', padding: 10 },
});
