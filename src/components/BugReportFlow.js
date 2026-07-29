import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { openBugReportEmail, validateBugReportForm } from '../utils/bugReport';
import { collectDeviceInfo } from '../utils/deviceInfo';

const CONSENT_FIELDS = [
  ['Phone make and model', 'e.g. Samsung \u00B7 Galaxy S23'],
  ['Operating system', 'Android / iOS name and version'],
  ['OS build ID', 'Closest equivalent to firmware version'],
  ['App version', 'From the installed app build'],
  ['Device type', 'Phone, tablet, or web'],
  ['App context', 'Selected language, screen name, time sent'],
];

export default function BugReportFlow({ visible, onClose, screenName, language, accentColor }) {
  const [stage, setStage] = useState('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef();
  const emailInputRef = useRef();
  const descInputRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const swayAnim = useRef(new Animated.Value(0)).current;
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setStage('form'); setName(''); setEmail(''); setDescription('');
    setErrors({}); setSubmitting(false); submittingRef.current = false;
  }, [visible]);
  useEffect(() => {
    if (stage !== 'confirmation') return;
    fadeAnim.setValue(0);
    swayAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(swayAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(swayAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); };
  }, [stage, fadeAnim, swayAnim]);
  function handleClose() {
    setStage('form'); setName(''); setEmail(''); setDescription('');
    setErrors({}); setSubmitting(false); submittingRef.current = false;
    onClose();
  }

  function handleSubmit() {
    const result = validateBugReportForm({ name, email, description });
    setErrors(result.errors);
    if (!result.ok) {
      if (result.errors.name) nameInputRef.current?.focus();
      else if (result.errors.email) emailInputRef.current?.focus();
      else if (result.errors.description) descInputRef.current?.focus();
      return;
    }
    setStage('consent');
  }

  async function handleAccept() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const deviceInfo = collectDeviceInfo({ language, screenName });
      const result = await openBugReportEmail({
        name: name.trim(), email: email.trim(), description: description.trim(), deviceInfo,
      });
      if (!result.ok) {
        Alert.alert('Failed to open email', result.error || 'Please try again or email us directly.');
        submittingRef.current = false; setSubmitting(false); return;
      }
      setStage('confirmation'); setSubmitting(false);
    } catch (_error) {
      Alert.alert('Failed to open email', 'Something went wrong. Please try again or email us directly.');
      submittingRef.current = false; setSubmitting(false);
    }
  }

  const swayRotation = swayAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-2deg', '2.5deg', '-2deg'] });
  const swayTranslateY = swayAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -8, 0] });
  function ActionButton({ label, primary, onPress, disabled, accessibilityLabel }) {
    const bgColor = primary ? accentColor : '#EAF3FF';
    const textColor = primary ? '#fff' : '#2771CB';
    return (
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: bgColor }, disabled && { opacity: 0.6 }]}
        onPress={onPress} disabled={disabled}
        accessibilityRole="button" accessibilityLabel={accessibilityLabel || label}
      >
        <Text style={{ fontWeight: '900', fontSize: 15, color: textColor }}>{label}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {stage === 'form' && (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
                <Text style={styles.heading}>Report a bug</Text>
                <Text style={styles.subtitle}>Tell us what went wrong.</Text>
                <Text style={styles.label}>Name</Text>
                <TextInput ref={nameInputRef} style={[styles.input, errors.name && styles.inputError]} placeholder="Your name" value={name} onChangeText={setName} accessibilityLabel="Bug report name" />
                {errors.name && <Text style={styles.fieldError}>{errors.name}</Text>}
                <Text style={styles.label}>Email</Text>
                <TextInput ref={emailInputRef} style={[styles.input, errors.email && styles.inputError]} placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" accessibilityLabel="Bug report email" />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
                <Text style={styles.label}>What happened?</Text>
                <TextInput ref={descInputRef} style={[styles.input, styles.textArea, errors.description && styles.inputError]} placeholder={'Describe the bug or issue\u2026'} value={description} onChangeText={setDescription} multiline accessibilityLabel="Bug report description" />
                {errors.description && <Text style={styles.fieldError}>{errors.description}</Text>}
                <View style={styles.actions}>
                  <ActionButton label="Cancel" onPress={handleClose} accessibilityLabel="Cancel bug report" />
                  <ActionButton label="Submit" primary onPress={handleSubmit} accessibilityLabel="Submit bug report" />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
          {stage === 'consent' && (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <Text style={styles.heading}>Share device info?</Text>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{'To help troubleshoot, we\u2019ll attach some device information to your email. Nothing is collected until you accept.'}</Text>
              </View>
              <Text style={[styles.subtitle, { marginBottom: 8, marginTop: 8 }]}>We will include:</Text>
              {CONSENT_FIELDS.map(([label, hint]) => (
                <View key={label} style={styles.fieldRow}>
                  <View style={[styles.dot, { backgroundColor: accentColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{label}</Text>
                    <Text style={styles.fieldHint}>{hint}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.actions}>
                <ActionButton label="Decline" onPress={handleClose} accessibilityLabel="Decline consent and close" />
                <ActionButton label={submitting ? 'Sending\u2026' : 'Accept & send'} primary onPress={handleAccept} disabled={submitting} accessibilityLabel="Accept and send bug report" />
              </View>
            </ScrollView>
          )}
          {stage === 'confirmation' && (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Animated.View style={{ opacity: fadeAnim }}>
                <Animated.Image source={require('../../assets/images/secondline.png')} style={{ width: 150, height: 150, transform: [{ rotate: swayRotation }, { translateY: swayTranslateY }] }} resizeMode="contain" accessibilityLabel="Pelican with Mardi Gras umbrella" />
              </Animated.View>
              <Text style={[styles.heading, { marginTop: 12 }]}>Merci! Report ready</Text>
              <View style={[styles.actions, { width: '100%' }]}>
                <ActionButton label="Done" primary onPress={handleClose} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  sheet: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#000', borderRadius: 22, maxHeight: '92%', overflow: 'hidden' },
  content: { padding: 20 },
  heading: { fontSize: 20, fontWeight: '900', color: '#17324D', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: '#486581', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, padding: 12, fontSize: 15, fontWeight: '600', color: '#17324D', backgroundColor: '#F8FAFC' },
  inputError: { borderColor: '#B91C1C' },
  textArea: { minHeight: 110 },
  fieldError: { color: '#B91C1C', fontSize: 13, fontWeight: '700', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  actionButton: { flex: 1, borderRadius: 16, paddingVertical: 13, alignItems: 'center' },
  warningBox: { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderRadius: 16, padding: 14, marginTop: 8, marginBottom: 4 },
  warningText: { fontSize: 14, fontWeight: '700', color: '#9A3412' },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#17324D' },
  fieldHint: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 2 },
});
