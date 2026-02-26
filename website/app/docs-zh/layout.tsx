import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';

import { BrandLogo } from '@/components/BrandLogo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';

const banner = <Banner storageKey='nextra-banner'>欢迎使用 DayFlow</Banner>;
const navbar = (
  <Navbar
    logo={<BrandLogo />}
    projectLink='https://github.com/dayflow-js/dayflow'
    chatLink='https://discord.gg/9vdFZKJqBb'
  >
    <LanguageSwitcher />
    <ThemeToggle />
  </Navbar>
);
const footer = <Footer>MIT {new Date().getFullYear()} © DayFlow.</Footer>;

export default async function DocsZhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout
      banner={banner}
      navbar={navbar}
      pageMap={await getPageMap('/docs-zh')}
      docsRepositoryBase='https://github.com/dayflow-js/dayflow/blob/main/website'
      footer={footer}
      sidebar={{
        toggleButton: false,
      }}
      nextThemes={{
        defaultTheme: 'system',
        storageKey: 'theme',
      }}
    >
      {children}
    </Layout>
  );
}
