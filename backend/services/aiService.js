import aiConfig from '../config/ai.js';
import { logger } from '../middlewares/logging.middleware.js';
import Category from '../models/Category.js';

class AIService {
  constructor() {
    this.config = aiConfig;
    this.config.validate();
    this.baseUrl = this.config.openRouter.baseUrl;
    this.apiKey = this.config.openRouter.apiKey;
    this.model = this.config.openRouter.model;
  }

  /**
   * Make a request to OpenRouter API
   */
  async makeRequest(messages, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://naafe-marketplace.com',
          'X-Title': 'Naafe AI Assistant',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          max_tokens: options.maxTokens || this.config.openRouter.maxTokens,
          temperature: options.temperature || this.config.openRouter.temperature,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content;
    } catch (error) {
      logger.error('AI Service error:', error);
      throw error;
    }
  }

  /**
   * Extract JSON from AI response
   */
  extractJSONFromResponse(response) {
    try {
      // First, try to parse the response directly
      return JSON.parse(response);
    } catch (error) {
      // If direct parsing fails, try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', parseError);
          return null;
        }
      }
      return null;
    }
  }

  /**
   * AI Form Writing Assistant
   * Helps users write better service descriptions and titles
   */
  async assistFormWriting(formType, category, userInput, currentFields = {}) {
    if (!this.config.services.formAssistance) {
      return { suggestions: [], enhancedContent: null };
    }

    try {
      // Fetch latest categories from DB
      const allCategories = await Category.find({ isActive: true });
      const normalizedCategory = (category || '').trim().toLowerCase();
      const categoryObj = allCategories.find(
        cat => cat.name.trim().toLowerCase() === normalizedCategory
      );
      const categoryArabic = categoryObj ? categoryObj.name : category;
      // Optionally, you can use cat.description or another field for Arabic if available
      
      let prompt;
      if (formType === 'service') {
        // Provider-focused prompt for service posting (Arabic, explicit)
        prompt = `
أنت مساعد ذكي تساعد مقدمي الخدمات على كتابة إعلانات احترافية وجذابة على منصة نافِع.

- استخدم دائمًا اللغة العربية الفصحى الحديثة (بدون لهجات).
- الأسلوب يجب أن يكون واثقًا واحترافيًا، بصيغة "أقدم..." أو "أقوم..." وليس "أحتاج...".
- إذا كان مدخل المستخدم أو الوصف قصيرًا أو غير كافٍ، اطلب منه توضيح التفاصيل أو قدم له قالبًا ليكمله.
- استخرج كلمات مفتاحية مناسبة ومحسّنة للبحث.
- في نهاية الاقتراح، قدم نصيحة عملية قصيرة لتحسين فرص ظهور الخدمة أو جذب العملاء (مثال: "إضافة صور عالية الجودة تزيد من فرص التوظيف بنسبة 30%.").

الفئة: ${category} (${categoryArabic})

مدخل المستخدم الحالي:
"${userInput}"

حقول النموذج الحالية:
${JSON.stringify(currentFields, null, 2)}

التعليمات:
1. اقترح عنوانًا محسّنًا وجذابًا يبرز مهارات مقدم الخدمة أو نقاط تميّزه.
2. اقترح وصفًا احترافيًا يوضح نطاق الخدمة، مدة التنفيذ، الضمانات، ولماذا يجب اختيار هذا المقدم.
3. اقترح كلمات مفتاحية مناسبة تساعد في ظهور الخدمة في نتائج البحث.
4. إذا كان مدخل المستخدم غير كافٍ، اطلب منه إضافة تفاصيل أو قدم له قالبًا ليكمله.
5. قدم نصيحة عملية قصيرة لتحسين الإعلان.

أعد فقط كائن JSON النهائي، دون أي شرح أو نص خارجي.

الصيغة المطلوبة:
{
  "suggestions": [
    { "type": "title", "content": "عنوان محسّن هنا", "reasoning": "سبب الاقتراح" },
    { "type": "description", "content": "وصف محسّن هنا", "reasoning": "سبب الاقتراح" },
    { "type": "keywords", "content": "كلمة1, كلمة2, كلمة3", "reasoning": "سبب الاقتراح" }
  ],
  "enhancedContent": {
    "title": "أفضل عنوان مقترح",
    "description": "أفضل وصف مقترح",
    "keywords": "الأفضل, كلمات, هنا"
  },
  "helpfulText": "نصيحة مفيدة لمقدم الخدمة"
}

تذكير: أعد فقط كائن JSON النهائي، دون أي شرح أو نص خارجي.`;
      } else {
        // Seeker-focused prompt for service request
        prompt = `
أنت مساعد ذكي تساعد الباحثين عن الخدمات على كتابة طلبات واضحة ومفصلة وفعالة على منصة نافِع.

- استخدم دائمًا اللغة العربية الفصحى الحديثة (بدون لهجات).
- الأسلوب يجب أن يكون واضحًا ومحددًا، بصيغة "أحتاج..." أو "أرغب في...".
- إذا كان مدخل المستخدم أو الوصف قصيرًا أو غير كافٍ، اطلب منه توضيح التفاصيل أو قدم له قالبًا ليكمله.
- استخرج كلمات مفتاحية مناسبة ومحسّنة للبحث.
- لا تذكر الميزانية أو السعر أو التكلفة في الوصف. الميزانية لها حقل منفصل في النموذج.
- في نهاية الاقتراح، قدم نصيحة عملية قصيرة لتحسين فرص ظهور الطلب أو جذب مقدمي الخدمة (مثال: "كلما زادت التفاصيل زادت فرص الحصول على عروض مناسبة.").

الفئة: ${category} (${categoryArabic})

مدخل المستخدم الحالي:
"${userInput}"

حقول النموذج الحالية:
${JSON.stringify(currentFields, null, 2)}

التعليمات:
1. اقترح عنوانًا واضحًا يلخص الحاجة أو المشكلة.
2. اقترح وصفًا مفصلًا يوضح السياق، درجة الإلحاح، الموقع، وأي متطلبات خاصة.
3. اقترح كلمات مفتاحية مناسبة تساعد في مطابقة الطلب مع مقدمي الخدمة المناسبين.
4. إذا كان مدخل المستخدم غير كافٍ، اطلب منه إضافة تفاصيل أو قدم له قالبًا ليكمله.
5. قدم نصيحة عملية قصيرة لتحسين الطلب.

أعد فقط كائن JSON النهائي، دون أي شرح أو نص خارجي.

الصيغة المطلوبة:
{
  "suggestions": [
    { "type": "title", "content": "عنوان محسّن هنا", "reasoning": "سبب الاقتراح" },
    { "type": "description", "content": "وصف محسّن هنا", "reasoning": "سبب الاقتراح" },
    { "type": "keywords", "content": "كلمة1, كلمة2, كلمة3", "reasoning": "سبب الاقتراح" }
  ],
  "enhancedContent": {
    "title": "أفضل عنوان مقترح",
    "description": "أفضل وصف مقترح",
    "keywords": "الأفضل, كلمات, هنا"
  },
  "helpfulText": "نصيحة مفيدة للباحث عن الخدمة"
}

تذكير: أعد فقط كائن JSON النهائي، دون أي شرح أو نص خارجي.`;
      }

      const response = await this.makeRequest([
        { 
          role: 'system', 
          content: 'You are a professional form writing assistant. You must ALWAYS respond with valid JSON format only. Never include any text outside the JSON structure. Ensure all JSON keys and values are properly quoted strings.' 
        },
        { role: 'user', content: prompt }
      ]);
      
      // Try to extract and parse JSON
      const parsedResponse = this.extractJSONFromResponse(response);
      
      if (parsedResponse && parsedResponse.suggestions && parsedResponse.enhancedContent) {
        return parsedResponse;
      } else {
        // Return a fallback response with meaningful content
        const fallbackResponse = {
          suggestions: [
            {
              type: 'title',
              content: userInput,
              reasoning: 'اقتراح افتراضي بناءً على مدخل المستخدم'
            },
            {
              type: 'description',
              content: 'يرجى كتابة وصف مفصل للخدمة أو الطلب هنا.',
              reasoning: 'وصف افتراضي لعدم توفر اقتراح من الذكاء الاصطناعي'
            },
            {
              type: 'keywords',
              content: '',
              reasoning: 'يرجى إضافة كلمات مفتاحية مناسبة'
            }
          ],
          enhancedContent: {
            title: userInput,
            description: 'يرجى كتابة وصف مفصل للخدمة أو الطلب هنا.',
            keywords: ''
          },
          helpfulText: 'لم يتمكن الذكاء الاصطناعي من اقتراح محتوى محسّن. تم استخدام مدخل المستخدم كعنوان.'
        };
        return fallbackResponse;
      }
    } catch (error) {
      logger.error('AI form assistance error:', error);
      
      // Return a comprehensive fallback response
      const errorFallbackResponse = {
        suggestions: [
          {
            type: 'title',
            content: 'إصلاح تسرب المياه في الحمام - سباك محترف',
            reasoning: 'عنوان واضح ومحدد يوضح المشكلة والحل'
          },
          {
            type: 'description',
            content: 'أحتاج سباك محترف وموثوق لإصلاح تسرب المياه في الحمام. المشكلة في صنبور المياه وتحتاج إصلاح فوري. أبحث عن شخص ذو خبرة في إصلاح السباكة المنزلية مع ضمان الجودة والالتزام بالمواعيد.',
            reasoning: 'وصف مفصل يوضح المشكلة والمتطلبات والضمانات'
          },
          {
            type: 'keywords',
            content: 'سباكة, إصلاح, تسرب, مياه, حمام, صنبور, سباك محترف',
            reasoning: 'كلمات مفتاحية تغطي جميع جوانب الخدمة المطلوبة'
          }
        ],
        enhancedContent: {
          title: 'إصلاح تسرب المياه في الحمام - سباك محترف',
          description: 'أحتاج سباك محترف وموثوق لإصلاح تسرب المياه في الحمام. المشكلة في صنبور المياه وتحتاج إصلاح فوري. أبحث عن شخص ذو خبرة في إصلاح السباكة المنزلية مع ضمان الجودة والالتزام بالمواعيد.',
          keywords: 'سباكة, إصلاح, تسرب, مياه, حمام, صنبور, سباك محترف'
        },
        helpfulText: 'تم تحسين المحتوى ليكون أكثر وضوحاً وجاذبية للعملاء المحتملين. تأكد من ذكر التفاصيل المهمة مثل نوع المشكلة والموقع والضمانات المطلوبة.'
      };
      return errorFallbackResponse;
    }
  }

  /**
   * AI Pricing Guidance
   * Provides intelligent pricing recommendations
   */
  async providePricingGuidance(category, serviceType, location, userBudget = null, marketData = {}, skills = [], rating = null) {
    if (!this.config.services.pricingGuidance) {
      return { recommendation: null, analysis: null };
    }

    try {
      // Fetch latest categories from DB
      const allCategories = await Category.find({ isActive: true });
      const normalizedCategory = (category || '').trim().toLowerCase();
      const categoryObj = allCategories.find(
        cat => cat.name.trim().toLowerCase() === normalizedCategory
      );
      const categoryArabic = categoryObj ? categoryObj.name : category;
      // Optionally, you can use cat.description or another field for Arabic if available
      const priceRange = this.config.pricingGuidance.priceRanges[category];
      const skillsText = Array.isArray(skills) && skills.length > 0 ? `\nمهارات مقدم الخدمة:\n- ${skills.join('\n- ')}` : '';
      const ratingText = rating !== null && rating !== undefined ? `\nتقييم مقدم الخدمة: ${rating} من 5` : '';
      const prompt = `
        أنت خبير في تسعير الخدمات في مصر. ساعد المستخدم في تحديد سعر عادل ومناسب بناءً على مهارات مقدم الخدمة والسوق.

        نوع الخدمة: ${serviceType === 'service' ? 'نشر خدمة (مقدم خدمة)' : 'طلب خدمة (باحث عن خدمة)'}
        الفئة: ${category} (${categoryArabic})
        الموقع: ${location}
        ${skillsText}
        ${ratingText}
        
        نطاق الأسعار المرجعي للفئة:
        - الحد الأدنى: ${priceRange?.min || 0} جنيه
        - الحد الأقصى: ${priceRange?.max || 1000} جنيه
        - المتوسط: ${priceRange?.avg || 500} جنيه
        
        الميزانية المقترحة من المستخدم: ${userBudget ? `${userBudget.min} - ${userBudget.max} جنيه` : 'غير محدد'}
        
        بيانات السوق:
        ${JSON.stringify(marketData, null, 2)}
        
        المطلوب:
        1. قبل اقتراح أي سعر، تحقق أولاً من أن مهارات مقدم الخدمة مرتبطة فعلاً بالفئة/الخدمة المختارة.
        2. إذا لم تكن المهارات مرتبطة أو غير كافية، وضّح ذلك بوضوح في التحليل، وبيّن أن مقدم الخدمة قد يحتاج لإضافة مهارات أكثر ارتباطاً أو أن السعر المقترح سيكون أقل من المتوسط.
        3. إذا كانت المهارات غير مرتبطة، لا تبرر سعراً مرتفعاً، بل حذر المستخدم من ذلك.
        4. إذا كانت الميزانية المدخلة من المستخدم أقل بكثير أو أعلى بكثير من نطاق السوق، حذّر المستخدم وأخبره أن الميزانية غير واقعية واقترح نطاقاً مناسباً.
        5. إذا لم يحدد المستخدم ميزانية، اقترح نطاق سعر مناسب بناءً على السوق ومهارات مقدم الخدمة.
        6. اقترح دائماً نطاق سعر (حد أدنى وحد أقصى) بالجنيه المصري فقط.
        7. اشرح الأسباب.
        8. اعطِ نصائح للتسعير.

        ⚠️ مهم جداً: يجب أن تكون جميع الأسعار بالجنيه المصري فقط (جنيه)، ولا تستخدم أي عملة أخرى مثل الريال أو الدولار.
        
        تعليمات إضافية حول التقييم:
        - إذا كان تقييم مقدم الخدمة مرتفعاً (4.5 أو أكثر)، يمكنك اقتراح أسعار أعلى من المتوسط وتوضيح أن التقييم العالي يبرر ذلك.
        - إذا كان التقييم متوسطاً (بين 3 و4.5)، اقترح أسعاراً قريبة من متوسط السوق مع ذكر أن التقييم جيد لكن ليس الأعلى.
        - إذا كان التقييم منخفضاً (أقل من 3)، اقترح أسعاراً تنافسية لجذب العملاء ووضح أن التقييم المنخفض يتطلب تقديم سعر مغرٍ.
        - اشرح دائماً كيف يؤثر التقييم على التسعير في قسم الأسباب.

        أمثلة:
        - تقييم 4.8: "يمكنك رفع سعرك لأن تقييمك مرتفع ويعكس ثقة العملاء."
        - تقييم 2.5: "يفضل تقديم سعر أقل لجذب العملاء وتحسين تقييمك مستقبلاً."

        أعد النتيجة بتنسيق JSON فقط، دون أي نص خارجي:
        {
          "recommendation": {
            "suggestedMin": 500,
            "suggestedMax": 800,
            "confidence": 0.9,
            "reasoning": "لأن مقدم الخدمة لديه خبرة في ... ويمتلك مهارات ... وتقييمه مرتفع."
          },
          "analysis": {
            "isReasonable": true,
            "marketPosition": "average",
            "factors": ["مهارات مقدم الخدمة", "الأسعار في السوق", "تقييم مقدم الخدمة"],
            "tips": ["حدد نطاق سعرك بوضوح", "اذكر خبراتك وتقييمك لرفع السعر"]
          },
          "warning": "الميزانية التي أدخلتها غير واقعية مقارنة بالسوق. يرجى مراجعة الأسعار المقترحة."
        }
        
        إذا لم يكن هناك تحذير، اجعل حقل warning فارغاً أو لا تضعه.
      `;

      const response = await this.makeRequest([
        { 
          role: 'system', 
          content: 'أنت خبير تسعير محترف. أعد دائماً JSON صحيح مع تحليل مفصل.' 
        },
        { role: 'user', content: prompt }
      ]);

      let parsed;
      try {
        parsed = JSON.parse(response);
      } catch {
        // Try to extract JSON if malformed
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }

      // Fallback if no valid recommendation
      if (!parsed || !parsed.recommendation || typeof parsed.recommendation.suggestedMin !== 'number' || typeof parsed.recommendation.suggestedMax !== 'number') {
        const fallbackMin = priceRange?.min || 100;
        const fallbackMax = priceRange?.max || 2000;
        return {
          recommendation: {
            suggestedMin: fallbackMin,
            suggestedMax: fallbackMax,
            confidence: 0.5,
            reasoning: 'تم اقتراح هذا النطاق بناءً على بيانات السوق لأن الذكاء الاصطناعي لم يقترح سعراً.'
          },
          analysis: {
            isReasonable: false,
            marketPosition: 'average',
            factors: ['الذكاء الاصطناعي لم يقترح سعراً', 'تم استخدام بيانات السوق'],
            tips: ['راجع ميزانيتك', 'استخدم النطاق المقترح']
          },
          warning: 'لم يتم اقتراح سعر من الذكاء الاصطناعي. تم عرض نطاق تقريبي بناءً على السوق.'
        };
      }

      return parsed;
    } catch (error) {
      logger.error('AI pricing guidance error:', error);
      return { recommendation: null, analysis: null };
    }
  }

  /**
   * Smart Category Suggestion
   * Suggests the best category based on user input
   */
  async suggestCategory(userDescription) {
    if (!this.config.services.formAssistance) {
      return { category: null, confidence: 0 };
    }

    try {
      const categories = Object.entries(this.config.formAssistance.categories)
        .map(([en, ar]) => `${en} (${ar})`)
        .join(', ');

      const prompt = `
        بناءً على الوصف التالي، اقترح أفضل فئة خدمة:

        وصف المستخدم: "${userDescription}"
        
        الفئات المتاحة: ${categories}
        
        أعد النتيجة بتنسيق JSON:
        {
          "category": "اسم الفئة بالإنجليزية",
          "confidence": number (0-1),
          "reasoning": "سبب الاقتراح"
        }
      `;

      const response = await this.makeRequest([
        { 
          role: 'system', 
          content: 'أنت خبير في تصنيف الخدمات. أعد دائماً JSON صحيح.' 
        },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('AI category suggestion error:', error);
      return { category: null, confidence: 0 };
    }
  }

  /**
   * Form Validation Assistant
   * Provides real-time validation suggestions
   */
  async validateFormInput(fieldName, fieldValue, formType, category) {
    if (!this.config.services.formAssistance) {
      return { isValid: true, suggestions: [] };
    }

    try {
      const prompt = `
        تحقق من صحة وحسن صياغة هذا الحقل في النموذج:

        اسم الحقل: ${fieldName}
        القيمة: "${fieldValue}"
        نوع النموذج: ${formType}
        الفئة: ${category}
        
        افحص:
        1. هل القيمة مناسبة للحقل؟
        2. هل الصياغة واضحة ومهنية؟
        3. هل هناك تحسينات مقترحة؟
        
        أعد النتيجة بتنسيق JSON:
        {
          "isValid": boolean,
          "suggestions": ["اقتراح 1", "اقتراح 2"],
          "improvedValue": "القيمة المحسنة (اختياري)"
        }
      `;

      const response = await this.makeRequest([
        { 
          role: 'system', 
          content: 'أنت خبير في التحقق من صحة النماذج. أعد دائماً JSON صحيح.' 
        },
        { role: 'user', content: prompt }
      ]);

      return JSON.parse(response);
    } catch (error) {
      logger.error('AI form validation error:', error);
      return { isValid: true, suggestions: [] };
    }
  }

  /**
   * Get market data for pricing analysis
   */
  async getMarketData(category, location) {
    // This would typically fetch from your database
    // For now, return mock data based on configuration
    const priceRange = this.config.pricingGuidance.priceRanges[category];
    
    return {
      categoryAverage: priceRange?.avg || 500,
      priceRange: {
        min: priceRange?.min || 100,
        max: priceRange?.max || 2000
      },
      locationFactor: location ? 1.1 : 1.0, // Adjust based on location
      demandLevel: 'medium',
      competitionLevel: 'high'
    };
  }
}

export default new AIService(); 