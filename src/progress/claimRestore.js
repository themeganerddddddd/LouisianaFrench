import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isLanguageEmpty,
  readSavedLearnerProgress,
  restoreSavedLearnerProgress,
  sameSavedLearnerProgress
} from './savedLearnerProgress';

const NOTE_KEY = 'lf_saved_progress_note';
const LANGUAGES = ['cajun', 'kreole'];

async function readNotes() {
  const raw = await AsyncStorage.getItem(NOTE_KEY);
  return raw ? JSON.parse(raw) : {};
}

async function readNote(language) {
  const notes = await readNotes();
  return notes[language] || { ownerId: null, revision: null };
}

async function writeNote(language, note) {
  const notes = await readNotes();
  notes[language] = { ownerId: note.ownerId || null, revision: note.revision ?? null };
  await AsyncStorage.setItem(NOTE_KEY, JSON.stringify(notes));
}

function held(note, identityId) {
  return Boolean(note.ownerId && note.ownerId !== identityId);
}

export async function onIdentityForLanguage({ identityId, language, store }) {
  const local = await readSavedLearnerProgress(language);
  const saved = await store.read(identityId, language);
  const note = await readNote(language);
  const localEmpty = isLanguageEmpty(local);

  if (held(note, identityId)) {
    await writeNote(language, { ownerId: note.ownerId, revision: null });
    return { action: 'clash', mayUpdate: false };
  }

  if (!saved && localEmpty) return { action: 'none', mayUpdate: false };

  if (!saved && !localEmpty) {
    const claimed = await store.claim(identityId, language, local);
    if (!claimed.ok) {
      // A record appeared before Claim. Do not overwrite it, and do not hand this progress to a later Identity.
      await writeNote(language, { ownerId: identityId, revision: null });
      return { action: 'clash', mayUpdate: false };
    }
    await writeNote(language, { ownerId: identityId, revision: claimed.revision });
    return { action: 'claim', mayUpdate: true };
  }

  if (saved && localEmpty) {
    await restoreSavedLearnerProgress(language, saved.record);
    await writeNote(language, { ownerId: identityId, revision: saved.revision });
    return { action: 'restore', mayUpdate: true };
  }

  if (saved && sameSavedLearnerProgress(local, saved.record)) {
    await writeNote(language, { ownerId: identityId, revision: saved.revision });
    return { action: 'resume', mayUpdate: true };
  }

  await writeNote(language, { ownerId: note.ownerId || identityId, revision: null });
  return { action: 'clash', mayUpdate: false };
}

export async function writeSavedUpdate({ identityId, language, store, record }) {
  const note = await readNote(language);
  if (note.ownerId !== identityId || note.revision == null) {
    return { ok: false, mayUpdate: false };
  }
  const result = await store.write(identityId, language, note.revision, record);
  if (!result.ok) {
    await writeNote(language, { ownerId: note.ownerId, revision: null });
    return { ok: false, mayUpdate: false };
  }
  await writeNote(language, { ownerId: identityId, revision: result.revision });
  return { ok: true, mayUpdate: true, revision: result.revision };
}

export async function noteSignOut() {
  const notes = await readNotes();
  for (const language of LANGUAGES) {
    if (!notes[language]?.ownerId) continue;
    notes[language] = { ownerId: notes[language].ownerId, revision: null };
  }
  await AsyncStorage.setItem(NOTE_KEY, JSON.stringify(notes));
}
