import { Injectable, inject } from '@angular/core';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { ProductService } from './product.service';
import { Product } from '../types';

export interface Message {
  sender: 'user' | 'bot';
  text: string;
}

@Injectable()
export class GeminiService {
  private productService = inject(ProductService);
  private products: Product[] = [];
  private ai: GoogleGenAI;

  constructor() {
    // This is a safeguard. The API_KEY is expected to be set in the environment.
    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set!");
      // In a real app, you might want to throw an error or handle this more gracefully.
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    this.productService.products$.subscribe(products => {
      this.products = products;
      // In a more advanced scenario, you might want to re-initialize the chat
      // if the product list changes significantly. For now, we use the list
      // available at the time the chat starts.
    });
  }

  startChat(): Chat {
    const productInfo = this.products.length > 0 
      ? this.products.map(p => `- ${p.name} (السعر: ${p.price}, الكمية المتوفرة: ${p.amount})`).join('\n')
      : "لا توجد منتجات متوفرة حالياً.";

    const systemInstruction = `
أنت "بوت متجرنا"، مساعد ذكاء اصطناعي ودود ومرح متخصص في متجر "متجرنا". 
مهمتك الأساسية هي مساعدة الزبائن والإجابة على استفساراتهم.

**شخصيتك:**
- ودود ومتعاون.
- لك حس فكاهي ومستعد لإلقاء النكت أو لعب ألعاب بسيطة (مثل إكس-أو كنص) إذا طُلب منك ذلك.
- خبير بكل ما يتعلق بمتجرنا.

**معلومات المتجر:**
- اسم المتجر: متجرنا.
- المنتجات المتوفرة حالياً هي:
${productInfo}
- استخدم هذه القائمة بشكل حصري للإجابة على أسئلة حول توفر المنتجات وأسعارها. لا تخترع منتجات أو أسعار.
- إذا كان المنتج غير متوفر (الكمية 0)، أبلغ العميل بذلك بلطف.

**مهامك:**
1.  **الإجابة على الأسئلة:** أجب عن أسئلة العملاء حول المنتجات (الأسعار، الوصف، التوفر)، كيفية الشراء، العروض الحالية (إذا لم يكن لديك معلومات عن عروض، قل أنه لا توجد عروض حالياً واقترح عليهم متابعتنا).
2.  **المساعدة في الشراء:** أرشد المستخدمين حول كيفية إضافة المنتجات إلى السلة والمتابعة للدفع.
3.  **التفاعل والمرح:** إذا طلب منك المستخدم نكتة، أخبره بنكتة لطيفة. إذا طلب لعبة، يمكنك لعب "إكس-أو" معه باستخدام النصوص والرموز التعبيرية.
4.  **اللغة:** تحدث دائماً باللغة العربية بلهجة طبيعية وودودة.
`;

    return this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
    });
  }

  async sendMessage(chat: Chat, message: string): Promise<string> {
    try {
      const result: GenerateContentResponse = await chat.sendMessage({ message: message });
      return result.text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to get response from Gemini.');
    }
  }
}