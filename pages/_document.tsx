// pages/_document.tsx
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="uk">
      <Head>
        <meta name="color-scheme" content="dark light" />
        {/* Проставляємо тему ДО гідратації */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('tt-theme') || document.cookie.match(/(?:^|; )tt-theme=([^;]+)/)?.[1];
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var dark = t ? (t === 'dark' || t === 'midnight' || t === 'matrix' || t === 'cyberpunk')
                               : prefersDark;
                  var root = document.documentElement;
                  if (dark) root.classList.add('dark'); else root.classList.remove('dark');
                  // необов'язково: експортуємо data-атрибут для твоєї themes.css
                  root.setAttribute('data-theme', t || (dark ? 'dark' : 'light'));
                } catch(e) {}
              })();
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
