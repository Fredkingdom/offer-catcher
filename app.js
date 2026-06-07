// ========== CONFIG ==========
const DEEPSEEK_API_KEY = 'sk-5a375616ec0848da8250a57f6dd025c5';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// ========== GLOBAL STATE ==========
// (sampleResumes, sampleJDs, gapChart declared in sample-data.js)
let currentMode = null;   // 'A' | 'B' | 'C'
let stateA = { resumeText: '', selectedJD: null };
let stateB = { jdText: '', resumeText: '' };
let stateC = { resumeText: '', jdText: '' };
let gapChart = null; // kept for backward compat, now unused (Canvas replaces Chart.js)

// ========== PDF.JS INIT (must be inside script, not outside) ==========
(function initPdfJs() {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
})();

// ========== NAVIGATION ==========

function goHome() {
  // 1. Reset global state
  currentMode = null;
  stateA = { resumeText: '', selectedJD: null };
  stateB = { jdText: '', resumeText: '' };
  stateC = { resumeText: '', jdText: '' };

  // 2. Reset step counters
  modeAStep = 0;
  modeBStep = 0;
  modeCStep = 0;

  // 3. Clear all textareas
  ['resumeInputA', 'jdInputB', 'resumeInputB', 'resumeInputC', 'jdInputC'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // 4. Clear all file inputs (replace to remove FileList)
  ['fileInputA', 'fileInputB_jd', 'fileInputB_resume', 'fileInputC', 'fileInputC_jd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // 5. Clear all upload status messages
  ['uploadStatusA', 'uploadStatusB_jd', 'uploadStatusB_resume', 'uploadStatusC', 'uploadStatusC_jd'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ''; el.className = 'upload-status'; }
  });

  // 6. Clear all result sections
  ['resultSectionA', 'resultSectionB', 'resultSectionC'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  // 7. Reset Mode A job recommendation list (restore skeleton)
  const jobList = document.getElementById('jobRecommendList');
  if (jobList) {
    jobList.innerHTML = `<div class="loading-skeleton"><div class="skel-line w80"></div><div class="skel-line w60"></div><div class="skel-line w70"></div></div>`;
  }

  // 8. Disable all action buttons
  ['btnA_next', 'btnA_toResult', 'btnB_next', 'btnB_analyze', 'btnC_next', 'btnC_analyze'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = true;
  });

  // 9. Reset step bars to step 0
  ['A', 'B', 'C'].forEach(m => updateStepBar(m, 0));

  // 10. Switch back to all step panels of each mode to their initial step
  ['A', 'B', 'C'].forEach(mode => {
    const modeSec = document.getElementById('sec' + mode);
    if (modeSec) {
      modeSec.querySelectorAll('.step-panel').forEach((p, i) => {
        p.classList.toggle('active', i === 0);
      });
    }
  });

  // 11. Show home section
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('secHome').classList.add('active');
  document.getElementById('navHomeBtn').style.display = 'none';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec' + mode).classList.add('active');
  document.getElementById('navHomeBtn').style.display = 'flex';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Mode A steps ----
let modeAStep = 0;
function goModeAStep(step) {
  modeAStep = step;
  document.querySelectorAll('#secA .step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('secA' + step).classList.add('active');
  updateStepBar('A', step);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 1) {
    runModeARecommendations();
  }
}

// ---- Mode B steps ----
let modeBStep = 0;
function goModeBStep(step) {
  modeBStep = step;
  document.querySelectorAll('#secB .step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('secB' + step).classList.add('active');
  updateStepBar('B', step);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Mode C steps ----
let modeCStep = 0;
function goModeCStep(step) {
  modeCStep = step;
  document.querySelectorAll('#secC .step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('secC' + step).classList.add('active');
  updateStepBar('C', step);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateStepBar(mode, activeStep) {
  const bar = document.getElementById('stepBar' + mode);
  if (!bar) return;
  bar.querySelectorAll('.step-item').forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i === activeStep) el.classList.add('active');
    else if (i < activeStep) el.classList.add('done');
  });
  bar.querySelectorAll('.step-line').forEach((el, i) => {
    el.classList.toggle('done', i < activeStep);
  });
}

// ========== INPUT HANDLERS ==========

// Mode A resume
document.getElementById('resumeInputA').addEventListener('input', function () {
  stateA.resumeText = this.value;
  document.getElementById('btnA_next').disabled = !this.value.trim();
});

// Mode B JD
document.getElementById('jdInputB').addEventListener('input', function () {
  stateB.jdText = this.value;
  document.getElementById('btnB_next').disabled = !this.value.trim();
});

// Mode B resume
document.getElementById('resumeInputB').addEventListener('input', function () {
  stateB.resumeText = this.value;
  document.getElementById('btnB_analyze').disabled = !this.value.trim();
});

// Mode C resume
document.getElementById('resumeInputC').addEventListener('input', function () {
  stateC.resumeText = this.value;
  document.getElementById('btnC_next').disabled = !this.value.trim();
});

// Mode C JD
document.getElementById('jdInputC').addEventListener('input', function () {
  stateC.jdText = this.value;
  document.getElementById('btnC_analyze').disabled = !this.value.trim();
});

function loadSampleResume(mode) {
  const text = sampleResumes[0];
  if (mode === 'A') {
    document.getElementById('resumeInputA').value = text;
    stateA.resumeText = text;
    document.getElementById('btnA_next').disabled = false;
    setUploadStatus('A', '✅ 已加载示例简历');
  } else if (mode === 'B') {
    document.getElementById('resumeInputB').value = text;
    stateB.resumeText = text;
    document.getElementById('btnB_analyze').disabled = false;
    setUploadStatus('B_resume', '✅ 已加载示例简历');
  } else if (mode === 'C') {
    document.getElementById('resumeInputC').value = text;
    stateC.resumeText = text;
    document.getElementById('btnC_next').disabled = false;
    setUploadStatus('C', '✅ 已加载示例简历');
  }
}

function loadSampleJD(index, mode) {
  const jd = sampleJDs[index].text;
  if (mode === 'B') {
    document.getElementById('jdInputB').value = jd;
    stateB.jdText = jd;
    document.getElementById('btnB_next').disabled = false;
  } else if (mode === 'C') {
    document.getElementById('jdInputC').value = jd;
    stateC.jdText = jd;
    document.getElementById('btnC_analyze').disabled = false;
  }
}

function setUploadStatus(zone, msg, isError) {
  const el = document.getElementById('uploadStatus' + zone);
  if (!el) return;
  el.textContent = msg;
  el.className = 'upload-status' + (isError ? ' error' : ' success');
}

// ========== FILE UPLOAD ==========

async function handleFileUpload(event, target) {
  const file = event.target.files[0];
  if (!file) return;

  const statusId = target === 'B_resume' ? 'B_resume' : target;
  setUploadStatus(statusId, '⏳ 正在解析文件...');

  try {
    let text = '';
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'txt') {
      text = await readAsText(file);
    } else if (ext === 'pdf') {
      text = await parsePDF(file);
    } else if (ext === 'docx') {
      text = await parseDOCX(file);
    } else if (ext === 'doc') {
      setUploadStatus(statusId, '⚠️ 不支持旧版 .doc 格式，请将文件另存为 .docx 后重试', true);
      return;
    }

    if (!text || text.trim().length < 20) {
      setUploadStatus(statusId, '⚠️ 未能提取到文本，可能是扫描版 PDF，请粘贴文本', true);
      return;
    }

    if (target === 'A') {
      document.getElementById('resumeInputA').value = text;
      stateA.resumeText = text;
      document.getElementById('btnA_next').disabled = false;
    } else if (target === 'B_resume') {
      document.getElementById('resumeInputB').value = text;
      stateB.resumeText = text;
      document.getElementById('btnB_analyze').disabled = false;
    } else if (target === 'C') {
      document.getElementById('resumeInputC').value = text;
      stateC.resumeText = text;
      document.getElementById('btnC_next').disabled = false;
    }

    setUploadStatus(statusId, `✅ 已解析：${file.name}（${text.length} 字符）`);
  } catch (e) {
    console.error('File parse error:', e);
    setUploadStatus(statusId, '❌ 文件解析失败，请直接粘贴简历文本', true);
  }
}

async function handleJDFileUpload(event, mode) {
  const file = event.target.files[0];
  if (!file) return;
  const statusId = mode + '_jd';
  setUploadStatus(statusId, '⏳ 正在解析 JD 文件...');

  try {
    let text = '';
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
      text = await readAsText(file);
    } else if (ext === 'pdf') {
      text = await parsePDF(file);
    } else if (ext === 'docx') {
      text = await parseDOCX(file);
    } else {
      setUploadStatus(statusId, '⚠️ 请上传 TXT/PDF/DOCX 格式', true);
      return;
    }

    if (mode === 'B') {
      document.getElementById('jdInputB').value = text;
      stateB.jdText = text;
      document.getElementById('btnB_next').disabled = false;
    } else if (mode === 'C') {
      document.getElementById('jdInputC').value = text;
      stateC.jdText = text;
      document.getElementById('btnC_analyze').disabled = false;
    }

    setUploadStatus(statusId, `✅ 已解析 JD：${file.name}`);
  } catch (e) {
    setUploadStatus(statusId, '❌ 文件解析失败，请直接粘贴 JD 文本', true);
  }
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

async function parsePDF(file) {
  if (typeof pdfjsLib === 'undefined') throw new Error('pdf.js not loaded');
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}

async function parseDOCX(file) {
  if (typeof mammoth === 'undefined') throw new Error('mammoth.js not loaded');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ========== DEEPSEEK API ==========

async function callDeepSeekAPI(systemPrompt, userPrompt, maxTokens = 4096) {
  const resp = await fetch(DEEPSEEK_BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    })
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API Error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error('Invalid JSON from API: ' + raw.substring(0, 200));
  }
}

