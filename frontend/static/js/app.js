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

    // Allow clicking anywhere on the drop zone to open the file picker,
    // even after files have already been selected
    resumesDropZone.addEventListener('click', (e) => {
        // Don't trigger if user clicked a remove button or the clear button
        if (e.target.closest('.file-remove') || e.target.closest('.clear-all-btn') || e.target.closest('#add-more-resumes')) return;
        resumesInput.click();
    });

    resumesInput.addEventListener('change', () => {
        if (resumesInput.files.length > 0) {
            handleResumeFiles(Array.from(resumesInput.files));
            // Reset so the same file can be picked again and the picker always opens fresh
            resumesInput.value = '';
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
            resumesDropZone.classList.remove('has-file');
            return;
        }
        resumeList.style.display = 'block';
        resumesDropContent.style.display = 'none';
        resumesDropZone.classList.add('has-file');
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
            item.querySelector('.file-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                selectedResumes.splice(index, 1);
                renderResumeList();
            });
            resumeItems.appendChild(item);
        });

        // Add "+ Add more files" button at the bottom of the list
        const addMoreBtn = document.createElement('button');
        addMoreBtn.type = 'button';
        addMoreBtn.id = 'add-more-resumes';
        addMoreBtn.className = 'add-more-btn';
        addMoreBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Add more files
        `;
        addMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resumesInput.click();
        });
        resumeItems.appendChild(addMoreBtn);
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
                const dt = new DataTransfer();
                dt.items.add(files[0]);
                input.files = dt.files;
            }
        });
        // Prevent the hidden file input's own click from bubbling up to the zone's click handler
        input.addEventListener('click', (e) => e.stopPropagation());
    }

    // ---- Form Submission ----
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate
        const hasJD = !!jdInput.files[0];
        const hasInstructions = instructionsTextarea.value.trim().length > 0;
        if (!hasJD && !hasInstructions) {
            showError('Please upload a Job Description file or provide Special Instructions.');
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

        // API URL Configuration
        // For S3 hosting, set window.API_BASE_URL in a script tag or let it default to current host
        const API_BASE = window.API_BASE_URL || '';
        const API_URL = `${API_BASE}/screen`;

        try {
            const response = await fetch(API_URL, {
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

    const exportTxtBtn = document.getElementById('export-txt-btn');
    if (exportTxtBtn) {
        exportTxtBtn.addEventListener('click', () => {
            if (!currentResults.length) return;
            const lines = ['RECRUITAI — CANDIDATE RANKING REPORT', '='.repeat(50), ''];
            currentResults.forEach((c) => {
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
            let roleName = jdFilename.textContent || "role";
            roleName = roleName.replace(/\.[^/.]+$/, "");
            a.download = `Interview_Rankings_${roleName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    exportBtn.addEventListener('click', () => {
        if (!currentResults.length) return;

        if (typeof html2pdf === 'undefined') {
            showError("PDF export library is still loading. Please try again in a moment.");
            return;
        }

        const btnOriginalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-right:8px;vertical-align:middle;"></span> Exporting...';
        exportBtn.disabled = true;

        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.background = '#ffffff';

        const pdfContainer = document.createElement('div');
        pdfContainer.style.padding = '40px';
        pdfContainer.style.background = '#ffffff';
        pdfContainer.style.color = '#111827';
        pdfContainer.style.fontFamily = 'Arial, sans-serif';
        pdfContainer.style.width = '800px';

        // append container inside wrapper
        wrapper.appendChild(pdfContainer);

        pdfContainer.innerHTML = `
            <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px; color: #111827;">Candidate Rankings Report</h1>
                <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">${resultsSubtitle.textContent}</p>
            </div>
        `;

        currentResults.forEach((c) => {
            const strengthsHtml = (c.strengths || []).map(s => `<li style="color: #059669; margin-bottom: 4px;">✓ ${escapeHtml(s)}</li>`).join('');
            const gapsHtml = (c.gaps || []).map(g => `<li style="color: #dc2626; margin-bottom: 4px;">✗ ${escapeHtml(g)}</li>`).join('');
            
            const recColor = c.recommendation.includes('Highly') ? '#10b981' : 
                             c.recommendation.includes('Not') ? '#ef4444' : 
                             c.recommendation.includes('Recommended') ? '#3b82f6' : '#f59e0b';

            const card = document.createElement('div');
            card.style.marginBottom = '30px';
            card.style.pageBreakInside = 'avoid';
            card.style.border = '1px solid #e5e7eb';
            card.style.borderRadius = '8px';
            card.style.padding = '20px';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">
                            <span style="color: #6b7280; font-size: 16px; margin-right: 8px;">#${c.rank}</span>
                            ${escapeHtml(c.name)}
                        </h2>
                        <span style="display: inline-block; padding: 4px 12px; background: ${recColor}20; color: ${recColor}; border-radius: 100px; font-size: 12px; font-weight: bold;">
                            ${escapeHtml(c.recommendation)}
                        </span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: bold; color: ${c.score >= 70 ? '#10b981' : c.score >= 45 ? '#f59e0b' : '#ef4444'};">${c.score}/100</div>
                        <div style="font-size: 12px; color: #6b7280;">Match Score</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px; font-size: 14px; color: #4b5563; line-height: 1.5;">
                    ${escapeHtml(c.assessment)}
                </div>

                <div style="display: flex; gap: 24px;">
                    ${strengthsHtml ? `
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px; font-size: 13px; color: #374151; text-transform: uppercase;">Key Strengths</h4>
                        <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px;">${strengthsHtml}</ul>
                    </div>
                    ` : ''}
                    
                    ${gapsHtml ? `
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 8px; font-size: 13px; color: #374151; text-transform: uppercase;">Notable Gaps</h4>
                        <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px;">${gapsHtml}</ul>
                    </div>
                    ` : ''}
                </div>
            `;
            pdfContainer.appendChild(card);
        });

        // Extract role from JD filename for the PDF
        let roleName = jdFilename.textContent || "role";
        roleName = roleName.replace(/\.[^/.]+$/, ""); // strip extension
        const pdfFilename = `Interview_Rankings_${roleName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

        const opt = {
            margin:       0.4,
            filename:     pdfFilename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // Do not attach to document.body, let html2pdf handle it internally
        html2pdf().set(opt).from(wrapper).save().then(() => {
            exportBtn.innerHTML = btnOriginalText;
            exportBtn.disabled = false;
        }).catch(err => {
            console.error("PDF generation error:", err);
            showError("Failed to generate PDF. Please try again.");
            exportBtn.innerHTML = btnOriginalText;
            exportBtn.disabled = false;
        });
    });

    // Close results on backdrop click
    resultsOverlay.addEventListener('click', (e) => {
        if (e.target === resultsOverlay) resultsOverlay.style.display = 'none';
    });
});
