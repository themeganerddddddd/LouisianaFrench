import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

// Three sign-in modal variants, switchable via ?signInVariant=card|sheet|menu.
// card — Task card. sheet — Provider sheet. menu — Account list.

const PROTOTYPE = process.env.NODE_ENV !== 'production';
const VARIANTS = [
  { id: 'card', name: 'Task card' },
  { id: 'sheet', name: 'Provider sheet' },
  { id: 'menu', name: 'Account list' }
];
const EMPTY = { email: '', password: '', displayName: '' };

function readVariant() {
  const search = globalThis.location?.search || '';
  const match = search.match(/[?&]signInVariant=(card|sheet|menu)/);
  return match ? match[1] : 'card';
}

function writeVariant(id) {
  if (!globalThis.history?.replaceState || !globalThis.location) return;
  const url = new URL(globalThis.location.href);
  url.searchParams.set('signInVariant', id);
  globalThis.history.replaceState(null, '', url);
}

export default function SignInModal({
  visible,
  identity,
  accentColor = '#2771CB',
  connector,
  onClose
}) {
  const [mode, setMode] = useState('signIn');
  const [fields, setFields] = useState(EMPTY);
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState(readVariant);
  const [menuStep, setMenuStep] = useState('list');
  const shownVariant = PROTOTYPE ? variant : 'card';

  useEffect(() => {
    if (!visible) {
      setFields(EMPTY);
      setMessage('');
      setMode('signIn');
      setMenuStep('list');
    }
  }, [visible]);

  useEffect(() => {
    if (!PROTOTYPE || typeof window?.addEventListener !== 'function') return undefined;
    function onKey(event) {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      cycle(event.key === 'ArrowRight' ? 1 : -1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function close() {
    setFields(EMPTY);
    setMessage('');
    onClose();
  }

  function setField(key, value) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function cycle(direction) {
    const index = VARIANTS.findIndex((item) => item.id === variant);
    const next = VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length];
    setVariant(next.id);
    setMenuStep('list');
    writeVariant(next.id);
  }

  async function submit() {
    const email = fields.email.trim();
    const password = fields.password;
    let result;
    if (mode === 'create') {
      result = await connector.signUpWithPassword({
        email,
        password,
        displayName: fields.displayName.trim()
      });
    } else if (mode === 'reset') {
      result = await connector.sendPasswordReset(email);
      setMessage(result.message || 'Check your email.');
      return;
    } else {
      result = await connector.signInWithPassword({ email, password });
    }

    if (result.identity) {
      close();
      return;
    }
    setMessage(result.message || 'Sign-in failed.');
    setFields((current) => ({ ...current, password: '' }));
  }

  async function continueWith(provider) {
    const result = await connector.signInWithProvider(provider);
    if (result.identity) {
      close();
      return;
    }
    if (result.message) setMessage(result.message);
  }

  async function signOut() {
    await connector.signOut();
    close();
  }

  const form = {
    mode,
    setMode,
    fields,
    setField,
    message,
    accentColor,
    onSubmit: submit,
    onProvider: continueWith,
    onSignOut: signOut,
    identity,
    onClose: close,
    menuStep,
    showForm: () => setMenuStep('form')
  };
  const shellStyle = shownVariant === 'sheet' ? styles.sheetBackdrop : styles.backdrop;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={shellStyle} onPress={close} testID="sign-in-backdrop">
        <Pressable onPress={() => {}} testID="sign-in-modal">
          {shownVariant === 'sheet' ? <ProviderSheet {...form} /> : null}
          {shownVariant === 'menu' ? <AccountList {...form} /> : null}
          {shownVariant === 'card' ? <TaskCard {...form} /> : null}
        </Pressable>
        {PROTOTYPE ? (
          <Pressable onPress={() => {}} style={styles.switcher}>
            <Pressable accessibilityLabel="Previous sign-in style" onPress={() => cycle(-1)} style={styles.switcherArrow}>
              <Text style={styles.switcherArrowLabel}>‹</Text>
            </Pressable>
            <Text style={styles.switcherLabel}>
              {shownVariant} — {VARIANTS.find((item) => item.id === shownVariant).name}
            </Text>
            <Pressable accessibilityLabel="Next sign-in style" onPress={() => cycle(1)} style={styles.switcherArrow}>
              <Text style={styles.switcherArrowLabel}>›</Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function TaskCard(props) {
  return (
    <View style={styles.card}>
      <Header {...props} />
      {props.identity ? <SignedIn {...props} /> : (
        <View>
          <ModeSwitch {...props} />
          <EmailForm {...props} />
          <Text style={styles.or}>or</Text>
          <Providers {...props} />
        </View>
      )}
    </View>
  );
}

function ProviderSheet(props) {
  return (
    <View style={styles.sheet}>
      <Header {...props} />
      {props.identity ? <SignedIn {...props} /> : (
        <View>
          <Providers {...props} />
          <Text style={styles.or}>Use email</Text>
          <ModeSwitch {...props} />
          <EmailForm {...props} />
        </View>
      )}
    </View>
  );
}

function AccountList(props) {
  if (props.identity) {
    return (
      <View style={styles.menuPanel}>
        <Header {...props} />
        <SignedIn {...props} />
      </View>
    );
  }
  if (props.menuStep === 'list') {
    const rows = [
      ['google', 'Continue with Google', 'sign-in-google', () => props.onProvider('google')],
      ['facebook', 'Continue with Facebook', 'sign-in-facebook', () => props.onProvider('facebook')],
      ['signIn', 'Sign in with email', 'sign-in-email-mode', () => { props.setMode('signIn'); props.showForm(); }],
      ['create', 'Create an account', 'sign-in-create-mode', () => { props.setMode('create'); props.showForm(); }],
      ['reset', 'Reset password', 'sign-in-reset-mode', () => { props.setMode('reset'); props.showForm(); }]
    ];
    return (
      <View style={styles.menuPanel}>
        <Header {...props} title="Account" />
        {rows.map(([key, label, testID, onPress]) => (
          <Pressable key={key} testID={testID} accessibilityRole="button" onPress={onPress} style={styles.menuRow}>
            <Text style={styles.menuLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.menuPanel}>
      <Header {...props} />
      <EmailForm {...props} />
    </View>
  );
}

function Header({ mode, onClose, title }) {
  const heading = title || (
    mode === 'create' ? 'Create an account' : mode === 'reset' ? 'Reset password' : 'Sign in'
  );
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{heading}</Text>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close sign in">
        <Text style={styles.close}>Close</Text>
      </Pressable>
    </View>
  );
}

function SignedIn({ identity, onSignOut, accentColor }) {
  return (
    <View>
      <Text style={styles.note}>Signed in on this device.</Text>
      <Text style={styles.name}>{identity.displayName}</Text>
      <Pressable onPress={onSignOut} testID="sign-out" accessibilityRole="button" style={styles.secondaryButton}>
        <Text style={[styles.secondaryLabel, { color: accentColor }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function ModeSwitch({ mode, setMode, accentColor }) {
  const modes = [
    ['signIn', 'Sign in', 'sign-in-email-mode'],
    ['create', 'Create', 'sign-in-create-mode'],
    ['reset', 'Reset', 'sign-in-reset-mode']
  ];
  return (
    <View style={styles.segments}>
      {modes.map(([id, label, testID]) => {
        const selected = mode === id;
        return (
          <Pressable
            key={id}
            testID={testID}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setMode(id)}
            style={[styles.segment, selected && { backgroundColor: accentColor, borderColor: accentColor }]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function EmailForm({ mode, fields, setField, message, accentColor, onSubmit }) {
  const label = mode === 'create' ? 'Create an account' : mode === 'reset' ? 'Send reset email' : 'Sign in';
  return (
    <View>
      {mode === 'create' ? (
        <TextInput
          testID="sign-in-display-name"
          value={fields.displayName}
          onChangeText={(displayName) => setField('displayName', displayName)}
          placeholder="Display name"
          placeholderTextColor="#64748B"
          autoCapitalize="words"
          style={styles.input}
        />
      ) : null}
      <TextInput
        testID="sign-in-email"
        value={fields.email}
        onChangeText={(email) => setField('email', email)}
        placeholder="Email"
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      {mode === 'reset' ? null : (
        <TextInput
          testID="sign-in-password"
          value={fields.password}
          onChangeText={(password) => setField('password', password)}
          placeholder="Password"
          placeholderTextColor="#64748B"
          secureTextEntry
          style={styles.input}
        />
      )}
      {message ? <Text testID="sign-in-message" style={styles.message}>{message}</Text> : null}
      <Pressable onPress={onSubmit} testID="sign-in-submit" accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: accentColor }]}>
        <Text style={styles.primaryLabel}>{label}</Text>
      </Pressable>
    </View>
  );
}

function Providers({ onProvider }) {
  return (
    <View>
      <Pressable onPress={() => onProvider('google')} testID="sign-in-google" accessibilityRole="button" style={styles.secondaryButton}>
        <Text style={styles.secondaryLabel}>Continue with Google</Text>
      </Pressable>
      <Pressable onPress={() => onProvider('facebook')} testID="sign-in-facebook" accessibilityRole="button" style={styles.secondaryButton}>
        <Text style={styles.secondaryLabel}>Continue with Facebook</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.45)',
    justifyContent: 'center',
    padding: 24
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.45)',
    justifyContent: 'flex-end'
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18
  },
  sheet: {
    backgroundColor: '#F4F7FB',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    paddingBottom: 88
  },
  menuPanel: {
    alignSelf: 'flex-start',
    width: 280,
    marginTop: 72,
    marginLeft: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  title: {
    flex: 1,
    color: '#102A43',
    fontSize: 18,
    fontWeight: '900'
  },
  close: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 8,
    paddingLeft: 12
  },
  name: {
    color: '#102A43',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12
  },
  note: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  segments: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12
  },
  segment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  segmentLabel: {
    color: '#102A43',
    fontSize: 12,
    fontWeight: '700'
  },
  segmentLabelOn: {
    color: '#FFFFFF'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    color: '#102A43',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8
  },
  message: {
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  or: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 12
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  secondaryLabel: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '800'
  },
  menuRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  menuLabel: {
    color: '#102A43',
    fontSize: 15,
    fontWeight: '800'
  },
  switcher: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#102A43',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  switcherArrow: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  switcherArrowLabel: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700'
  },
  switcherLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8
  }
});
