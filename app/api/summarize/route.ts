import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json() as { title?: string; content?: string };

    if (!content && !title) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Eres un periodista. Resume la siguiente noticia local de Córdoba (España) en un párrafo claro y natural de unas 80-100 palabras en español. Captura los hechos principales, quién está involucrado, qué pasó y por qué importa. Responde SOLO con el resumen, sin títulos ni presentación.

Título: ${title || ''}
Contenido: ${content || ''}`,
        },
      ],
    });

    const summary =
      message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    return NextResponse.json({ summary });
  } catch (err) {
    console.error('[summarize]', err);
    return NextResponse.json({ error: 'Failed to summarise' }, { status: 500 });
  }
}
