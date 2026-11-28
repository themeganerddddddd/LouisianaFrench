import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { canDismiss, type AccountEvent, type AccountView } from '../../account/accountMachine';
import { CreateView, ForgotView, InboxView, SignInView, UsernameView } from './accountViews';

type Props = {
  visible: boolean;
  view: AccountView;
  dispatch: (event: AccountEvent) => void;
  onClose: () => void;
  accentColor: string;
};

export function AccountModal({ visible, view, dispatch, onClose, accentColor }: Props) {
  const dismiss = canDismiss(view);
  function close() {
    if (!dismiss) return;
    if (view.kind === 'username') dispatch({ type: 'usernameSkipped' });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close} testID="account-backdrop">
        <Pressable onPress={() => {}} testID="account-modal" style={styles.card}>
          {dismiss ? (
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={close}
              style={styles.close}
              testID="account-close"
            >
              <Text style={[styles.closeLabel, { color: accentColor }]}>Close</Text>
            </Pressable>
          ) : null}
          {view.kind === 'signIn' ? (
            <SignInView view={view} dispatch={dispatch} accentColor={accentColor} />
          ) : null}
          {view.kind === 'create' ? (
            <CreateView view={view} dispatch={dispatch} accentColor={accentColor} />
          ) : null}
          {view.kind === 'forgot' ? (
            <ForgotView view={view} dispatch={dispatch} accentColor={accentColor} />
          ) : null}
          {view.kind === 'inbox' ? <InboxView view={view} dispatch={dispatch} accentColor={accentColor} /> : null}
          {view.kind === 'username' ? (
            <UsernameView view={view} dispatch={dispatch} accentColor={accentColor} />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(16, 42, 67, 0.45)',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxWidth: 420,
    padding: 16,
    width: '100%'
  },
  close: { alignSelf: 'flex-end', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  closeLabel: { fontSize: 15, fontWeight: '700' }
});
