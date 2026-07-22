This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

1. Install dependencies

   ```bash
   npm install 

   -> Note, I had used  npx expo install
   ```

2. Start the app

   ```bash
   npx expo start --clear
   ```
NOTE- The QR may not work on public or office wifi depending on the blocks they have, use personal or phone wifi


3. Generating Lessons - 

 You must first CLEAR the file src\data\cajunLessons.json and src\data\kreoleLessons.json, or the previous lessons will still be there. 

 Then run the file in scripts\generate_lessons.py. to generate the lessons. 

 IF you want to generate lessons with new audio, before running generate lessons, run scripts\generate_audio_manifest.py. This will asigned all audio information in the CSVs to the audio files as long as they follow the same naming convention. 

- Alternatively, run it through an LLM and just double check it. 

