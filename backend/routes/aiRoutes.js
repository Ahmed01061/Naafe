import express from 'express';
import aiService from '../services/aiService.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * AI Health Check
 * GET /api/ai/health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'AI service is running',
      timestamp: new Date().toISOString(),
      config: {
        enabled: aiService.config.services.enabled,
        formAssistance: aiService.config.services.formAssistance,
        pricingGuidance: aiService.config.services.pricingGuidance,
        hasApiKey: !!aiService.config.openRouter.apiKey,
        model: aiService.config.openRouter.model
      }
    },
    message: 'AI service health check passed'
  });
});

/**
 * AI Form Writing Assistant
 * POST /api/ai/assist-form
 */
router.post('/assist-form', authenticateToken, async (req, res) => {
  try {
    const { formType, category, userInput, currentFields } = req.body;
    
    console.log('AI Route - Received request:', { formType, category, userInput });
    
    if (!formType || !category || !userInput) {
      return res.status(400).json({
        success: false,
        error: { message: 'formType, category, and userInput are required' }
      });
    }

    const assistance = await aiService.assistFormWriting(
      formType, 
      category, 
      userInput, 
      currentFields || {}
    );
    
    console.log('AI Route - Assistance result:', assistance);

    res.json({
      success: true,
      data: assistance,
      message: 'AI assistance provided successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * AI Pricing Guidance
 * POST /api/ai/pricing-guidance
 */
router.post('/pricing-guidance', authenticateToken, async (req, res) => {
  try {
    const { category, serviceType, location, userBudget, marketData, rating } = req.body;
    
    if (!category || !serviceType) {
      return res.status(400).json({
        success: false,
        error: { message: 'category and serviceType are required' }
      });
    }

    // Get market data if not provided
    const marketInfo = marketData || await aiService.getMarketData(category, location);

    const guidance = await aiService.providePricingGuidance(
      category,
      serviceType,
      location,
      userBudget,
      marketInfo,
      req.body.skills || [],
      rating
    );

    res.json({
      success: true,
      data: guidance,
      message: 'Pricing guidance provided successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * AI Category Suggestion
 * POST /api/ai/suggest-category
 */
router.post('/suggest-category', authenticateToken, async (req, res) => {
  try {
    const { userDescription } = req.body;
    
    if (!userDescription) {
      return res.status(400).json({
        success: false,
        error: { message: 'userDescription is required' }
      });
    }

    const suggestion = await aiService.suggestCategory(userDescription);

    res.json({
      success: true,
      data: suggestion,
      message: 'Category suggestion provided successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * AI Form Validation
 * POST /api/ai/validate-input
 */
router.post('/validate-input', authenticateToken, async (req, res) => {
  try {
    const { fieldName, fieldValue, formType, category } = req.body;
    
    if (!fieldName || fieldValue === undefined || !formType) {
      return res.status(400).json({
        success: false,
        error: { message: 'fieldName, fieldValue, and formType are required' }
      });
    }

    const validation = await aiService.validateFormInput(
      fieldName,
      fieldValue,
      formType,
      category
    );

    res.json({
      success: true,
      data: validation,
      message: 'Input validation completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Test AI Service (No Auth Required)
 * POST /api/ai/test
 */
router.post('/test', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message is required' }
      });
    }

    const response = await aiService.makeRequest([
      { role: 'user', content: message }
    ]);

    res.json({
      success: true,
      data: { response },
      message: 'AI test completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

/**
 * Debug AI Form Assistance (No Auth Required)
 * POST /api/ai/debug-form
 */
router.post('/debug-form', async (req, res) => {
  try {
    const { formType, category, userInput, currentFields } = req.body;
    
    console.log('Debug AI Route - Received request:', { formType, category, userInput });
    
    if (!formType || !category || !userInput) {
      return res.status(400).json({
        success: false,
        error: { message: 'formType, category, and userInput are required' }
      });
    }

    // Test the raw AI request first
    const categoryArabic = aiService.config.formAssistance.categories[category] || category;
    
    const prompt = `You are an AI assistant helping users write better service descriptions and titles for the Naafe marketplace platform.

Form Type: ${formType === 'service' ? 'Service Posting' : 'Service Request'}
Category: ${category} (${categoryArabic})

User's Current Input:
"${userInput}"

Current Form Fields:
${JSON.stringify(currentFields || {}, null, 2)}

Requirements:
1. Suggest an improved title (concise and compelling)
2. Suggest a detailed and professional description
3. Suggest appropriate keywords
4. Write helpful text for the user

CRITICAL: You must respond with ONLY valid JSON. No other text before or after the JSON.

Expected JSON format:
{
  "suggestions": [
    {
      "type": "title",
      "content": "Improved title here",
      "reasoning": "Reason for suggestion"
    },
    {
      "type": "description", 
      "content": "Improved description here",
      "reasoning": "Reason for suggestion"
    },
    {
      "type": "keywords",
      "content": "keyword1, keyword2, keyword3",
      "reasoning": "Reason for suggestion"
    }
  ],
  "enhancedContent": {
    "title": "Best title suggestion",
    "description": "Best description suggestion", 
    "keywords": "best, keywords, here"
  },
  "helpfulText": "Helpful advice for the user"
}

Remember: Return ONLY the JSON object, no additional text or explanations.`;

    const rawResponse = await aiService.makeRequest([
      { 
        role: 'system', 
        content: 'You are a professional form writing assistant. You must ALWAYS respond with valid JSON format only. Never include any text outside the JSON structure. Ensure all JSON keys and values are properly quoted strings.' 
      },
      { role: 'user', content: prompt }
    ]);

    console.log('Debug - Raw AI Response:', rawResponse);
    
    // Try to parse the response
    let parsedResponse = null;
    try {
      parsedResponse = JSON.parse(rawResponse);
    } catch (parseError) {
      console.log('Debug - JSON Parse Error:', parseError);
      // Try to extract JSON
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          console.log('Debug - JSON Extract Error:', extractError);
        }
      }
    }

    // Now test the full service
    const assistance = await aiService.assistFormWriting(
      formType, 
      category, 
      userInput, 
      currentFields || {}
    );

    res.json({
      success: true,
      data: {
        rawResponse,
        parsedResponse,
        finalAssistance: assistance,
        prompt
      },
      message: 'AI debug completed successfully'
    });
  } catch (error) {
    console.error('Debug AI Error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
});

export default router; 