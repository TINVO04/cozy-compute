import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
path = ROOT / 'docs/fish-render-prompts.json'
manifest = json.loads(path.read_text(encoding='utf-8'))
reports = json.loads((ROOT / 'output/imagegen/asset-report.json').read_text())
installed = {r['species'] for r in reports if 'error' not in r}
progress = json.loads((Path(__file__).parent / 'generation-progress.json').read_text())
agy_ids = {r['id'] for r in progress['completed']}
manifest['generated_species'] = sorted(installed)
manifest['pending_species'] = [j['id'] for j in manifest['jobs'] if j['id'] not in installed]
total = len(manifest['jobs']) + len(manifest['preserve_existing'])
manifest['status'] = str(len(installed) + 3) + '/' + str(total) + ' rendered fish assets installed; ' + str(len(manifest['pending_species'])) + ' pending'
manifest['mode'] = 'User-authorized Gemini HTTP generation and AGY built-in GenerateImage continuation'
manifest['agy_generation'] = {'tool': 'generate_image', 'chat_model': 'Gemini 3.8 Flash (High)',
                              'image_tool_model': 'gemini-3.1-flash-image (identified in tool error metadata)',
                              'output_directory': 'output/imagegen/agy-session',
                              'species': sorted(agy_ids), 'reference_images': manifest['reference_images']}
manifest['agy_generation']['last_error'] = progress.get('quota_reset_info')
for job in manifest['jobs']:
    if job['id'] in agy_ids:
        job['generation_route'] = 'AGY built-in generate_image with all three style references'
path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + chr(10), encoding='utf-8')
pending_jobs = [job for job in manifest['jobs'] if job['id'] in manifest['pending_species']]
(Path(__file__).parent / 'remaining-jobs.json').write_text(json.dumps(pending_jobs, ensure_ascii=False, indent=2) + chr(10), encoding='utf-8')

# Persist exact tool arguments without transcript commentary or credentials.
brain = Path('C:/Users/tinvo/.gemini/antigravity-cli/brain')
sessions = ['448a1578-36d8-4786-b02a-f3e83f3aa31d', '5ed46e45-b7b4-4cda-abd8-dddec7cb7828',
            'e33b3ea5-330c-47e8-98d3-82cc9ae0f6c3', '922e7af0-bf4c-4ab0-bff9-4af6c8f902b4',
            'd02ea45c-170b-4667-93e8-3ceebff5a8d8', 'cd1879db-b829-448d-b30d-1f0828fe1516']
# Include the active session and every saved source so future continuations retain
# their exact tool prompts without scanning unrelated AGY conversations.
source_paths = [progress.get('brain_path', '')]
source_paths.extend(entry.get('raw_source_path', '') for entry in progress['completed'])
for source in source_paths:
    parts = source.replace('\\', '/').split('/')
    if 'brain' in parts and parts.index('brain') + 1 < len(parts):
        session = parts[parts.index('brain') + 1]
        if session not in sessions:
            sessions.append(session)
transcripts = [file for session in sessions for file in (brain / session / '.system_generated').rglob('transcript_full.jsonl')]
calls = []
def walk(v):
    if isinstance(v, dict):
        if v.get('name') == 'generate_image':
            calls.append(v)
            return
        for x in v.values():
            if isinstance(x, (dict, list)): walk(x)
    elif isinstance(v, list):
        for x in v: walk(x)
for transcript in transcripts:
    for line in transcript.read_text(encoding='utf-8').splitlines():
        try: walk(json.loads(line))
        except json.JSONDecodeError: pass
(Path(__file__).parent / 'actual-image-prompts.json').write_text(json.dumps(calls, ensure_ascii=False, indent=2) + chr(10), encoding='utf-8')
print(manifest['status'])
print('Exact image tool calls saved:', len(calls))