// Step 1: Parse resume profile
async function parseResumeWithAI(resumeText) {
  const systemPrompt = `你是一个专业的简历信息提取助手。请仔细阅读简历文本，提取准确、完整的结构化信息。

严格以 JSON 格式返回：
{
  "name": "姓名（从简历原文提取，找不到则返回空字符串）",
  "educationList": [
    {
      "degree": "学历层次，如：本科/硕士/博士/大专",
      "school": "学校名称（必须从原文提取，严禁编造）",
      "major": "专业名称（必须从原文提取）",
      "period": "就读时间段，如：2018.09 - 2022.06（原文有的就填，没有则空字符串）"
    }
  ],
  "skills": ["技能1", "技能2"],
  "experience": ["经历描述1（60字以内）", "经历描述2"],
  "keywords": ["关键词1", "关键词2"]
}

【教育经历提取要求】
1. 必须提取简历中提到的所有教育阶段（本科、硕士、博士等），按时间倒序排列（最高学历在前）
2. 如果本科和硕士在不同学校，必须分别列出，严禁合并
3. school/major/degree 必须从简历原文逐字提取，严禁推断或编造
4. period 尽量从原文提取，格式统一为 YYYY.MM - YYYY.MM

【技能提取要求】
1. 优先从简历中"专业技能"、"技能"、"语言能力"等明确板块提取
2. 只提取简历中明确提到的技能，如：Python、数据分析、英语六级等
3. 严禁从经历描述中泛化出软技能（如"文字表达"、"资料检索"、"问题分析"等），除非简历明确将其列为技能
4. 如果简历没有明确的技能板块，返回空数组，不要编造

【经历提取要求】
1. 从"实习经历"、"项目经历"、"工作经历"、"校园经历"等板块提取
2. 每条经历保留关键信息：公司/组织名称 + 职位/角色 + 核心工作内容
3. 提取3-6条，按重要性排序`;

  try {
    const result = await callDeepSeekAPI(
      systemPrompt,
      '请仔细提取以下简历的完整信息，特别注意区分不同教育阶段：\n\n' + resumeText.substring(0, 3500),
      2048
    );
    if (result && result.name !== undefined) {
      // Normalize: if old format (single education), convert to educationList
      if (!result.educationList && result.education) {
        result.educationList = [{
          degree: result.education,
          school: result.school || '',
          major: result.major || '',
          period: ''
        }];
      }
      // Ensure educationList exists
      if (!result.educationList) result.educationList = [];
      return result;
    }
  } catch (e) {
    console.error('AI parseResume failed:', e);
  }
  return null;
}

