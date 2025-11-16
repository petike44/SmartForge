/*
  SmartForge – Move Contract Generator
  -------------------------------------------------
  Key design decisions:
  - Templates live under ./templates and use {{placeholder}} format.
  - We dynamically parse placeholders to render form inputs.
  - We replace placeholders on Generate and render a read-only preview.
  - Copy and Download buttons are enabled after generation.
  - Graceful handling for missing inputs: we warn but still generate,
    and also include a header comment listing missing fields.
*/

(function () {
  const templateSelect = document.getElementById('templateSelect');
  const fieldsContainer = document.getElementById('dynamicFields');
  const generateBtn = document.getElementById('generateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const codeOutput = document.getElementById('codeOutput');
  const statusEl = document.getElementById('status');

  // Be flexible about template filenames so users can drop in their own
  const TEMPLATE_CANDIDATES = {
    escrow: [
      'escrow.txt',
      'Escrow.txt',
      'escrow_template.txt',
      'Escrow_template.txt'
    ],
    fundraising: [
      'fundraising.txt',
      'Fundraising.txt',
      'fund_template.txt',
      'Fund_template.txt',
      'fund.txt',
      'Fund.txt'
    ]
  };

  // Holds current template text and parsed placeholders
  let currentTemplateRaw = '';
  let currentPlaceholders = [];

  // Utility: escape regex special chars
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Extract {{ placeholder }} identifiers from a template string
  function extractPlaceholders(templateText) {
    const re = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;
    const found = new Set();
    let m;
    while ((m = re.exec(templateText)) !== null) {
      found.add(m[1]);
    }
    return Array.from(found);
  }

  // Render labeled inputs for placeholders
  function renderFields(placeholders) {
    fieldsContainer.innerHTML = '';
    if (!placeholders.length) {
      fieldsContainer.innerHTML = '<p class="help-text">No inputs required for this template.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    placeholders.forEach((name) => {
      const wrap = document.createElement('div');
      wrap.className = 'field-pair';

      const label = document.createElement('label');
      label.setAttribute('for', `in_${name}`);
      label.textContent = name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const input = document.createElement('input');
      input.type = 'text';
      input.id = `in_${name}`;
      input.name = name;
      input.placeholder = `Enter ${name}`;

      wrap.appendChild(label);
      wrap.appendChild(input);
      frag.appendChild(wrap);
    });

    fieldsContainer.appendChild(frag);
  }

  // Fetch a template file by key (escrow, fundraising)
  async function loadTemplate(key) {
    setStatus(`Loading template: ${key}…`);

    const candidates = TEMPLATE_CANDIDATES[key] || [`${key}.txt`];
    let lastError = null;
    for (const name of candidates) {
      const url = `./templates/${name}`;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        currentTemplateRaw = text;
        currentPlaceholders = extractPlaceholders(text);
        renderFields(currentPlaceholders);
        setStatus(`Loaded ${name}. Fill in the fields.`);
        // Clear previous code
        setCode('');
        toggleActions(false);
        return;
      } catch (err) {
        lastError = err;
        // try next candidate
      }
    }

    setStatus(
      `Could not load template (${lastError?.message || 'not found'}). If running locally, please serve this folder via a local web server (file:// cannot fetch).`
    );
    currentTemplateRaw = '';
    currentPlaceholders = [];
    renderFields([]);
    setCode('');
    toggleActions(false);
  }

  // Replace placeholders in the template
  function buildContract(values) {
    let output = currentTemplateRaw;

    Object.entries(values).forEach(([key, val]) => {
      const re = new RegExp('{{\\s*' + escapeRegExp(key) + '\\s*}}', 'g');
      output = output.replace(re, val);
    });

    // Find any remaining placeholders (missing values)
    const missing = extractPlaceholders(output);
    if (missing.length) {
      const header = `/*\n WARNING: Missing inputs for: ${missing.join(', ')}\n These placeholders remain in the generated file.\n*/\n\n`;
      output = header + output;
    }

    return output;
  }

  // Collect values from current inputs
  function collectValues() {
    const values = {};
    currentPlaceholders.forEach((name) => {
      const el = document.getElementById(`in_${name}`);
      let value = (el && el.value != null) ? String(el.value) : '';
      // Lightweight validation: mark empties
      if (el) {
        if (!value) {
          el.classList.add('input-error');
        } else {
          el.classList.remove('input-error');
        }
      }
      values[name] = value;
    });
    return values;
  }

  function setStatus(msg) {
    statusEl.textContent = msg || '';
  }

  function setCode(text) {
    codeOutput.textContent = text || '';
    if (window.hljs && codeOutput.textContent) {
      // Re-highlight on update
      hljs.highlightElement(codeOutput);
    }
  }

  function toggleActions(enabled) {
    copyBtn.disabled = !enabled;
    downloadBtn.disabled = !enabled;
  }

  // Events
  templateSelect.addEventListener('change', (e) => {
    loadTemplate(e.target.value);
  });

  generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!currentTemplateRaw) {
      setStatus('No template loaded.');
      return;
    }
    const values = collectValues();
    const contract = buildContract(values);
    setCode(contract);
    setStatus('Contract generated. You can copy or download it.');
    toggleActions(true);

    // Notify parent host (if embedded via iframe) with the generated code
    try {
      if (window.parent && window.parent !== window) {
        const fileNameBase = (document.getElementById('in_module_name')?.value || templateSelect.value || 'contract')
          .toString()
          .trim()
          .replace(/[^a-zA-Z0-9_-]+/g, '_');
        window.parent.postMessage({
          type: 'sf-contract-generated',
          code: contract,
          fileName: `${fileNameBase || 'contract'}.move`
        }, '*');
      }
    } catch (_) { /* ignore cross-origin errors */ }
  });

  copyBtn.addEventListener('click', async () => {
    const text = codeOutput.textContent || '';
    if (!text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setStatus('Copied to clipboard.');
    } catch (err) {
      setStatus('Copy failed: ' + err.message);
    }
  });

  downloadBtn.addEventListener('click', () => {
    const text = codeOutput.textContent || '';
    if (!text) return;

    const fileNameBase = (document.getElementById('in_module_name')?.value || templateSelect.value || 'contract')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNameBase || 'contract'}.move`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Initial load
  loadTemplate(templateSelect.value);
})();
