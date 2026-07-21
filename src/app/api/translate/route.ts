import { NextRequest, NextResponse } from 'next/server';

const POST = async (request: NextRequest) => {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ translation: '' });
    }

    const trimmed = text.trim();

    // Use MyMemory free translation API (no key required, works on any OS)
    const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=en|hi&de=pcmemorialhospital@gmail.com`;

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('MyMemory API error:', response.status);
      return NextResponse.json({ translation: '' });
    }

    const data = await response.json();
    const translation = data?.responseData?.translatedText?.trim() || '';

    // MyMemory sometimes returns the same text if it can't translate — strip that
    if (translation.toLowerCase() === trimmed.toLowerCase()) {
      return NextResponse.json({ translation: '' });
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ translation: '' }, { status: 500 });
  }
};

export { POST };