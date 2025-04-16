// Initialize jsPDF
window.jsPDF = window.jspdf.jsPDF;

// DOM Elements
const grantCallTextarea = document.getElementById('grantCall');
const projectDescTextarea = document.getElementById('projectDesc');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultContainer = document.getElementById('resultContainer');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');

// Additional DOM Elements
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const evaluationHistory = document.getElementById('evaluationHistory');
const loadingIndicator = document.querySelector('.loading-indicator');
const btnText = document.querySelector('.btn-text');

// Configuration
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Store evaluations in localStorage
const STORAGE_KEY = 'pregrant_evaluations';
let evaluationsHistory = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

// Dynamic categories and their detection rules
const dynamicCategories = {
    Sustainability: {
        keywords: ['sustainable', 'long-term', 'environmental', 'post-funding', 'maintenance'],
        description: 'Long-term viability and environmental impact'
    },
    'Budget Appropriateness': {
        keywords: ['budget', 'cost', 'funding', 'financial', 'expense'],
        description: 'Financial planning and value for money'
    },
    'Scalability/Replicability': {
        keywords: ['scale', 'growth', 'expand', 'replicate', 'adapt'],
        description: 'Potential for growth and adaptation'
    },
    'Ethical/Legal Compliance': {
        keywords: ['ethics', 'legal', 'compliance', 'regulation', 'privacy', 'gdpr', 'sensitive data'],
        description: 'Regulatory and ethical considerations'
    },
    'Technology Readiness Level': {
        keywords: ['trl', 'technology readiness', 'prototype', 'proof of concept', 'mvp'],
        description: 'Stage of technological development'
    }
};

// Detect relevant categories based on text content
function detectRelevantCategories(text) {
    const relevantCategories = [];
    const lowercaseText = text.toLowerCase();
    
    for (const [category, info] of Object.entries(dynamicCategories)) {
        if (info.keywords.some(keyword => lowercaseText.includes(keyword.toLowerCase()))) {
            relevantCategories.push({
                name: category,
                description: info.description
            });
        }
    }
    return relevantCategories;
}

// AI Prompt template
function generatePrompt(grantCall, projectDesc, relevantCategories) {
    return `You are an expert grant evaluator. Analyze the following grant proposal and provide a structured evaluation.

GRANT CALL:
${grantCall}

PROJECT DESCRIPTION:
${projectDesc}

Evaluate the project considering these aspects:
1. Overall alignment with grant objectives
2. Innovation and uniqueness
3. Feasibility and implementation
4. Potential impact
${relevantCategories.map(cat => `5. ${cat.name}: ${cat.description}`).join('\n')}

Provide a JSON response with:
{
    "projectName": "Extract from first line or most relevant title",
    "grantName": "Extract from grant call",
    "summary": "2-3 sentences overall evaluation",
    "scores": [
        {
            "criteria": "string",
            "score": number (0-10),
            "comments": "string"
        }
    ],
    "innovationAnalysis": "string",
    "reviewerFeedback": "string",
    "recommendations": ["string"],
    "finalAssessment": "string",
    "totalScore": number (0-100)
}`;
}

// Test API connection
async function testAPIConnection() {
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello'
                    }
                ]
            })
        });
        
        console.log('API Test Response:', response);
        const data = await response.json();
        console.log('API Test Data:', data);
        return true;
    } catch (error) {
        console.error('API Test Error:', error);
        return false;
    }
}

// Show loading state
function showLoading() {
    console.log('Showing loading state...');
    analyzeBtn.disabled = true;
    analyzeBtn.classList.add('loading');
    btnText.textContent = 'Analyzing...';
}

// Hide loading state
function hideLoading() {
    console.log('Hiding loading state...');
    analyzeBtn.disabled = false;
    analyzeBtn.classList.remove('loading');
    btnText.textContent = 'Analyze Grant Fit';
}

// Enhanced error handling
function handleError(error, phase = 'unknown') {
    console.error(`Error during ${phase}:`, error);
    let errorMessage = 'An error occurred. ';
    
    if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Could not connect to the API. Please check your internet connection.';
    } else if (error.message.includes('401')) {
        errorMessage += 'API authentication failed. Please check your API key.';
    } else if (error.message.includes('429')) {
        errorMessage += 'Too many requests. Please try again later.';
    } else {
        errorMessage += error.message;
    }
    
    alert(errorMessage);
    hideLoading();
}

