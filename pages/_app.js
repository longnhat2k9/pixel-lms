import Head from "next/head";
import "../styles/globals.css";
import "katex/dist/katex.min.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Pixel LMS</title>
        <meta name="description" content="Pixel LMS — hệ thống quản lý học tập" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
