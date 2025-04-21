"use client";
import { useState, ChangeEvent, KeyboardEvent } from 'react';
import styles from './page.module.css'; // Aynı dizindeki dosyayı işaret eder

// API'den dönen yanıtın yapısını tanımlayan interface'ler
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

// API yanıtının tam yapısı (data veya errors içerebilir)
interface ZoraApiResponse {
  data?: ZoraGraphQLData;
  errors?: GraphQLError[];
}


export default function HomePage() {
  // State'leri TypeScript ile tanımlama
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ZORA_API_URL: string = 'https://api.zora.co/universal/graphql';

  // Ethereum adres formatı için regex
  // Başlangıçta '0x', ardından 40 adet hex karakter (0-9, a-f, A-F)
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;


  // Fonksiyonun tipini belirtme: Asenkron ve bir şey döndürmüyor (void Promise)
  const fetchZoraTokens = async (): Promise<void> => {
    // Trim ile boşlukları temizle
    const trimmedAddress = walletAddress.trim();

    // **VALIDATION ADDED:** Boşluk kontrolü ve Format kontrolü
    if (!trimmedAddress) {
      setError('Lütfen bir cüzdan adresi girin.');
      setTotalTokens(null);
      return; // Boşsa API'ye gitme
    }

    if (!ethereumAddressRegex.test(trimmedAddress)) {
      setError('Lütfen geçerli bir Ethereum cüzdan adresi girin (örn: 0x...).');
      setTotalTokens(null);
      return; // Format yanlışsa API'ye gitme
    }
    // **END VALIDATION**


    setLoading(true);
    setError(null);
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

    // Sorgu için değişkenler (TypeScript tipi ile)
    const variables: { address: string[] } = {
      address: [trimmedAddress], // API bir dizi bekliyor
    };

    try {
      const response = await fetch(ZORA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          variables: variables, // Değişkenleri gönder
        }),
      });

      // HTTP hatalarını yakala
      if (!response.ok) {
        throw new Error(`API isteği başarısız oldu: ${response.status} ${response.statusText}`);
      }

      // Yanıtı tanımladığımız interface ile parse et
      const result = await response.json() as ZoraApiResponse;

      // GraphQL tarafından dönen hataları kontrol et
      if (result.errors && result.errors.length > 0) {
        console.error('GraphQL Errors:', result.errors);
        // İlk hatanın mesajını göster
        throw new Error(`GraphQL hatası: ${result.errors[0]?.message || 'Bilinmeyen GraphQL hatası'}`);
      }

      // Veriyi güvenli bir şekilde çıkar (optional chaining ile)
      const tokens = result?.data?.zoraTokenAllocation?.totalTokensEarned?.totalTokens;

      // 'tokens' null veya bir sayı olabilir. Undefined olmamalı (API yapısı doğruysa)
      if (tokens !== undefined && tokens !== null) {
         // Gelen değer bir sayı ise state'i güncelle
        setTotalTokens(Number(tokens));
      } else {
        // Adres geçerli olabilir ama token olmayabilir veya API null döndürmüş olabilir
        setTotalTokens(0); // Token yoksa veya null ise 0 göster
      }

    } catch (err: unknown) { // Hata tipini 'unknown' olarak yakala
      console.error('Token sorgulama hatası:', err);
      // Hatanın 'message' özelliğine sahip olup olmadığını kontrol et
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Token bilgisi alınırken bilinmeyen bir hata oluştu.');
      }
      setTotalTokens(null); // Hata durumunda sonucu temizle
    } finally {
      setLoading(false); // Yükleme durumunu bitir
    }
  };

  // InputChangeEvent tipini kullanarak event'i handle et
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setWalletAddress(event.target.value);
    // Yazmaya başlayınca hataları/sonuçları temizle
    if (error) setError(null);
    if (totalTokens !== null) setTotalTokens(null);
  };

  // KeyboardEvent tipini kullanarak event'i handle et
   const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      fetchZoraTokens();
    }
  };


  // JSX kısmı JavaScript versiyonuyla aynı kalır, sadece tipler eklenmiştir.
  return (
    <div className={styles.container || 'container'}>
      <main className={styles.main || 'main'}>
        <h1 className={styles.title || 'title'}>
          Zora Airdrop Alloc
        </h1>

        <p className={styles.description || 'description'}>
          Cüzdan adresinizi girin
        </p>

        <div className={styles.inputGroup || 'input-group'}>
          <input
            type="text"
            value={walletAddress}
            onChange={handleInputChange} // Typed event handler
            onKeyPress={handleKeyPress} // Typed event handler
            placeholder="Cüzdan Adresinizi Girin (örn: 0x...)"
            className={styles.inputField || 'input-field'}
            disabled={loading}
          />
          <button
            onClick={fetchZoraTokens} // Typed function
            className={styles.button || 'button'}
            // Button disabled when loading or wallet address is empty/just spaces
            disabled={loading || !walletAddress.trim()}
          >
            {loading ? 'Sorgulanıyor...' : 'Sorgula'}
          </button>
        </div>

        {error && (
          <p className={styles.error || 'error-message'}>
            Hata: {error}
          </p>
        )}

        {/* totalTokens 0 ise bile gösterilmesi için totalTokens !== null kontrolü */}
        {/* Sadece loading değilse ve hata yoksa sonucu göster */}
        {totalTokens !== null && !loading && !error && (
           <div className={styles.result || 'result-section'}>
            <h2>Toplam Kazanılan Token:</h2> {/* Bu yazı */}
            <p className={styles.tokenAmount || 'token-amount'}> {/* Bu sayı */}
              {/* Sayıyı locale'e göre formatla */}
              {totalTokens.toLocaleString(undefined, { maximumFractionDigits: 6 })}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}