// Groq API integration
async function callGroqAPI(prompt) {
    console.log('Starting API call with prompt:', prompt);
    
    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert grant evaluator. Your responses must be in valid JSON format.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048,
                response_format: { "type": "json_object" }
            })
        });

        console.log('API Response Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response Data:', data);

        if (!data.choices?.[0]?.message) {
            throw new Error('Invalid API response format');
        }

        const content = data.choices[0].message.content;
        console.log('Response Content:', content);

        const result = typeof content === 'string' ? JSON.parse(content) : content;
        console.log('Parsed Result:', result);
        return result;
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, testing API connection...');
    const isConnected = await testAPIConnection();
    console.log('API connection test result:', isConnected);
});

// Main evaluation function
async function evaluateGrantFit(grantCall, projectDesc) {
    try {
        console.log('Starting evaluation...');
        
        // Detect relevant categories
        const relevantCategories = detectRelevantCategories(grantCall + ' ' + projectDesc);
        console.log('Detected categories:', relevantCategories);
        
        // Generate and send prompt to Groq
        const prompt = generatePrompt(grantCall, projectDesc, relevantCategories);
        const evaluation = await callGroqAPI(prompt);
        
        // Store evaluation in history
        const evaluationWithTimestamp = {
            ...evaluation,
            timestamp: new Date().toISOString(),
            grantCall,
            projectDesc
        };
        evaluationsHistory.unshift(evaluationWithTimestamp);
        if (evaluationsHistory.length > 10) evaluationsHistory.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(evaluationsHistory));
        
        return evaluation;
    } catch (error) {
        console.error('Error in evaluateGrantFit:', error);
        throw new Error(`Evaluation failed: ${error.message}`);
    }
}

// Toggle history panel
historyToggle.addEventListener('click', () => {
    historyPanel.classList.toggle('open');
    updateHistoryPanel();
});

// Update history panel with stored evaluations
function updateHistoryPanel() {
    evaluationHistory.innerHTML = '';
    evaluationsHistory.forEach((eval, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <h4>${eval.projectName}</h4>
            <p class="history-date">${new Date(eval.timestamp).toLocaleDateString()}</p>
            <p class="history-score">Score: ${eval.totalScore}%</p>
            <button class="history-load-btn" data-index="${index}">Load</button>
        `;
        evaluationHistory.appendChild(item);
    });

    // Add event listeners to load buttons
    document.querySelectorAll('.history-load-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const eval = evaluationsHistory[parseInt(btn.dataset.index)];
            grantCallTextarea.value = eval.grantCall;
            projectDescTextarea.value = eval.projectDesc;
            updateUI(eval);
            historyPanel.classList.remove('open');
        });
    });
}

// Enhanced updateUI function with animations
function updateUI(results) {
    document.getElementById('projectName').textContent = results.projectName;
    document.getElementById('grantCallName').textContent = results.grantName;
    document.getElementById('evaluationSummary').textContent = results.summary;
    
    // Update score table
    const scoreTableBody = document.getElementById('scoreTableBody');
    scoreTableBody.innerHTML = '';
    results.scores.forEach(score => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${score.criteria}</td>
            <td>${score.score}/10</td>
            <td>${score.comments}</td>
        `;
        scoreTableBody.appendChild(row);
    });

    document.getElementById('innovationAnalysis').textContent = results.innovationAnalysis;
    document.getElementById('reviewerFeedback').textContent = results.reviewerFeedback;
    
    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';
    results.recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });

    document.getElementById('finalAssessment').textContent = results.finalAssessment;
    document.getElementById('totalScore').textContent = '0%';

    // Add animation classes
    document.querySelectorAll('.slide-in').forEach(el => {
        el.style.opacity = '0';
        void el.offsetWidth; // Trigger reflow
        el.style.opacity = '';
    });

    // Animate score
    const totalScoreEl = document.getElementById('totalScore');
    totalScoreEl.textContent = '0%';
    void totalScoreEl.offsetWidth; // Trigger reflow
    totalScoreEl.textContent = `${results.totalScore}%`;
    totalScoreEl.parentElement.classList.add('score-animate');

    resultContainer.classList.remove('hidden');
}

