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

        // PDF Color scheme (professional print colors)
        const colors = {
            primary: '#000000',      // Black for main text
            accent: '#00635A',       // Dark teal for headers
            secondary: '#217A6E',    // Medium teal for subheaders
            background: '#FFFFFF',   // White background
            muted: '#505050'         // Gray for secondary text
        };

        // Helper function for adding wrapped text
        const addWrappedText = (text, size = 11, color = colors.primary, isBold = false) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.setTextColor(color.replace('#', ''));
            const lines = doc.splitTextToSize(text, contentWidth);
            doc.text(lines, margin, yPos);
            return (lines.length * size * 0.352) + 5;
        };

        // Helper function for adding sections with proper spacing
        const addSection = (title, content, titleSize = 14, contentSize = 11) => {
            // Add section title
            yPos += addWrappedText(title, titleSize, colors.accent, true);
            yPos += 2; // Small gap between title and content
            
            // Add content
            yPos += addWrappedText(content, contentSize, colors.primary);
            yPos += 5; // Space after section

            // Check if we need a new page
            if (yPos > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                yPos = 20;
            }
        };

        // Add header with styling
        doc.setFillColor(colors.accent.replace('#', ''));
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Header text
        doc.setTextColor('#FFFFFF');
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('PreGrant Evaluation Report', margin, 25);

        yPos = 50; // Reset position after header

        // Project Information Box
        doc.setDrawColor(colors.accent.replace('#', ''));
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos - 5, contentWidth, 25);
        
        // Project details
        doc.setFontSize(12);
        doc.setTextColor(colors.primary.replace('#', ''));
        doc.setFont('helvetica', 'bold');
        doc.text(`Project: ${results.projectName}`, margin + 5, yPos + 5);
        doc.text(`Grant: ${results.grantName}`, margin + 5, yPos + 15);
        
        yPos += 30; // Move past the box

        // Score Overview Box
        doc.setFillColor('#F8F9FA');
        doc.rect(margin, yPos, contentWidth, 20, 'F');
        doc.setFontSize(16);
        doc.setTextColor(colors.accent.replace('#', ''));
        doc.text(`Overall Score: ${results.totalScore}%`, margin + 5, yPos + 13);
        
        yPos += 30;

        // Main content sections
        addSection('Executive Summary', results.summary);

        // Score Breakdown Table
        yPos += 10;
        doc.setFillColor('#F8F9FA');
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor(colors.accent.replace('#', ''));
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Category Score Breakdown', margin + 5, yPos + 7);
        yPos += 20;

        // Process each score with improved formatting
        results.scores.forEach((score, index) => {
            // Check for page break
            if (yPos > doc.internal.pageSize.getHeight() - 60) {
                doc.addPage();
                yPos = 20;
            }

            // Category header with score
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colors.accent.replace('#', ''));
            
            // Draw category background
            if (index % 2 === 0) {
                doc.setFillColor('#F8F9FA');
                doc.rect(margin, yPos - 5, contentWidth, 15, 'F');
            }
            
            // Category name (left-aligned)
            doc.text(score.criteria, margin + 5, yPos + 5);
            
            // Score (right-aligned)
            const scoreText = `${score.score}/10`;
            const scoreWidth = doc.getStringUnitWidth(scoreText) * 12 / doc.internal.scaleFactor;
            doc.text(scoreText, pageWidth - margin - scoreWidth - 5, yPos + 5);
            
            yPos += 15;

            // Category feedback (normal text, slightly indented)
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(colors.primary.replace('#', ''));
            
            const commentLines = doc.splitTextToSize(score.comments, contentWidth - 10);
            doc.text(commentLines, margin + 5, yPos);
            
            // Calculate space needed for comments and add padding
            yPos += (commentLines.length * 11 * 0.352) + 15;
        });

        // Detailed Analysis Sections
        addSection('Innovation Analysis', results.innovationAnalysis);
        addSection('Expert Review', results.reviewerFeedback);

        // Recommendations
        yPos += 5;
        addSection('Key Recommendations', '');
        results.recommendations.forEach((rec, index) => {
            yPos += addWrappedText(`${index + 1}. ${rec}`, 11, colors.primary);
        });

        // Final Assessment
        yPos += 10;
        addSection('Final Assessment', results.finalAssessment);

        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 15;
        doc.setDrawColor(colors.accent.replace('#', ''));
        doc.setLineWidth(0.5);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
        
        doc.setFontSize(9);
        doc.setTextColor(colors.muted.replace('#', ''));
        const today = new Date().toLocaleDateString();
        doc.text(`Generated by PreGrant AI Evaluation System | ${today}`, margin, footerY);
        doc.text('Page ' + doc.internal.getCurrentPageInfo().pageNumber, pageWidth - margin - 20, footerY);

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
