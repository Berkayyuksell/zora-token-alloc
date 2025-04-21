"use client";
import { useState, ChangeEvent, KeyboardEvent } from 'react';
// Eğer page.module.css dosyanızda hala bu component'e özel stiller varsa bu import'u tutun,
// aksi halde (global.css'e taşıdıysanız) silebilirsiniz.
// import styles from './page.module.css';

// API'den dönen yanıtın yapısını tanımlayan interface'ler -- BU INTERFACE'LER ÖNEMLİ VE EKSİKMİŞ!
interface ZoraTokenEarned {
  totalTokens: number | null; // API null dönebilir
}

interface ZoraTokenAllocation {
  totalTokensEarned: ZoraTokenEarned | null;
}

interface ZoraGraphQLData {
  zoraTokenAllocation: ZoraTokenAllocation | null;
}

// GraphQL Hata yapısı (basit)
interface GraphQLError {
    message: string;
    // İhtiyaç olursa diğer alanlar eklenebilir: locations, path, extensions
}

// API yanıtının tam yapısı (data veya errors içerebilir) -- BU INTERFACE DE ÖNEMLİ VE EKSİKMİŞ!
interface ZoraApiResponse {
  data?: ZoraGraphQLData;
  errors?: GraphQLError[];
}


export default function HomePage() {
  // State'leri TypeScript ile tanımlama -- BU TANIMLAR DA ÖNEMLİ VE EKSİKMİŞ!
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // **DEĞİŞTİRİLDİ:** Doğrudan Zora API yerine kendi proxy route'unuza işaret edin
  const ZORA_API_URL: string = '/api/zora';

  // Ethereum adres formatı için regex
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;


  const fetchZoraTokens = async (): Promise<void> => {
    // Trim ile boşlukları temizle -- BU SATIRIN fetchZoraTokens İÇİNDE OLMASI GEREKİR
    const trimmedAddress = walletAddress.trim();

    // **VALIDATION ADDED:** Boşluk kontrolü ve Format kontrolü
    if (!trimmedAddress) {
      // setError bulunamıyordu
      setError('Lütfen bir cüzdan adresi girin.');
      // setTotalTokens bulunamıyordu
      setTotalTokens(null);
      return;
    }

    if (!ethereumAddressRegex.test(trimmedAddress)) {
      // setError bulunamıyordu
      setError('Lütfen geçerli bir Ethereum cüzdan adresi girin (örn: 0x...).');
      // setTotalTokens bulunamıyordu
      setTotalTokens(null);
      return;
    }
    // **END VALIDATION**


    // setLoading bulunamıyordu
    setLoading(true);
    // setError bulunamıyordu
    setError(null);
    // setTotalTokens bulunamıyordu
    setTotalTokens(null);

    // GraphQL sorgusu (Değişkenler $address ile tanımlanır)
    // FIXED: Variable definition changed from [String!] to [String!]!
    const query = `
      query GetZoraTokenAllocation($address: [String!]!) {
        zoraTokenAllocation(
          identifierWalletAddresses: $address,
          zoraClaimContractEnv: PRODUCTION
        ) {
          totalTokensEarned {
            totalTokens
          }
        }
      }
    `;

    const variables: { address: string[] } = {
      address: [trimmedAddress],
    };

    try {
      // **DEĞİŞTİRİLDİ:** fetch isteği artık kendi /api/zora adresinize gidiyor
      const response = await fetch(ZORA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        // Sorgu ve değişkenleri proxy route'una gönderiyoruz
        body: JSON.stringify({
          query: query,
          variables: variables,
        }),
      });

      // Proxy route'unuz Zora'dan gelen status'u döndürecek, onu kontrol edin
      if (!response.ok) {
         // Proxy'den gelen hata detaylarını okumaya çalışın
        const errorBody = await response.json();
        console.error('Proxy isteği non-OK status döndürdü:', response.status, errorBody);
         // Hata mesajını proxy'den veya jenerik bir mesajdan alın
        const errorMessage = errorBody?.errors?.[0]?.message || `API isteği başarısız oldu: ${response.status}`;
        // setError bulunamıyordu
        setError(errorMessage); // Doğrudan setError kullanabiliriz veya throw edip catch'te yakalarız
        setTotalTokens(null); // Sonucu temizle
        setLoading(false); // Loading durumunu kapat
        return; // Fonksiyonu burada bitir
         // Alternatif olarak, önceki gibi throw new Error(errorMessage); diyerek aşağıdaki catch bloğunda da yakalayabilirsiniz.
      }

      // Proxy route'unuz Zora'dan gelen JSON body'yi döndürecek
      // ZoraApiResponse bulunamıyordu
      const result = await response.json() as ZoraApiResponse;

      // GraphQL hatalarını (şimdi proxy'den gelen yanıtta) kontrol edin
      if (result.errors && result.errors.length > 0) {
        console.error('GraphQL Errors (proxy\'den):', result.errors);
        // API route'unuzun verdiği detaylı mesajı kullanın
        const errorMessage = `GraphQL hatası: ${result.errors[0]?.message || 'Bilinmeyen GraphQL hatası (proxy\'den)'}`;
        // setError bulunamıyordu
        setError(errorMessage);
        // setTotalTokens bulunamıyordu
        setTotalTokens(null);
        // setLoading bulunamıyordu
        setLoading(false);
        return; // Fonksiyonu burada bitir
      }

      // Veriyi güvenli bir şekilde çıkar (optional chaining ile)
      const tokens = result?.data?.zoraTokenAllocation?.totalTokensEarned?.totalTokens;

      if (tokens !== undefined && tokens !== null) {
        // setTotalTokens bulunamıyordu
        setTotalTokens(Number(tokens));
      } else {
        // setTotalTokens bulunamıyordu
        setTotalTokens(0); // Token yoksa veya null ise 0 göster
      }

    } catch (err: unknown) {
      // Hata yakalama ve state güncelleme kodları aynı kalır
      console.error('Token sorgulama hatası (client):', err);
      // setError bulunamıyordu
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Token bilgisi alınırken beklenmeyen bir hata oluştu.');
      }
      // setTotalTokens bulunamıyordu
      setTotalTokens(null);
    } finally {
      // setLoading bulunamıyordu
      setLoading(false);
    }
  };

  // handleInputChange ve handleKeyPress fonksiyonları aynı kalır
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    // setWalletAddress bulunamıyordu
    setWalletAddress(event.target.value);
    // setError bulunamıyordu
    if (error) setError(null);
    // setTotalTokens bulunamıyordu
    if (totalTokens !== null) setTotalTokens(null);
  };

   const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      fetchZoraTokens();
    }
  };


  // JSX kısmı ve global CSS sınıfları aynı kalır
  return (
    // Class isimleri doğrudan string olarak kullanılıyor
    <div className='container'>
      <main className='main'>
        <h1 className='title'>
          Zora Token Airdrop
        </h1>

        <p className='description'>
          Cüzdan adresinizi giriniz
        </p>

        <div className='input-group'>
          <input
            type="text"
            value={walletAddress} // walletAddress bulunamıyordu
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Cüzdan Adresinizi Girin (örn: 0x...)"
            className='input-field'
            disabled={loading} // loading bulunamıyordu
          />
          <button
            onClick={fetchZoraTokens}
            className='button'
            // loading bulunamıyordu
            disabled={loading || !walletAddress.trim()} // walletAddress bulunamıyordu
          >
            {loading ? 'Sorgulanıyor...' : 'Sorgula'} {/* loading bulunamıyordu */}
          </button>
        </div>

        {error && ( // error bulunamıyordu
          <p className='error-message'>
            Hata: {error} {/* error bulunamıyordu */}
          </p>
        )}

        {/* totalTokens 0 ise bile gösterilmesi için totalTokens !== null kontrolü */}
        {/* Sadece loading değilse ve hata yoksa sonucu göster */}
        {totalTokens !== null && !loading && !error && ( // totalTokens, loading, error bulunamıyordu
           <div className='result-section'>
            <h2>Toplam Kazanılan Token:</h2>
            <p className='token-amount'>
              {totalTokens.toLocaleString(undefined, { maximumFractionDigits: 6 })} {/* totalTokens bulunamıyordu */}
            </p>
          </div>
        )}
      </main>

      {/* style jsx bloğu tamamen kaldırıldı */}
    </div>
  );
}