// Step 2: Match analysis
async function matchAnalysisWithAI(parsedProfile, jdText) {
  const systemPrompt = `你是一个专业的简历-岗位匹配分析 AI 助手。基于求职者简历信息和岗位 JD，给出真实、具体的匹配度分析。
严格以 JSON 格式返回：
{
  "overallScore": 78,
  "dimensions": {
    "skillMatch": 75,
    "experienceMatch": 68,
    "educationMatch": 90,
    "softSkillMatch": 80
  },
  "highlights": ["优势1（必须引用简历真实内容）", "优势2"],
  "gaps": [
    {"area": "差距领域", "current": "当前水平", "required": "岗位要求", "suggestion": "弥补建议"}
  ],
  "suggestions": [
    {"location": "简历位置（如技能部分/项目经历）", "change": "具体修改建议", "reason": "理由"}
  ],
  "summary": "整体分析总结（150字以内）",
  "skillDetails": {
    "matched": ["已匹配技能（只写简历和JD都有的）"],
    "partial": ["部分匹配技能"],
    "missing": ["JD要求但简历缺失的技能"]
  }
}
关键要求：1.所有内容必须基于提供的真实简历数据，严禁编造示例。2.skillDetails必须对比JD和简历实际内容生成。3.评分客观公正，0-100分。`;

  // Build education summary for prompt
  const eduSummary = (parsedProfile.educationList || []).map(e =>
    `- ${e.degree} · ${e.school} · ${e.major}${e.period ? ' · ' + e.period : ''}`
  ).join('\n');

  const userPrompt = '=== 求职者简历信息 ===\n' +
    '姓名：' + (parsedProfile.name || '未识别') + '\n' +
    '教育经历：\n' + (eduSummary || '未识别') + '\n' +
    '技能：' + (parsedProfile.skills || []).join('、') + '\n' +
    '主要经历：\n' + (parsedProfile.experience || []).map(e => '- ' + e).join('\n') + '\n' +
    '\n=== 目标岗位 JD ===\n' + jdText.substring(0, 2000) +
    '\n\n请分析匹配度，严格按JSON格式返回。';

  return await callDeepSeekAPI(systemPrompt, userPrompt, 4096);
}

// Mode A: Job recommendations from resume
async function jobRecommendWithAI(resumeText) {
  const systemPrompt = `你是一个求职顾问 AI。根据求职者的简历，推荐最适合的岗位方向，并简要说明推荐理由。
严格以 JSON 格式返回：
{
  "profile": {
    "name": "姓名",
    "educationList": [
      {"degree": "学历", "school": "学校", "major": "专业"}
    ],
    "topSkills": ["技能1", "技能2", "技能3"]
  },
  "recommendations": [
    {
      "jobTitle": "岗位名称",
      "company": "推荐公司类型（如：互联网大厂/咨询公司/科技初创）",
      "matchScore": 88,
      "reasons": ["推荐理由1", "推荐理由2"],
      "keyRequirements": ["岗位核心要求1", "岗位核心要求2"],
      "gapTips": ["需要补强的点"]
    }
  ],
  "overallAdvice": "整体求职建议（100字以内）"
}
请推荐 3-4 个最匹配的岗位方向，matchScore 基于简历与岗位的真实匹配度。
注意：如果简历包含多段教育经历（如本科+硕士），请在 educationList 中完整列出。`;

  return await callDeepSeekAPI(
    systemPrompt,
    '请根据以下简历推荐适合的岗位方向：\n\n' + resumeText.substring(0, 3000),
    2048
  );
}

