import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { BrandLogo } from '@/components/BrandLogo';

const banner = <Banner storageKey="nextra-banner">Welcome to DayFlow 🎉</Banner>;
const navbar = (
  <Navbar
    logo={<BrandLogo />}
    projectLink="https://github.com/dayflow-js/dayflow"
    chatLink="https://discord.gg/jc37N4xw"
  >
    <LanguageSwitcher />
  </Navbar>
);
const footer = <Footer>MIT {new Date().getFullYear()} © DayFlow.</Footer>;

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout
      banner={banner}
      navbar={navbar}
      pageMap={await getPageMap()}
      docsRepositoryBase="https://github.com/dayflow-js/dayflow/blob/main/website"
      footer={footer}
    >
      {children}
    </Layout>
  );
}