// Enhanced PDF generation with custom styling
function generatePDF(results) {
    try {
        console.log('Starting PDF generation...', results);
        
        // Initialize jsPDF with portrait orientation
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set initial position
        let yPos = 20;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);

        // Helper function for adding wrapped text
        const addWrappedText = (text, size = 12, isBold = false) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            const lines = doc.splitTextToSize(text, contentWidth);
            doc.text(lines, margin, yPos);
            yPos += (lines.length * size * 0.352) + 5;
        };

        // Add header with styling
        doc.setFillColor(37, 99, 235); // Primary blue color
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        addWrappedText('PreGrant Evaluation Report', 24, true);
        addWrappedText('Grant Readiness & Innovation Alignment Assessment', 16);

        // Reset text color for body
        doc.setTextColor(0, 0, 0);
        yPos += 10;

        // Project Information
        addWrappedText(`Project Name: ${results.projectName}`, 14, true);
        addWrappedText(`Grant Call: ${results.grantName}`, 14, true);
        yPos += 5;

        // Evaluation Summary
        addWrappedText('Evaluation Summary', 16, true);
        addWrappedText(results.summary);
        yPos += 5;

        // Score Breakdown
        addWrappedText('Category Score Breakdown', 16, true);
        results.scores.forEach(score => {
            addWrappedText(`${score.criteria}: ${score.score}/10`, 12, true);
            addWrappedText(score.comments);
        });
        yPos += 5;

        // Check if we need a new page
        if (yPos > doc.internal.pageSize.getHeight() - 60) {
            doc.addPage();
            yPos = 20;
        }

        // Innovation Analysis
        addWrappedText('Innovation Analysis', 16, true);
        addWrappedText(results.innovationAnalysis);
        yPos += 5;

        // Reviewer Feedback
        addWrappedText('Reviewer Feedback', 16, true);
        addWrappedText(results.reviewerFeedback);
        yPos += 5;

        // Recommendations
        addWrappedText('Recommendations', 16, true);
        results.recommendations.forEach((rec, index) => {
            addWrappedText(`${index + 1}. ${rec}`);
        });
        yPos += 5;

        // Final Assessment
        addWrappedText('Final Assessment', 16, true);
        addWrappedText(results.finalAssessment);
        addWrappedText(`Total Score: ${results.totalScore}%`, 18, true);

        // Add footer
        const footerY = doc.internal.pageSize.getHeight() - 15;
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        doc.setFontSize(10);
        const today = new Date().toLocaleDateString();
        doc.text(`Evaluator: AI-Powered Strategic Review | Date: ${today}`, margin, footerY);

        // Save the PDF
        const filename = `PreGrant_Evaluation_${results.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        console.log('Saving PDF as:', filename);
        doc.save(filename);
        
        console.log('PDF generation completed successfully');
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
}

// Event Listeners
analyzeBtn.addEventListener('click', async (event) => {
    console.log('Analyze button clicked');
    event.preventDefault();
    
    const grantCall = grantCallTextarea.value.trim();
    const projectDesc = projectDescTextarea.value.trim();

    console.log('Input values:', { grantCall: grantCall.length, projectDesc: projectDesc.length });

    if (!grantCall || !projectDesc) {
        alert('Please fill in both the Grant Call Description and Project Description fields.');
        return;
    }

    showLoading();

    try {
        console.log('Starting evaluation...');
        const results = await evaluateGrantFit(grantCall, projectDesc);
        console.log('Evaluation results:', results);
        
        if (!results || !results.scores || !results.summary) {
            throw new Error('Invalid evaluation results format');
        }
        
        updateUI(results);
        updateHistoryPanel();
        
        console.log('Evaluation completed successfully');
    } catch (error) {
        handleError(error, 'evaluation');
    } finally {
        hideLoading();
    }
});

downloadPdfBtn.addEventListener('click', async () => {
    console.log('Download PDF button clicked');
    const grantCall = grantCallTextarea.value.trim();
    const projectDesc = projectDescTextarea.value.trim();
    
    if (!grantCall || !projectDesc) {
        alert('Please complete the evaluation first.');
        return;
    }

    try {
        showLoading();
        const results = await evaluateGrantFit(grantCall, projectDesc);
        generatePDF(results);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    } finally {
        hideLoading();
    }
}); 
