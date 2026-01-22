import type { AppProps } from "next/app";
import "@/styles/tokens.css";

export default function WatcherApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
