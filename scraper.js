const puppeteer = require('puppeteer');
const fs = require('fs/promises');

async function scrapeExercises({ databaseName, sectionName, onProgress }) {
  const log = (msg) => {
    console.log(msg);
    if (onProgress) onProgress(msg);
  };

  log(`Starting scraper for DB: '${databaseName}', Section: '${sectionName}'`);
  // Using headful mode so you can see the magic happen!
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null }); 
  const page = await browser.newPage();
  
  await page.goto('https://sql-playground.com/', { waitUntil: 'networkidle2' });

  // 1. Click Database
  log(`Selecting database: ${databaseName}...`);
  await page.waitForSelector('.navbar-nav .nav-link', { visible: true });
  const dbLinks = await page.$$('.navbar-nav .nav-link');
  let dbFound = false;
  for (const link of dbLinks) {
    const text = await page.evaluate(el => el.textContent.trim(), link);
    if (text === databaseName) {
      await link.click();
      dbFound = true;
      break;
    }
  }

  if (!dbFound) {
    log(`ERROR: Database '${databaseName}' not found in top menu!`);
    await browser.close();
    return;
  }

  // Brief wait for UI content to update
  await new Promise(r => setTimeout(r, 1000));

  // 2. Click Section in Sidebar
  log(`Matching section: ${sectionName}...`);
  await page.waitForSelector('.sidebar-heading', { visible: true });
  const headings = await page.$$('.sidebar-heading');
  let sectionClicked = false;
  for (const heading of headings) {
    const text = await page.evaluate(el => el.textContent.trim(), heading);
    if (text === sectionName) {
      await heading.click();
      sectionClicked = true;
      break;
    }
  }

  if (!sectionClicked) {
    log(`ERROR: Section '${sectionName}' not found in sidebar!`);
    await browser.close();
    return;
  }

  // Short delay for animation to show the exercises
  await new Promise(r => setTimeout(r, 800));

  // 3. Click "Ejercicio 1" under that section
  log(`Opening 'Ejercicio 1'...`);
  await page.waitForSelector('.nav-link', { visible: true });
  const exerciseLinks = await page.$$('.nav-link');
  let exercise1Clicked = false;
  
  for (const el of exerciseLinks) {
    // Only looking at links that are actually visible (since sections expand/collapse)
    const isVisible = await el.evaluate(n => {
      const rect = n.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    
    if (!isVisible) continue;
    
    // The text might be inside a span within the nav-link like <a class="nav-link"><span>Ejercicio 1</span></a>
    const text = await page.evaluate(n => n.textContent.trim(), el);
    if (text === 'Ejercicio 1') {
      await el.click();
      exercise1Clicked = true;
      break;
    }
  }

  if (!exercise1Clicked) {
    log("ERROR: Could not find or click 'Ejercicio 1'. Are you sure the section has exercises?");
    await browser.close();
    return;
  }

  // Initialize markdown content
  let markdownContent = `# Ejercicios de ${databaseName} - ${sectionName}\n\n`;
  const descriptionSelector = '#app > div > main > div > div.editor-layout > div.card > div.card-body > div:nth-child(1) > p.card-text';

  log(`Starting extraction loop...`);
  while (true) {
    // Wait for the exercise description container to be ready
    await page.waitForSelector(descriptionSelector, { visible: true });
    
    // Give a little time for the React/Vue state to update the text content fully
    await new Promise(r => setTimeout(r, 800)); 
    
    // Extract description text
    const description = await page.$eval(descriptionSelector, el => el.textContent.trim());
    
    // Check breadcrumbs to ensure we haven't crossed into a new section
    // Breadcrumb structure: Home/Database Name > Section Name > Exercise Name
    await page.waitForSelector('.breadcrumb .breadcrumb-item');
    const breadcrumbItems = await page.$$eval('.breadcrumb .breadcrumb-item', items => items.map(item => item.textContent.trim()));
    
    // Example: ['Jardinería', 'Consultas resumen', 'Ejercicio 1']
    if (breadcrumbItems.length >= 2) {
      const currentSectionInBreadcrumb = breadcrumbItems[1];
      if (currentSectionInBreadcrumb !== sectionName) {
         log(`Detected section change in breadcrumb (${currentSectionInBreadcrumb}). Ending extraction for ${sectionName}.`);
         break;
      }
    }
    
    const exerciseName = breadcrumbItems[2] || 'Ejercicio Desconocido';
    log(`► Extracted: ${exerciseName}`);
    
    // Append to our markdown string
    markdownContent += `## ${exerciseName}\n\n${description}\n\n---\n\n`;

    // Click the "Siguiente" button to go to the next exercise
    const buttons = await page.$$('button.btn-outline-secondary');
    let nextButtonClicked = false;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text === 'Siguiente') {
        await btn.click();
        nextButtonClicked = true;
        break;
      }
    }

    if (!nextButtonClicked) {
      log("No further 'Siguiente' button found. Attempting to conclude.");
      break;
    }
  }

  // Save string to markdown file
  const filename = `${databaseName.toLowerCase()}_${sectionName.toLowerCase().replace(/\\s+/g, '_')}_ejercicios.md`;
  await fs.writeFile(filename, markdownContent, 'utf8');
  log(`\n🎉 Extracted all exercises and saved to ${filename}!`);

  // Allow the user to see the completed state for a second before closing
  await new Promise(r => setTimeout(r, 1500));
  await browser.close();
  return filename;
}

module.exports = { scrapeExercises };
