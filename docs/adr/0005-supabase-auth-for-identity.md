# Use Supabase Auth for Identity

A learner may attach an Identity with email and password, Google, or Facebook. One connector hides that choice. Supabase Auth is the connector's first implementation. A Nostr key was considered for leaderboards and chat and was rejected.

On iOS and Android the session follows Supabase's published large-session pattern: a new 256-bit key on every save, kept in the platform keystore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, and AES-CTR ciphertext in app storage. The password is never stored on the device. Web has no keystore, so the session persists in the origin's `localStorage`, which any script on that origin can read. Sign-out clears the Identity on this device only.

Guest study remains. Learner Progress stays a separate module. The Display name is not the username stored with Learner Progress.
