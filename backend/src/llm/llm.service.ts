import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateChatCompletion(
    messages: Array<{ role: string; content: string }>,
    model: string = 'gpt-4o',
    temperature: number = 0.8,
    maxTokens: number = 1500,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: messages as any,
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error('Failed to generate response from AI');
    }
  }

  async generateSummary(text: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content: 'You are a summarization assistant. Create a concise 500-word summary of the following RPG session, capturing key events, decisions, and story progression.',
      },
      {
        role: 'user',
        content: text,
      },
    ];

    return this.generateChatCompletion(messages, 'gpt-4o-mini', 0.5, 800);
  }
}
