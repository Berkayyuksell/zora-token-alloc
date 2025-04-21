// app/api/zora/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ZORA_API_URL = 'https://api.zora.co/universal/graphql';

export async function POST(request: NextRequest) {
  try {
    // Gelen client isteğinin body'sini al (GraphQL sorgusu ve değişkenler)
    const requestBody = await request.json();

    // Server tarafından Zora API'sine isteği yap
    // Bu fetch işlemi tarayıcıda değil, Vercel sunucularında (serverless fonksiyonda) çalışır,
    // bu yüzden CORS kısıtlamalarına takılmaz.
    const apiResponse = await fetch(ZORA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Eğer Zora API'si farklı başlıklar gerektiriyorsa buraya ekleyebilirsiniz
      },
      body: JSON.stringify(requestBody), // Client'tan gelen body'yi Zora'ya gönder
      // CORS sorununu çözmek için mode: 'no-cors' burada GEREKMEZ ve kullanılmamalıdır,
      // çünkü istek server'dan yapılıyor.
    });

    // Zora'dan gelen yanıtın body'sini oku
    const apiResponseBody = await apiResponse.json();

    // Zora'dan gelen yanıtı (data veya errors) ve status kodunu client'a geri döndür
    return NextResponse.json(apiResponseBody, {
      status: apiResponse.status,
      // Başlıkları gerektiğinde buraya ekleyebilirsiniz,
      // ancak aynı kaynaktan (API route'unuz ve client component'iniz aynı Vercel alan adında)
      // oldukları için genellikle özel CORS başlıklarına gerek yoktur.
    });

  } catch (error: any) { // Fetch sırasında veya JSON parse ederken hata olursa
    console.error('API Route (Proxy) hatası:', error);
    // Client'a bir server hatası yanıtı döndür
    return NextResponse.json({
      errors: [{ message: 'Token bilgisi alınırken proxy hatası oluştu.', details: error.message }]
    }, { status: 500 });
  }
}