// Fallback: frontend regex extraction
function extractProfileFromText(text) {
  const profile = {
    name: '', educationList: [],
    skills: [], experience: [], keywords: []
  };

  // Name
  const nameMatch = text.match(/(?:姓名[：:]\s*|^[\s]*)([\u4e00-\u9fa5]{2,4})(?:\s|，|,|$)/m);
  if (nameMatch) profile.name = nameMatch[1];

  // Education: extract ALL education sections
  // Pattern: degree + school + major + period
  const eduPatterns = [
    // "硕士 北京大学 应用语言学 2022.09-2025.06"
    /(博士|硕士|本科|大专)[\s·•\-]*(\S{2,10}(?:大学|学院|研究院|研究所))[\s·•\-]*(\S{2,20}专业|[^\d\n]{2,20})[\s·•\-]*((?:20\d{2}[.年/]\d{1,2})[\s\-~至]*(?:20\d{2}[.年/]\d{1,2}|至今))/g,
    // "北京大学 硕士 应用语言学"
    /(\S{2,10}(?:大学|学院|研究院|研究所))[\s·•\-]*(博士|硕士|本科|大专)[\s·•\-]*([^\d\n]{2,20}?)(?:\s|$|\n)/g,
  ];

  const seenSchools = new Set();
  for (const pattern of eduPatterns) {
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const degree = m[1].includes('大学') || m[1].includes('学院') ? m[2] : m[1];
      const school = m[1].includes('大学') || m[1].includes('学院') ? m[1] : m[2];
      const majorRaw = m[3] || '';
      const major = majorRaw.replace(/专业$/, '').trim();
      const period = m[4] || '';
      if (school && !seenSchools.has(school + degree)) {
        seenSchools.add(school + degree);
        profile.educationList.push({ degree, school, major, period });
      }
    }
  }

  // Fallback: if no structured education found, try line-by-line
  if (profile.educationList.length === 0) {
    const lines = text.split('\n');
    for (const line of lines) {
      const hasDegree = /博士|硕士|本科|大专/.test(line);
      const hasSchool = /大学|学院|研究院|研究所/.test(line);
      if (hasDegree && hasSchool) {
        const degMatch = line.match(/(博士|硕士|本科|大专)/);
        const schMatch = line.match(/(\S{2,10}(?:大学|学院|研究院|研究所))/);
        const majMatch = line.match(/专业[：:]\s*(\S{2,20})/);
        const perMatch = line.match(/((?:20\d{2}[.年/]\d{1,2})[\s\-~至]*(?:20\d{2}[.年/]\d{1,2}|至今))/);
        if (schMatch) {
          const school = schMatch[1];
          const degree = degMatch ? degMatch[1] : '';
          if (!seenSchools.has(school + degree)) {
            seenSchools.add(school + degree);
            profile.educationList.push({
              degree,
              school,
              major: majMatch ? majMatch[1].replace(/专业$/, '').trim() : '',
              period: perMatch ? perMatch[1] : ''
            });
          }
        }
      }
    }
  }

  // Sort: 博士 > 硕士 > 本科 > 大专
  const degOrder = { '博士': 4, '硕士': 3, '本科': 2, '大专': 1 };
  profile.educationList.sort((a, b) => (degOrder[b.degree] || 0) - (degOrder[a.degree] || 0));

  // Skills: extract from explicit skill sections only
  // Look for "专业技能" / "技能" / "语言能力" sections
  const skillSectionMatch = text.match(/(?:专业技能|技能|语言能力|Languages)[：:\s]*([\s\S]{0,500}?)(?:\n\n|\n(?:工作|实习|项目|教育|经历|荣誉)|$)/i);
  if (skillSectionMatch) {
    const skillText = skillSectionMatch[1];
    // Split by common delimiters
    const rawSkills = skillText.split(/[,，;；、|/\\\s]+/).map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 20);
    profile.skills = [...new Set(rawSkills)].slice(0, 12);
  }

  // If no explicit skill section, look for proficiency keywords in context
  if (profile.skills.length === 0) {
    const profMatches = text.matchAll(/(?:熟悉|掌握|精通|了解|熟练使用|具备)([^，；。\n]{2,15})/g);
    for (const m of profMatches) {
      const skill = m[1].trim();
      if (skill.length >= 2 && skill.length <= 15 && !profile.skills.includes(skill)) {
        profile.skills.push(skill);
      }
    }
  }

  // Experience (lines with action verbs)
  const expLines = text.split('\n').filter(line =>
    /负责|参与|主导|开发|设计|实现|优化|分析|构建|搭建|协助|完成|组织|策划|运营|管理/.test(line) &&
    line.length > 15 && line.length < 150
  );
  profile.experience = expLines.slice(0, 6).map(l => l.trim().replace(/^[\-·•]\s*/, ''));

  return profile;
}

// ========== MODE A: RESUME → JOB RECOMMENDATIONS ==========

async function runModeARecommendations() {
  const container = document.getElementById('jobRecommendList');
  container.innerHTML = `<div class="loading-skeleton">
    <div class="skel-line w80"></div><div class="skel-line w60"></div><div class="skel-line w70"></div>
  </div>`;
  document.getElementById('btnA_toResult').disabled = true;

  try {
    const result = await jobRecommendWithAI(stateA.resumeText);
    stateA.recommendations = result;
    renderJobRecommendations(result);
  } catch (e) {
    console.error('Mode A AI failed:', e);
    container.innerHTML = `<div class="error-msg">⚠️ AI 分析失败：${e.message}。请检查网络连接后重试。</div>`;
    showToast('AI 分析失败，请重试');
  }
}

