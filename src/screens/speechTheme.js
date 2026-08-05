const SHARED = {
  page: '#F4F7FB',
  card: '#FFFFFF',
  ink: '#102A43',
  muted: '#64748B',
  border: '#E2E8F0',
  disabled: { background: '#94A3B8', border: '#CBD5E1', text: '#94A3B8' },
  danger: '#DC2626',
  accept: '#15803D',
  rec: { background: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
  warn: { background: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
  ready: { background: '#F0FDF4', border: '#BBF7D0', text: '#15803D' }
};

export function getLanguageTokens(language) {
  const kreole = language === 'kreole';

  return {
    ...SHARED,
    accent: kreole ? '#08834C' : '#2771CB',
    info: kreole
      ? { background: '#ECFDF5', border: '#A7F3D0', text: '#066B3F' }
      : { background: '#EFF6FF', border: '#BFDBFE', text: '#1D5FB0' },
    mine: kreole ? '#ECFDF5' : '#EFF6FF',
    flag: kreole
      ? require('../../assets/images/creole_flag.png')
      : require('../../assets/images/cajun_flag.png')
  };
}
