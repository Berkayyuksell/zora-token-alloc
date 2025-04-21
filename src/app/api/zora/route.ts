// app/api/zora/route.ts
import { NextRequest, NextResponse } from 'next/server';

const ZORA_API_URL = 'https://api.zora.co/universal/graphql';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();

    const apiResponse = await fetch(ZORA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Zora'dan gelen yanıt non-OK (örn. 400, 500) ise, o hatayı client'a döndürelim
     if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        console.error('Zora API non-OK status döndürdü:', apiResponse.status, errorBody);
        // Zora API'nin döndürdüğü hata detaylarını client'a ilet
        return NextResponse.json(errorBody, { status: apiResponse.status });
     }


    const apiResponseBody = await apiResponse.json();

    // Başarılı yanıtı client'a döndür
    return NextResponse.json(apiResponseBody, {
      status: apiResponse.status, // Genellikle 200
    });

  } catch (error: unknown) { // 'any' yerine 'unknown' kullanıldı
    console.error('API Route (Proxy) yakalanan hata:', error); // Yakalanan hatayı logla

    // Hata bir Error instance'ı mı kontrol et ve mesajını al
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';

    // Client'a jenerik bir 500 hatası döndür
    return NextResponse.json({
      errors: [{ message: `Proxy isteği sırasında hata: ${errorMessage}` }]
    }, { status: 500 });
  }
}