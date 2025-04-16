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
    return `You are an expert grant evaluator with extensive experience in research, innovation, and funding assessment. Provide a comprehensive and detailed evaluation of the following grant proposal, offering specific insights and actionable recommendations.

GRANT CALL:
${grantCall}

PROJECT DESCRIPTION:
${projectDesc}

Conduct a thorough analysis considering these key dimensions:

1. Strategic Alignment (0-10):
- How well does the project align with the grant's objectives?
- What specific aspects demonstrate strong/weak alignment?
- Are there any gaps between the project goals and grant requirements?

2. Innovation & Impact (0-10):
- Evaluate the uniqueness and novelty of the proposed approach
- Assess the potential for breakthrough outcomes
- Consider both short-term and long-term impact potential
- Analyze the competitive advantage and market positioning

3. Methodology & Implementation (0-10):
- Evaluate the technical feasibility and approach
- Assess resource allocation and timeline realism
- Consider risk management and mitigation strategies
- Examine the team's capability and expertise

4. Sustainability & Scalability (0-10):
- Assess long-term viability and growth potential
- Evaluate the scaling strategy and market opportunity
- Consider financial sustainability beyond the grant period
- Analyze potential partnerships and ecosystem engagement

${relevantCategories.map(cat => `5. ${cat.name} (0-10):
- ${cat.description}
- Evaluate specific strengths and weaknesses
- Provide detailed recommendations for improvement
`).join('\n')}

Provide a JSON response with the following detailed sections:

{
    "projectName": "Extract or synthesize an appropriate project name",
    "grantName": "Extract or synthesize the grant program name",
    "summary": "Provide a comprehensive 3-4 paragraph evaluation summary that captures the key strengths, weaknesses, and overall assessment. Include specific examples and detailed observations. Address both the potential impact and any critical concerns.",
    "scores": [
        {
            "criteria": "string",
            "score": number (0-10),
            "comments": "Provide detailed 2-3 paragraph analysis for each criteria, including specific examples, potential improvements, and comparative assessment against industry standards or similar projects"
        }
    ],
    "innovationAnalysis": "Deliver a thorough 3-4 paragraph analysis of the project's innovative aspects, including: 
    - Detailed assessment of technological or methodological novelty
    - Comparison with existing solutions or approaches
    - Analysis of potential market impact and competitive advantage
    - Evaluation of innovation sustainability and future development potential",
    "reviewerFeedback": "Provide comprehensive 3-4 paragraph professional feedback covering:
    - Detailed strengths and areas of excellence
    - Specific areas requiring improvement or clarification
    - Strategic recommendations for enhancing the proposal
    - Risk assessment and mitigation suggestions
    - Implementation considerations and critical success factors",
    "recommendations": [
        "Provide 6-8 detailed, actionable recommendations that are:
        - Specific and implementable
        - Prioritized by importance
        - Linked to evaluation criteria
        - Forward-looking and strategic"
    ],
    "finalAssessment": "Deliver a comprehensive 2-3 paragraph conclusion that:
    - Synthesizes the overall evaluation
    - Highlights key differentiators
    - Provides a clear funding recommendation
    - Outlines critical success factors
    - Addresses potential challenges and opportunities",
    "totalScore": "Calculate a weighted average score (0-100) based on all evaluation criteria"
}

Ensure each section provides specific, actionable insights and maintains a professional, constructive tone throughout the evaluation. Focus on both current strengths and potential for improvement.`;
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
        console.log('Starting PDF generation...');
        
        // Initialize jsPDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Constants for layout
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const contentWidth = pageWidth - (margin * 2);
        let yPos = 20;

        // Color scheme for PDF (ensuring readability)
        const colors = {
            text: '#111111',          // Dark text for readability
            headerBg: '#0F1A23',      // Dark background for header
            sectionBg: '#00BFA5',     // Teal for section headers
            tableBg: '#F8F9FA',       // Light gray for table backgrounds
            muted: '#666666'          // Gray for secondary text
        };

        // Table column configuration
        const colWidths = {
            category: 60,
            score: 25,
            comments: contentWidth - 90  // Remaining space for comments
        };

        // Helper function for adding wrapped text
        const addWrappedText = (text, x, y, maxWidth, fontSize = 11, isBold = false) => {
            doc.setFontSize(fontSize);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * fontSize * 0.352;
        };

        // Title Block
        doc.setFillColor(colors.headerBg);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Report Title
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PreGrant Evaluation Report', pageWidth/2, 25, { align: 'center' });

        // Project Details
        doc.setFontSize(12);
        doc.text(results.projectName, pageWidth/2, 35, { align: 'center' });

        yPos = 55;

        // Overall Score
        doc.setFillColor(colors.tableBg);
        doc.rect(margin, yPos, contentWidth, 20, 'F');
        doc.setTextColor(colors.text);
        doc.setFontSize(16);
        doc.text(`Overall Score: ${results.totalScore}%`, pageWidth/2, yPos + 13, { align: 'center' });
        yPos += 30;

        // Executive Summary
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', margin + 5, yPos + 7);
        yPos += 15;

        // Summary content
        doc.setTextColor(colors.text);
        doc.setFont('helvetica', 'normal');
        yPos += addWrappedText(results.summary, margin, yPos, contentWidth);
        yPos += 10;

        // Category Score Breakdown Table
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFont('helvetica', 'bold');
        doc.text('Category Score Breakdown', margin + 5, yPos + 7);
        yPos += 15;

        // Table headers
        doc.setFillColor(colors.tableBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor(colors.text);
        doc.setFontSize(11);
        
        // Header cells
        const headerY = yPos + 7;
        doc.text('Category', margin + 5, headerY);
        doc.text('Score', margin + colWidths.category + (colWidths.score/2), headerY, { align: 'center' });
        doc.text('Assessment', margin + colWidths.category + colWidths.score + 5, headerY);
        yPos += 15;

        // Table rows
        results.scores.forEach((score, index) => {
            const rowHeight = 12;
            const startY = yPos;

            // Check for page break
            if (yPos > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                yPos = 20;
            }

            // Row background
            if (index % 2 === 0) {
                doc.setFillColor(colors.tableBg);
                doc.rect(margin, yPos - 4, contentWidth, rowHeight, 'F');
            }

            // Category name
            doc.setTextColor(colors.text);
            doc.setFont('helvetica', 'bold');
            addWrappedText(score.criteria, margin + 5, yPos + 4, colWidths.category - 5);

            // Score (centered in its column)
            const scoreX = margin + colWidths.category + (colWidths.score/2);
            doc.text(`${score.score}/10`, scoreX, yPos + 4, { align: 'center' });

            // Comments
            doc.setFont('helvetica', 'normal');
            const commentHeight = addWrappedText(
                score.comments,
                margin + colWidths.category + colWidths.score + 5,
                yPos + 4,
                colWidths.comments
            );

            yPos += Math.max(rowHeight, commentHeight + 8);
        });

        // Innovation Analysis
        yPos += 5;
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFont('helvetica', 'bold');
        doc.text('Innovation Analysis', margin + 5, yPos + 7);
        yPos += 15;

        doc.setTextColor(colors.text);
        doc.setFont('helvetica', 'normal');
        yPos += addWrappedText(results.innovationAnalysis, margin, yPos, contentWidth);

        // Reviewer Feedback
        yPos += 10;
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFont('helvetica', 'bold');
        doc.text('Reviewer Feedback', margin + 5, yPos + 7);
        yPos += 15;

        doc.setTextColor(colors.text);
        doc.setFont('helvetica', 'normal');
        yPos += addWrappedText(results.reviewerFeedback, margin, yPos, contentWidth);

        // Recommendations
        yPos += 10;
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFont('helvetica', 'bold');
        doc.text('Key Recommendations', margin + 5, yPos + 7);
        yPos += 15;

        // Numbered recommendations
        doc.setTextColor(colors.text);
        results.recommendations.forEach((rec, index) => {
            if (yPos > doc.internal.pageSize.getHeight() - 30) {
                doc.addPage();
                yPos = 20;
            }
            const bulletPoint = `${index + 1}.`;
            doc.setFont('helvetica', 'bold');
            doc.text(bulletPoint, margin + 5, yPos + 4);
            doc.setFont('helvetica', 'normal');
            yPos += addWrappedText(rec, margin + 15, yPos + 4, contentWidth - 15);
            yPos += 5;
        });

        // Final Assessment (reduced spacing)
        yPos += 5;
        doc.setFillColor(colors.sectionBg);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor('#FFFFFF');
        doc.setFont('helvetica', 'bold');
        doc.text('Final Assessment', margin + 5, yPos + 7);
        yPos += 15;

        doc.setTextColor(colors.text);
        doc.setFont('helvetica', 'normal');
        addWrappedText(results.finalAssessment, margin, yPos, contentWidth);

        // Footer on each page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            const footerY = doc.internal.pageSize.getHeight() - 10;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(colors.muted);
            const dateStr = new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            doc.text(`PreGrant Evaluation Report - Page ${i} of ${pageCount}`, margin, footerY);
            doc.text(dateStr, pageWidth - margin, footerY, { align: 'right' });
        }

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
