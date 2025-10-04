export type NewsItem = {
  id: string;
  title: string;
  link: string;
  pubDate: string;   // ISO або рядок дати з RSS
  isoDate?: string;
  source: string;    // назва фіду (Investing.com ...)
  categories?: string[];
};
