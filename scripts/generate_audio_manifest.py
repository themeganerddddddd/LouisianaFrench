import csv
import os

CAJUN_CSV = "cajun.csv"
KREOLE_CSV = "kreole.csv"
OUTPUT_JS = "src/data/audioManifest.js"

AUDIO_BASE = {
    "cajun": "../../assets/audio/cajun",
    "kreole": "../../assets/audio/kreole",
}

def collect_audio_keys(csv_path):
    keys = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            audio_key = str(row.get("audioKey") or "").strip()
            if audio_key:
                keys.append(audio_key)
    return sorted(set(keys))

def to_manifest_lines(language, keys):
    base = AUDIO_BASE[language]
    lines = []
    for key in keys:
        filename = f"{key}.mp3"
        lines.append(f'    "{key}": require("{base}/{filename}"),')
    return "\n".join(lines)

def main():
    cajun_keys = collect_audio_keys(CAJUN_CSV)
    kreole_keys = collect_audio_keys(KREOLE_CSV)

    content = f"""export const audioManifest = {{
  cajun: {{
{to_manifest_lines("cajun", cajun_keys)}
  }},
  kreole: {{
{to_manifest_lines("kreole", kreole_keys)}
  }}
}};

export function getAudioSource(language, audioKey) {{
  if (!audioKey) return null;
  return audioManifest?.[language]?.[audioKey] || null;
}}
"""

    os.makedirs(os.path.dirname(OUTPUT_JS), exist_ok=True)
    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Wrote {OUTPUT_JS}")

if __name__ == "__main__":
    main()