function renderJobRecommendations(result) {
  const container = document.getElementById('jobRecommendList');

  if (!result || !result.recommendations) {
    container.innerHTML = '<p class="empty-tip">未能获取推荐结果</p>';
    return;
  }

  // Profile summary
  let html = '';
  if (result.profile) {
    const p = result.profile;
    // Build education tags from educationList if available
    let eduTags = '';
    if (p.educationList && p.educationList.length > 0) {
      eduTags = p.educationList.map(e =>
        `<span class="profile-tag">${e.degree} · ${e.school}${e.major ? ' · ' + e.major : ''}</span>`
      ).join('');
    } else {
      eduTags = `<span class="profile-tag">${p.education || ''} · ${p.school || ''}</span>`;
    }
    html += `<div class="profile-summary">
      <span class="profile-tag">${p.name || '求职者'}</span>
      ${eduTags}
      ${(p.topSkills || []).map(s => `<span class="skill-badge skill-badge-green">${s}</span>`).join('')}
    </div>`;
  }

  if (result.overallAdvice) {
    html += `<div class="advice-box">💡 ${result.overallAdvice}</div>`;
  }

  html += '<div class="recommend-grid">';
  result.recommendations.forEach((job, i) => {
    const scoreColor = job.matchScore >= 75 ? 'var(--c-green)' : job.matchScore >= 50 ? 'var(--c-primary)' : 'var(--c-amber)';
    const isSelected = stateA.selectedJobIndex === i;
    html += `
      <div class="recommend-card ${isSelected ? 'selected' : ''}" onclick="selectJobCard(${i})" data-index="${i}">
        <div class="recommend-card-header">
          <div>
            <h4 class="recommend-title">${job.jobTitle}</h4>
            <span class="recommend-company">${job.company || ''}</span>
          </div>
          <div class="recommend-score" style="color:${scoreColor}">${job.matchScore}<span style="font-size:12px">分</span></div>
        </div>
        <ul class="recommend-reasons">
          ${(job.reasons || []).map(r => `<li>${r}</li>`).join('')}
        </ul>
        ${job.gapTips && job.gapTips.length ? `<div class="recommend-gap">
          <strong>待加强：</strong>${job.gapTips.join('、')}
        </div>` : ''}
      </div>`;
  });
  html += '</div>';

  container.innerHTML = html;
}

