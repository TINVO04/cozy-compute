import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

const progressFile = path.join(scriptDir, 'generation-progress.json');

function loadProgress() {
  if (fs.existsSync(progressFile)) {
    try {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    } catch (e) {
      console.error('Error reading progress file:', e);
    }
  }
  return {
    chat_model: 'Gemini 3.8 Flash (High)',
    image_tool_model: 'Gemini Image Generation / Imagen',
    total_jobs: 31,
    completed_jobs_count: 0,
    completed: [],
  };
}

function saveProgress(data) {
  fs.writeFileSync(progressFile, JSON.stringify(data, null, 2), 'utf8');
}

const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  params[key] = args[i + 1];
}

if (params.init) {
  const p = loadProgress();
  // Check if betta_fighting is recorded
  if (!p.completed.find((c) => c.id === 'betta_fighting')) {
    p.completed.push({
      id: 'betta_fighting',
      raw_source_path:
        'C:\\Users\\tinvo\\.gemini\\antigravity-cli\\brain\\448a1578-36d8-4786-b02a-f3e83f3aa31d\\betta_fighting_1790840519179.jpg',
      output_path: 'D:/Game_Cua_Bao/output/imagegen/agy-session/betta_fighting-reference-1.jpg',
      completed_at: new Date().toISOString(),
    });
    p.completed_jobs_count = p.completed.filter((c) => c.id !== 'betta_fighting').length;
    saveProgress(p);
  }
  console.log(JSON.stringify({ status: 'initialized', progress: p }, null, 2));
  process.exit(0);
}

if (params.id && params.rawPath && params.outputTarget) {
  const rawPath = params.rawPath;
  let targetPath = params.outputTarget;

  if (!fs.existsSync(rawPath)) {
    console.error(`Raw file not found: ${rawPath}`);
    process.exit(1);
  }

  // Check file extension of raw file
  const ext = path.extname(rawPath).toLowerCase();
  if (ext === '.png' && targetPath.endsWith('.jpg')) {
    targetPath = targetPath.replace(/\.jpg$/, '.png');
  } else if (ext === '.jpg' && targetPath.endsWith('.png')) {
    targetPath = targetPath.replace(/\.png$/, '.jpg');
  }

  fs.copyFileSync(rawPath, targetPath);
  console.log(`Copied ${rawPath} -> ${targetPath}`);

  const p = loadProgress();
  const existingIdx = p.completed.findIndex((c) => c.id === params.id);
  const entry = {
    id: params.id,
    raw_source_path: rawPath,
    output_path: targetPath,
    completed_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    p.completed[existingIdx] = entry;
  } else {
    p.completed.push(entry);
  }

  p.completed_jobs_count = p.completed.filter((c) => c.id !== 'betta_fighting').length;
  if (Array.isArray(p.remaining_ids)) {
    p.remaining_ids = p.remaining_ids.filter((id) => id !== params.id);
    p.remaining_jobs_count = p.remaining_ids.length;
  }
  if (p.last_status === 'BLOCKED_QUOTA_EXHAUSTED') {
    delete p.last_status;
    delete p.quota_reset_info;
    delete p.failed_job;
    delete p.failed_at;
  }
  saveProgress(p);

  console.log(
    JSON.stringify({
      status: 'recorded',
      id: params.id,
      progress: `${p.completed_jobs_count}/${p.total_jobs}`,
    }),
  );
}
