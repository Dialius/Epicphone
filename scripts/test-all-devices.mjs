import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../dist/Index.html');

const devices = [
  // 1. HP / Ponsel (Small, Mid, Tall, Flagship)
  { name: 'HP_Small_Android_360x640', width: 360, height: 640, isMobile: true },
  { name: 'HP_iPhone_SE_375x667', width: 375, height: 667, isMobile: true },
  { name: 'HP_Galaxy_S8_360x740', width: 360, height: 740, isMobile: true },
  { name: 'HP_iPhone_13Mini_360x780', width: 360, height: 780, isMobile: true },
  { name: 'HP_Android_Mid_360x800', width: 360, height: 800, isMobile: true },
  { name: 'HP_iPhone_12_13_14_390x844', width: 390, height: 844, isMobile: true },
  { name: 'HP_Pixel_5_6a_393x851', width: 393, height: 851, isMobile: true },
  { name: 'HP_iPhone_15_16_393x852', width: 393, height: 852, isMobile: true },
  { name: 'HP_Redmi_Note_393x873', width: 393, height: 873, isMobile: true },
  { name: 'HP_Galaxy_S20_S24_412x915', width: 412, height: 915, isMobile: true },
  { name: 'HP_Pixel_8Pro_412x920', width: 412, height: 920, isMobile: true },
  { name: 'HP_iPhone_15ProMax_430x932', width: 430, height: 932, isMobile: true },
  { name: 'HP_iPhone_16ProMax_440x956', width: 440, height: 956, isMobile: true },
  { name: 'HP_User_Screenshot_460x1024', width: 460, height: 1024, isMobile: true },

  // 2. Tablet & Layar Lipat
  { name: 'Foldable_Cover_344x882', width: 344, height: 882, isMobile: true },
  { name: 'Tablet_iPad_Mini_768x1024', width: 768, height: 1024, isMobile: false },
  { name: 'Tablet_iPad_Air_820x1180', width: 820, height: 1180, isMobile: false },
  { name: 'Tablet_iPad_Pro_1024x1366', width: 1024, height: 1366, isMobile: false },

  // 3. Laptop
  { name: 'Laptop_HD_Budget_1280x720', width: 1280, height: 720, isMobile: false },
  { name: 'Laptop_Standar_Indonesia_1366x768', width: 1366, height: 768, isMobile: false },
  { name: 'Laptop_MacBook_Air_1440x900', width: 1440, height: 900, isMobile: false },
  { name: 'Laptop_Windows_1080p_Scale125_1536x864', width: 1536, height: 864, isMobile: false },
  { name: 'Laptop_FullHD_1920x1080', width: 1920, height: 1080, isMobile: false },

  // 4. Desktop PC
  { name: 'PC_Desktop_FullHD_1920x1080', width: 1920, height: 1080, isMobile: false },
  { name: 'PC_Desktop_2K_QHD_2560x1440', width: 2560, height: 1440, isMobile: false },
  { name: 'PC_Desktop_4K_UHD_3840x2160', width: 3840, height: 2160, isMobile: false },
  { name: 'PC_Desktop_Ultrawide_3440x1440', width: 3440, height: 1440, isMobile: false },
];

const artifactDir = path.resolve('C:/Users/ASUS/.gemini/antigravity-ide/brain/4662d590-6e35-475d-bf16-a50f6ab4f3bc/scratch');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const dev of devices) {
    const context = await browser.newContext({
      viewport: { width: dev.width, height: dev.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`file://${indexPath}`);
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      document.documentElement.classList.add('theme-dark');
      try { localStorage.setItem('epicphone:tema', '"gelap"'); } catch(e) {}
    });
    await page.waitForTimeout(100);

    // Evaluasi bounding box
    const check = await page.evaluate((isMobile) => {
      const bNav = document.querySelector('.bottom-nav');
      const topbar = document.querySelector('.topbar');
      const sidebar = document.querySelector('.sidebar');
      const shell = document.querySelector('.shell');
      const shellCol = document.querySelector('.shell-col');

      const vh = window.innerHeight;
      const vw = window.innerWidth;

      const res = {
        viewportW: vw,
        viewportH: vh,
        bNavVisible: bNav && window.getComputedStyle(bNav).display !== 'none',
        sidebarVisible: sidebar && window.getComputedStyle(sidebar).display !== 'none',
        bNavBottomFlush: false,
        topbarOk: false,
        bNavBox: null,
        topbarBox: null,
      };

      if (res.bNavVisible) {
        const rect = bNav.getBoundingClientRect();
        res.bNavBox = { y: rect.y, height: rect.height, bottom: rect.bottom };
        // bottom-nav harus flush di bagian bawah (rect.bottom persis sama dengan vh)
        res.bNavBottomFlush = Math.abs(rect.bottom - vh) <= 1;
      }

      if (topbar) {
        const tRect = topbar.getBoundingClientRect();
        res.topbarBox = { y: tRect.y, height: tRect.height };
        res.topbarOk = tRect.y === 0 && tRect.height >= 50;
      }

      return res;
    }, dev.isMobile);

    const shotFile = path.join(artifactDir, `device_${dev.name}.png`);
    // Simpan screenshot untuk beberapa sampel utama
    if (
      dev.name.includes('User_Screenshot') ||
      dev.name.includes('S20_S24') ||
      dev.name.includes('iPhone_12') ||
      dev.name.includes('iPad_Mini') ||
      dev.name.includes('Standar_Indonesia') ||
      dev.name.includes('FullHD_1920x1080')
    ) {
      await page.screenshot({ path: shotFile });
    }

    results.push({
      ...dev,
      ...check,
      pass: dev.isMobile ? (check.bNavVisible && check.bNavBottomFlush) : (!check.bNavVisible && check.sidebarVisible),
    });

    await context.close();
  }

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