function selectJobCard(index) {
  stateA.selectedJobIndex = index;
  document.querySelectorAll('.recommend-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
  document.getElementById('btnA_toResult').disabled = false;
}

async function goModeAStep(step) {
  if (step === 2) {
    // Deep analysis with selected job
    if (!stateA.recommendations) return;
    const selectedJob = stateA.recommendations.recommendations?.[stateA.selectedJobIndex || 0];
    if (selectedJob) {
      const mockJD = `岗位名称：${selectedJob.jobTitle}\n岗位要求：\n${(selectedJob.keyRequirements || []).join('\n')}`;
      stateA.selectedJD = mockJD;
    }

    modeAStep = 2;
    document.querySelectorAll('#secA .step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('secA2').classList.add('active');
    updateStepBar('A', 2);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (stateA.selectedJD) {
      await runFullAnalysis('A', stateA.resumeText, stateA.selectedJD, 'resultSectionA');
    }
    return;
  }

  modeAStep = step;
  document.querySelectorAll('#secA .step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('secA' + step).classList.add('active');
  updateStepBar('A', step);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (step === 1) {
    runModeARecommendations();
  }
}

// ========== MODE B: JD → RESUME ADVICE ==========

async function startModeB() {
  if (!stateB.jdText.trim() || !stateB.resumeText.trim()) return;
  goModeBStep(2);
  await runFullAnalysis('B', stateB.resumeText, stateB.jdText, 'resultSectionB');
}

// ========== MODE C: FULL ANALYSIS ==========

async function startModeC() {
  if (!stateC.resumeText.trim() || !stateC.jdText.trim()) return;
  goModeCStep(2);
  await runFullAnalysis('C', stateC.resumeText, stateC.jdText, 'resultSectionC');
}

// ========== SHARED: FULL ANALYSIS RENDER ==========

async function runFullAnalysis(mode, resumeText, jdText, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = buildLoadingHTML();

  try {
    // Step 1: Parse resume
    let parsedProfile = await parseResumeWithAI(resumeText);
    if (!parsedProfile) {
      parsedProfile = extractProfileFromText(resumeText);
      showToast('已使用智能解析提取简历信息');
    }

    // Step 2: Match analysis
    const matchResult = await matchAnalysisWithAI(parsedProfile, jdText);
    matchResult.parsedProfile = parsedProfile;

    container.innerHTML = buildResultHTML(matchResult);
    initResultInteractions(containerId, matchResult);

  } catch (e) {
    console.error('Full analysis error:', e);
    container.innerHTML = `<div class="card error-msg">
      <h3>⚠️ 分析失败</h3>
      <p>${e.message}</p>
      <p>请检查网络连接或 API Key 是否有效后重试。</p>
    </div>`;
  }
}

function buildLoadingHTML() {
  return `
    <div class="card">
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">AI 正在分析匹配度，请稍候...</p>
        <p class="loading-sub">解析简历信息 · 对比岗位 JD · 生成优化建议</p>
      </div>
    </div>
    <div class="card">
      <div class="loading-skeleton" style="padding:8px 0">
        <div class="skel-line w80"></div><div class="skel-line w60"></div>
        <div class="skel-line w70"></div><div class="skel-line w50"></div>
      </div>
    </div>`;
}

function buildResultHTML(result) {
  const p = result.parsedProfile || {};
  const d = result.dimensions || {};
  const score = result.overallScore || 0;
  const scoreColor = score >= 75 ? '#16A34A' : score >= 50 ? '#2563EB' : '#DC2626';
  const circumference = 339.29;
  const offset = circumference * (1 - score / 100);
  const scoreDesc = score >= 75
    ? '你的简历与目标岗位匹配度较高，通过优化细节可进一步提升初筛命中率。'
    : score >= 50
    ? '你的简历有一定基础，但在部分关键维度上存在差距，建议重点补强。'
    : '你的简历与目标岗位差距较大，建议针对性调整后再投递。';

  const skillDetails = result.skillDetails || {};

  return `
  <!-- Score Banner -->
  <div class="score-banner">
    <div class="score-ring">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#E5E7EB" stroke-width="8"/>
        <circle cx="60" cy="60" r="54" fill="none" stroke="${scoreColor}" stroke-width="8"
          stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          class="score-circle-anim" data-offset="${offset}"/>
      </svg>
      <div class="score-text">
        <span class="num score-count-anim" style="color:${scoreColor}" data-target="${score}">0</span>
        <span class="label">分</span>
      </div>
    </div>
    <div class="score-info">
      <h2 class="score-title">综合匹配度</h2>
      <p class="score-desc">${scoreDesc}</p>
      <div class="dim-tags">
        ${buildDimTag('技能匹配', d.skillMatch || 0)}
        ${buildDimTag('经验相关', d.experienceMatch || 0)}
        ${buildDimTag('学历符合', d.educationMatch || 0)}
        ${buildDimTag('软实力', d.softSkillMatch || 0)}
      </div>
      ${result.summary ? `<p class="score-summary">${result.summary}</p>` : ''}
    </div>
  </div>

  <!-- Tab Nav -->
  <div class="tab-nav">
    <button class="tab active" onclick="switchResultTab(this, 'parsed')">简历解析</button>
    <button class="tab" onclick="switchResultTab(this, 'match')">匹配详情</button>
    <button class="tab" onclick="switchResultTab(this, 'gap')">Gap 分析</button>
    <button class="tab" onclick="switchResultTab(this, 'suggest')">优化建议</button>
  </div>

  <!-- Panel: Parsed -->
  <div class="tab-panel active" id="panel-parsed">
    <div class="card">
      <h3 class="panel-title">AI 简历解析结果</h3>
      <div class="parsed-grid">
        <div class="parsed-block">
          <h4>基本信息</h4>
          <ul>
            ${p.name ? `<li>姓名：${p.name}</li>` : ''}
            ${!p.name ? '<li>（未识别到姓名）</li>' : ''}
          </ul>
        </div>
        <div class="parsed-block">
          <h4>技能标签</h4>
          <div class="skill-badge-row">
            ${(p.skills || []).map(s => `<span class="skill-badge skill-badge-teal">${s}</span>`).join('') || '<span class="empty-tip">未提取到明确技能</span>'}
          </div>
        </div>
        <div class="parsed-block" style="grid-column:1/-1">
          <h4>教育经历</h4>
          ${(p.educationList || []).length > 0 ? `
            <div class="edu-timeline">
              ${(p.educationList || []).map(edu => `
                <div class="edu-item">
                  <div class="edu-badge">${edu.degree || '学历未明'}</div>
                  <div class="edu-detail">
                    <div class="edu-school">${edu.school || '学校未识别'}</div>
                    <div class="edu-major">${edu.major || ''}${edu.period ? ` · ${edu.period}` : ''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : '<p class="empty-tip">未提取到教育经历</p>'}
        </div>
        <div class="parsed-block" style="grid-column:1/-1">
          <h4>主要经历</h4>
          <ul>${(p.experience || []).map(e => `<li>${e}</li>`).join('') || '<li>未提取到经历</li>'}</ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Panel: Match -->
  <div class="tab-panel" id="panel-match">
    <div class="card">
      <h3 class="panel-title">匹配度分项评分</h3>
      <div class="match-bars">
        ${buildMatchBar('技能匹配度', d.skillMatch || 0)}
        ${buildMatchBar('经验相关性', d.experienceMatch || 0)}
        ${buildMatchBar('学历符合度', d.educationMatch || 0)}
        ${buildMatchBar('软实力评估', d.softSkillMatch || 0)}
      </div>
    </div>

    ${result.highlights && result.highlights.length ? `
    <div class="card">
      <h3 class="panel-title">✅ 简历亮点</h3>
      <ul class="highlight-list">
        ${result.highlights.map(h => `<li>${h}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div class="card">
      <h3 class="panel-title">技能匹配详情</h3>
      <div class="skill-section">
        ${skillDetails.matched && skillDetails.matched.length ? `
        <div>
          <p class="skill-section-label">✅ 已匹配</p>
          <div class="skill-badge-row">
            ${skillDetails.matched.map(s => `<span class="skill-badge skill-badge-green">${s}</span>`).join('')}
          </div>
        </div>` : ''}
        ${skillDetails.partial && skillDetails.partial.length ? `
        <div>
          <p class="skill-section-label">⚡ 部分匹配</p>
          <div class="skill-badge-row">
            ${skillDetails.partial.map(s => `<span class="skill-badge skill-badge-amber">${s}</span>`).join('')}
          </div>
        </div>` : ''}
        ${skillDetails.missing && skillDetails.missing.length ? `
        <div>
          <p class="skill-section-label">❌ 待补充</p>
          <div class="skill-badge-row">
            ${skillDetails.missing.map(s => `<span class="skill-badge skill-badge-red">${s}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>
  </div>

  <!-- Panel: Gap -->
  <div class="tab-panel" id="panel-gap">
    <div class="card">
      <h3 class="panel-title">四维匹配雷达图</h3>
      <div class="radar-container">
        <canvas id="radarCanvas" width="420" height="420"></canvas>
        <div class="radar-legend" id="radarLegend"></div>
      </div>
    </div>
    ${result.gaps && result.gaps.length ? `
    <div class="card">
      <h3 class="panel-title">差距详情</h3>
      <div class="gap-detail-list">
        ${result.gaps.map(g => `
          <div class="gap-detail-item">
            <div class="gap-detail-header">
              <span class="gap-area">${g.area}</span>
            </div>
            <div class="gap-detail-body">
              <div class="gap-row"><span class="gap-label current">当前</span><span>${g.current}</span></div>
              <div class="gap-row"><span class="gap-label required">要求</span><span>${g.required}</span></div>
              <div class="gap-row"><span class="gap-label suggest">建议</span><span>${g.suggestion}</span></div>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}
  </div>

  <!-- Panel: Suggest -->
  <div class="tab-panel" id="panel-suggest">
    <div class="card">
      <h3 class="panel-title">AI 简历优化建议</h3>
      <p class="card-desc">以下建议基于 Gap 分析，针对目标 JD 定向生成。格式：<strong>[位置] → [修改建议] → [理由]</strong></p>
      <div class="suggest-list">
        ${(result.suggestions || []).map((s, i) => `
          <div class="suggest-item">
            <span class="suggest-num">${i + 1}</span>
            <div class="suggest-text">
              <div class="suggest-location">[${s.location || '建议' + (i+1)}]</div>
              <p>→ <strong>${s.change || ''}</strong></p>
              ${s.reason ? `<p class="suggest-reason">💡 ${s.reason}</p>` : ''}
            </div>
          </div>`).join('') || '<p class="empty-tip">暂无优化建议</p>'}
      </div>
    </div>
  </div>
  `;
}

function buildDimTag(label, value) {
  const cls = value >= 75 ? 'dim-tag-high' : value >= 50 ? 'dim-tag-mid' : 'dim-tag-low';
  const level = value >= 75 ? '优' : value >= 50 ? '中' : '弱';
  return `<span class="dim-tag ${cls}">${label} ${level} ${value}%</span>`;
}

function buildMatchBar(label, value) {
  const color = value >= 75 ? 'var(--c-green)' : value >= 50 ? 'var(--brand-teal)' : 'var(--c-amber)';
  return `
    <div class="match-bar-item">
      <label>${label} <span style="color:${color}">${value}%</span></label>
      <div class="match-bar-track">
        <div class="match-bar-fill" data-width="${value}" style="background:${color}"></div>
      </div>
    </div>`;
}

function initResultInteractions(containerId, result) {
  // Animate score circle
  setTimeout(() => {
    const circles = document.querySelectorAll(`#${containerId} .score-circle-anim`);
    circles.forEach(c => {
      c.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)';
      c.style.strokeDashoffset = c.dataset.offset;
    });
  }, 100);

  // Animate score count
  setTimeout(() => {
    document.querySelectorAll(`#${containerId} .score-count-anim`).forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      animateCount(el, 0, target, 1200);
    });
  }, 200);

  // Animate match bars
  setTimeout(() => {
    document.querySelectorAll(`#${containerId} .match-bar-fill`).forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 300);

  // Store radar chart data on the result section element for lazy render
  const d = result.dimensions || {};
  const chartData = {
    labels: ['技能匹配', '经验相关', '学历符合', '软实力'],
    values: [d.skillMatch || 0, d.experienceMatch || 0, d.educationMatch || 0, d.softSkillMatch || 0],
    colors: ['#2a9d73', '#f06530', '#2563EB', '#D97706']
  };
  const container = document.getElementById(containerId);
  if (container) container.dataset.radarData = JSON.stringify(chartData);
}

function animateCount(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function switchResultTab(btn, tabId) {
  // Find the current result section (parent of tab-nav)
  const resultSection = btn.closest('.tab-nav').parentElement;
  resultSection.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  resultSection.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = resultSection.querySelector('#panel-' + tabId);
  if (panel) panel.classList.add('active');

  if (tabId === 'gap') {
    // Read chart data from the result section's dataset (avoids global variable conflicts)
    let chartData = null;
    try { chartData = JSON.parse(resultSection.dataset.radarData); } catch(e) {}
    if (chartData) {
      setTimeout(() => {
        const canvas = resultSection.querySelector('#radarCanvas');
        const legend = resultSection.querySelector('#radarLegend');
        renderDynamicGapChart(chartData, canvas, legend);
      }, 50);
    }
  }
}

function renderDynamicGapChart(data, canvasEl, legendEl) {
  const canvas = canvasEl || document.getElementById('radarCanvas');
  if (!canvas || !data) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 420;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2, maxR = 120;
  const n = data.labels.length;
  const colors = data.colors || ['#2a9d73', '#f06530', '#2563EB', '#D97706'];
  const values = data.values;

  // Angles (start from top)
  const angles = [];
  for (let i = 0; i < n; i++) {
    angles.push(-Math.PI / 2 + (2 * Math.PI * i) / n);
  }

  // Helper: get point on axis
  function point(axisIdx, ratio) {
    const a = angles[axisIdx];
    return { x: cx + Math.cos(a) * maxR * ratio, y: cy + Math.sin(a) * maxR * ratio };
  }

  // Draw grid rings
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const r = maxR * (ring / 4);
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = angles[i % n];
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Draw axis lines
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angles[i]) * maxR, cy + Math.sin(angles[i]) * maxR);
    ctx.stroke();
  }

  // Draw data polygon fill
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const v = Math.max(0, Math.min(100, values[idx] || 0)) / 100;
    const p = point(idx, v);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(42, 157, 115, 0.12)';
  ctx.fill();

  // Draw data polygon stroke
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const v = Math.max(0, Math.min(100, values[idx] || 0)) / 100;
    const p = point(idx, v);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = '#2a9d73';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw data points with per-axis colors
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(100, values[i] || 0)) / 100;
    const p = point(i, v);

    // Outer ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = colors[i];
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = colors[i];
    ctx.fill();
  }

  // Draw labels + value annotations
  ctx.font = '600 13px "DM Sans", "Noto Sans SC", sans-serif';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const labelR = maxR + 26;
    const a = angles[i];
    let lx = cx + Math.cos(a) * labelR;
    let ly = cy + Math.sin(a) * labelR;

    // Align text
    if (Math.abs(Math.cos(a)) < 0.1) ctx.textAlign = 'center';
    else if (Math.cos(a) > 0) ctx.textAlign = 'left';
    else ctx.textAlign = 'right';

    // Label
    ctx.fillStyle = '#57534e';
    ctx.fillText(data.labels[i], lx, ly);

    // Value below label
    ctx.font = '700 12px "DM Sans", sans-serif';
    ctx.fillStyle = colors[i];
    const valText = values[i] + '%';
    ctx.fillText(valText, lx, ly + 16);

    // Reset font
    ctx.font = '600 13px "DM Sans", "Noto Sans SC", sans-serif';
  }

  // Build legend with progress bars
  const legend = legendEl || document.getElementById('radarLegend');
  if (legend) {
    let legendHTML = '';
    for (let i = 0; i < n; i++) {
      const v = values[i] || 0;
      legendHTML += `
        <div class="radar-legend-item">
          <div class="radar-legend-label">
            <span class="radar-legend-dot" style="background:${colors[i]}"></span>
            ${data.labels[i]} ${v}%
          </div>
          <div class="radar-legend-bar-track">
            <div class="radar-legend-bar-fill" style="background:${colors[i]};width:0" data-width="${v}"></div>
          </div>
        </div>`;
    }
    legend.innerHTML = legendHTML;

    // Animate legend bars
    setTimeout(() => {
      legend.querySelectorAll('.radar-legend-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
    }, 100);
  }
}

// ========== TOAST ==========

function showToast(msg, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// ========== DRAG & DROP UPLOAD ==========

(function initDragDrop() {
  // Map each upload zone to its file input and handler
  const zones = [
    { zoneId: 'uploadZoneA',      inputId: 'fileInputA',      handler: 'handleFileUpload',   target: 'A' },
    { zoneId: 'uploadZoneB_jd',   inputId: 'fileInputB_jd',   handler: 'handleJDFileUpload', target: 'B' },
    { zoneId: 'uploadZoneB_resume',inputId:'fileInputB_resume',handler: 'handleFileUpload',  target: 'B_resume' },
    { zoneId: 'uploadZoneC',      inputId: 'fileInputC',      handler: 'handleFileUpload',   target: 'C' },
    { zoneId: 'uploadZoneC_jd',   inputId: 'fileInputC_jd',   handler: 'handleJDFileUpload', target: 'C' },
  ];

  zones.forEach(({ zoneId, handler, target }) => {
    const zone = document.getElementById(zoneId);
    if (!zone) return;

    let dragCounter = 0; // track nested enter/leave

    zone.addEventListener('dragenter', e => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      zone.classList.add('drag-active');
    });

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('drag-active');
    });

    zone.addEventListener('dragleave', e => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        zone.classList.remove('drag-active');
      }
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      zone.classList.remove('drag-active');

      const files = e.dataTransfer.files;
      if (!files.length) return;

      // Validate file type
      const allowed = ['.pdf', '.docx', '.doc', '.txt'];
      const file = files[0];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowed.includes(ext)) {
        showToast('不支持的文件格式，请上传 PDF / DOCX / TXT 文件');
        return;
      }

      // Construct a synthetic event and call the existing handler
      const handlerFn = window[handler];
      if (typeof handlerFn === 'function') {
        // Create a minimal event-like object with target.files
        const syntheticInput = document.createElement('input');
        syntheticInput.type = 'file';
        const dt = new DataTransfer();
        dt.items.add(file);
        syntheticInput.files = dt.files;
        handlerFn({ target: syntheticInput }, target);
      }
    });
  });
})();

// ========== INIT ==========
// Ensure pdfjsLib workerSrc is set after all scripts load
window.addEventListener('load', function () {
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
});
