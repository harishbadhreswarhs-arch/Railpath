import '../glossy-dark.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../contexts/AuthContext';

import { GeofencingProvider } from '../contexts/GeofencingContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <GeofencingProvider>
        <Component {...pageProps} />
      </GeofencingProvider>
    </AuthProvider>
  );
}
