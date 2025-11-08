import type { Metadata } from "next";
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner, Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';
import "./globals.css";
import '@dayflow/core/dist/styles.css';

export const metadata: Metadata = {
  title: "DayFlow - Calendar toolkit for product teams",
  description: "Ship a polished calendar without rebuilding the basics",
};

const banner = <Banner storageKey="nextra-banner">Welcome to DayFlow 🎉</Banner>;
const navbar = (
  <Navbar
    logo={<b>DayFlow</b>}
    projectLink="https://github.com/dayflow-js/dayflow"
    chatLink="https://discord.gg/jc37N4xw"
  />
);
const footer = <Footer>MIT {new Date().getFullYear()} © DayFlow.</Footer>;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/dayflow-js/dayflow/blob/main/website"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
