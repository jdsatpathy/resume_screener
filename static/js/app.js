/* ============================================================
   RecruitAI — Interactive JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Elements ----
    const form = document.getElementById('screeningForm');
    const jdInput = document.getElementById('job_description');
    const jdDropZone = document.getElementById('jd-drop-zone');
    const jdDropContent = document.getElementById('jd-drop-content');
    const jdPreview = document.getElementById('jd-preview');
    const jdFilename = document.getElementById('jd-filename');
    const jdFilesize = document.getElementById('jd-filesize');
    const jdRemove = document.getElementById('jd-remove');

    const resumesInput = document.getElementById('resumes');
    const resumesDropZone = document.getElementById('resumes-drop-zone');
    const resumesDropContent = document.getElementById('resumes-drop-content');
    const resumeList = document.getElementById('resume-list');
    const resumeItems = document.getElementById('resume-items');
    const resumeCount = document.getElementById('resume-count');
    const clearResumes = document.getElementById('clear-resumes');

    const instructionsTextarea = document.getElementById('special_instructions');
    const charCount = document.getElementById('char-count');

    const submitBtn = document.getElementById('submit-btn');
    const submitBtnContent = document.getElementById('submit-btn-content');
    const submitBtnLoading = document.getElementById('submit-btn-loading');

    const loadingOverlay = document.getElementById('loading-overlay');
    const resultsOverlay = document.getElementById('results-overlay');
    const resultsBody = document.getElementById('results-body');
    const resultsSubtitle = document.getElementById('results-subtitle');
    const resultsClose = document.getElementById('results-close');
    const screenAgainBtn = document.getElementById('screen-again-btn');
    const exportBtn = document.getElementById('export-btn');

    const errorToast = document.getElementById('error-toast');
    const toastMessage = document.getElementById('toast-message');
    const toastClose = document.getElementById('toast-close');

    let selectedResumes = [];
    let currentResults = [];

    // ---- Utility ----
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function showError(message) {
        toastMessage.textContent = message;
        errorToast.style.display = 'flex';
        setTimeout(() => hideError(), 6000);
    }

    function hideError() {
        errorToast.style.display = 'none';
    }

    toastClose.addEventListener('click', hideError);

    // ---- Character Counter ----
    instructionsTextarea.addEventListener('input', () => {
        const len = instructionsTextarea.value.length;
        charCount.textContent = `${len} / 1000`;
        if (len > 900) charCount.style.color = '#f59e0b';
        else if (len >= 1000) charCount.style.color = '#ef4444';
        else charCount.style.color = '';
        if (len > 1000) {
            instructionsTextarea.value = instructionsTextarea.value.slice(0, 1000);
        }
    });

    // ---- JD Drop Zone ----
    setupDropZone(jdDropZone, jdInput, false, handleJDFile);

    jdInput.addEventListener('change', () => {
        if (jdInput.files[0]) handleJDFile(jdInput.files[0]);
    });

    jdRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        clearJD();
    });

    function handleJDFile(file) {
        jdFilename.textContent = file.name;
        jdFilesize.textContent = formatBytes(file.size);
        jdDropContent.style.display = 'none';
        jdPreview.style.display = 'flex';
        jdDropZone.classList.add('has-file');
    }

    function clearJD() {
        jdInput.value = '';
        jdDropContent.style.display = 'block';
        jdPreview.style.display = 'none';
        jdDropZone.classList.remove('has-file');
    }

    // ---- Resumes Drop Zone ----
    setupDropZone(resumesDropZone, resumesInput, true, handleResumeFiles);

    resumesInput.addEventListener('change', () => {
        if (resumesInput.files.length > 0) {
            handleResumeFiles(Array.from(resumesInput.files));
        }
    });

    clearResumes.addEventListener('click', () => {
        selectedResumes = [];
        resumesInput.value = '';
        renderResumeList();
    });

    function handleResumeFiles(files) {
        const allowed = ['pdf', 'docx', 'txt'];
        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!allowed.includes(ext)) {
                showError(`"${file.name}" is not supported. Use PDF, DOCX, or TXT.`);
                return;
            }
            // Avoid duplicates
            if (!selectedResumes.find(f => f.name === file.name && f.size === file.size)) {
                selectedResumes.push(file);
            }
        });
        renderResumeList();
    }

    function renderResumeList() {
        if (selectedResumes.length === 0) {
            resumeList.style.display = 'none';
            resumesDropContent.style.display = 'block';
            return;
        }
        resumeList.style.display = 'block';
        resumesDropContent.style.display = selectedResumes.length === 0 ? 'block' : 'none';
        resumeCount.textContent = `${selectedResumes.length} resume${selectedResumes.length > 1 ? 's' : ''} selected`;
        resumeItems.innerHTML = '';
        selectedResumes.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'resume-item';
            item.innerHTML = `
                <div class="resume-item-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                </div>
                <span class="resume-item-name" title="${file.name}">${file.name}</span>
                <span class="resume-item-size">${formatBytes(file.size)}</span>
                <button type="button" class="file-remove" data-index="${index}" style="z-index:10;position:relative;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            `;
            item.querySelector('.file-remove').addEventListener('click', () => {
                selectedResumes.splice(index, 1);
                renderResumeList();
            });
            resumeItems.appendChild(item);
        });
    }

    // ---- Generic Drop Zone Setup ----
    function setupDropZone(zone, input, multiple, handler) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            if (files.length === 0) return;
            if (multiple) {
                handler(files);
            } else {
                handler(files[0]);
                // Update the file input
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
            }
        });
    }

    // ---- Form Submission ----
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate
        if (!jdInput.files[0]) {
            showError('Please upload a Job Description file.');
            return;
        }
        if (selectedResumes.length === 0) {
            showError('Please upload at least one resume.');
            return;
        }

        // Build FormData
        const formData = new FormData();
        formData.append('job_description', jdInput.files[0]);
        selectedResumes.forEach(file => formData.append('resumes', file));
        formData.append('special_instructions', instructionsTextarea.value);

        // Show loading
        setLoading(true);
        animateLoadingSteps();

        try {
            const response = await fetch('/screen', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Screening failed. Please try again.');
            }

            currentResults = data.results;
            showResults(data.results, data.total_candidates);

        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtnContent.style.display = 'none';
            submitBtnLoading.style.display = 'flex';
            loadingOverlay.style.display = 'flex';
        } else {
            submitBtn.disabled = false;
            submitBtnContent.style.display = 'flex';
            submitBtnLoading.style.display = 'none';
            loadingOverlay.style.display = 'none';
        }
    }

    function animateLoadingSteps() {
        const steps = ['step-1', 'step-2', 'step-3'];
        steps.forEach(id => {
            const el = document.getElementById(id);
            el.classList.remove('active', 'done');
        });
        document.getElementById('step-1').classList.add('active');

        setTimeout(() => {
            document.getElementById('step-1').classList.remove('active');
            document.getElementById('step-1').classList.add('done');
            document.getElementById('step-2').classList.add('active');
        }, 2000);

        setTimeout(() => {
            document.getElementById('step-2').classList.remove('active');
            document.getElementById('step-2').classList.add('done');
            document.getElementById('step-3').classList.add('active');
        }, 4500);
    }

    // ---- Results Display ----
    function showResults(results, total) {
        resultsSubtitle.textContent = `${total} candidate${total > 1 ? 's' : ''} analyzed • Ranked by AI match score`;
        resultsBody.innerHTML = '';

        results.forEach((candidate, index) => {
            const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
            const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${candidate.rank}`;

            const score = candidate.score;
            const scoreClass = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';

            const recClass = {
                'Highly Recommended': 'rec-highly',
                'Recommended': 'rec-recommended',
                'Consider': 'rec-consider',
                'Not Recommended': 'rec-not'
            }[candidate.recommendation] || 'rec-consider';

            const strengthTags = (candidate.strengths || []).slice(0, 4).map(s =>
                `<span class="tag tag-strength">✓ ${escapeHtml(s)}</span>`
            ).join('');

            const gapTags = (candidate.gaps || []).slice(0, 2).map(g =>
                `<span class="tag tag-gap">✗ ${escapeHtml(g)}</span>`
            ).join('');

            const card = document.createElement('div');
            card.className = `candidate-card ${rankClass}`;
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <div class="candidate-header">
                    <div class="rank-badge">${rankEmoji}</div>
                    <div class="candidate-info">
                        <div class="candidate-name">${escapeHtml(candidate.name)}</div>
                        <div class="candidate-meta">
                            <span class="recommendation-badge ${recClass}">${escapeHtml(candidate.recommendation)}</span>
                        </div>
                    </div>
                    <div class="score-display" style="min-width:160px;">
                        <div class="score-bar-wrapper">
                            <div class="score-bar ${scoreClass}" style="width: 0%" data-width="${score}%"></div>
                        </div>
                        <div class="score-number ${scoreClass}">${score}</div>
                    </div>
                </div>
                ${candidate.assessment ? `<div class="candidate-assessment">${escapeHtml(candidate.assessment)}</div>` : ''}
                <div class="candidate-tags">
                    ${strengthTags}
                    ${gapTags}
                </div>
            `;
            resultsBody.appendChild(card);
        });

        resultsOverlay.style.display = 'flex';

        // Animate score bars after render
        requestAnimationFrame(() => {
            setTimeout(() => {
                document.querySelectorAll('.score-bar[data-width]').forEach(bar => {
                    bar.style.width = bar.dataset.width;
                });
            }, 100);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---- Results Controls ----
    resultsClose.addEventListener('click', () => {
        resultsOverlay.style.display = 'none';
    });

    screenAgainBtn.addEventListener('click', () => {
        resultsOverlay.style.display = 'none';
        // Reset form
        clearJD();
        selectedResumes = [];
        renderResumeList();
        instructionsTextarea.value = '';
        charCount.textContent = '0 / 1000';
    });

    exportBtn.addEventListener('click', () => {
        if (!currentResults.length) return;
        const lines = ['RECRUITAI — CANDIDATE RANKING REPORT', '='.repeat(50), ''];
        currentResults.forEach((c, i) => {
            lines.push(`RANK #${c.rank}: ${c.name}`);
            lines.push(`Score: ${c.score}/100 | ${c.recommendation}`);
            lines.push(`Assessment: ${c.assessment}`);
            if (c.strengths?.length) lines.push(`Strengths: ${c.strengths.join(', ')}`);
            if (c.gaps?.length) lines.push(`Gaps: ${c.gaps.join(', ')}`);
            lines.push('');
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `candidate_rankings_${new Date().toISOString().slice(0, 10)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Close results on backdrop click
    resultsOverlay.addEventListener('click', (e) => {
        if (e.target === resultsOverlay) resultsOverlay.style.display = 'none';
    });
});
