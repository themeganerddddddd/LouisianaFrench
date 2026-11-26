import { View } from 'react-native';

import type { AccountEvent, AccountView } from '../../account/accountMachine';

type Props = {
  visible: boolean;
  view: AccountView;
  dispatch: (event: AccountEvent) => void;
  onClose: () => void;
  accentColor: string;
};

export function AccountModal({ view }: Props) {
  return <View testID="account-modal" accessibilityLabel={view.kind} />;
}
